import "server-only";
import {
  AGENT_SECRET_HEADER,
  AgentReviewResponse,
  type AgentReviewRequest,
  type JobType,
  type Recommendation,
} from "@permitpike/contract";
import { hpVersion1, hpVersion2, MOCK_APPLICATIONS } from "@/mocks/applications";
import { serviceUrl } from "@/lib/service-url";
import { getVersionForReview, markInReview, saveRecommendation } from "./repo";
import { scoreAndSaveClosureRisk } from "./closure-risk";

/*
 * Runs after the response is sent (next/server `after`), so filing returns fast.
 *   submitted -> ai_review -> awaiting_official ("recommended")
 * Use AGENT_URL when set (the standalone agent), else the Vercel agent service binding. Without an
 * agent URL, write a labeled placeholder recommendation after 2 seconds.
 */

const STUB_DELAY_MS = 2000;
const AGENT_TIMEOUT_MS = 55_000;

export async function runReview(applicationId: string, version: number): Promise<void> {
  try {
    if (!(await markInReview(applicationId, version))) return; // resubmitted or already handled
    const agentUrl = process.env.AGENT_URL?.trim() || process.env.INTERNAL_AGENT_URL;
    const result = agentUrl
      ? await callAgent(agentUrl, applicationId, version)
      : await stubReview(applicationId, version);
    await saveRecommendation(applicationId, version, result);
    try {
      const row = await getVersionForReview(applicationId, version);
      if (row) await scoreAndSaveClosureRisk(row.app, result.extraction);
    } catch (err) {
      console.error(`[closure-risk] scoring skipped for ${applicationId} v${version}:`, err);
    }
  } catch (err) {
    // The official still gets the application, just without a recommendation.
    console.error(`[review] ${applicationId} v${version} failed:`, err);
    await saveRecommendation(applicationId, version, { extraction: null, recommendation: null }).catch((e) =>
      console.error(`[review] could not release ${applicationId}:`, e),
    );
  }
}

async function callAgent(agentUrl: string, applicationId: string, version: number) {
  const row = await getVersionForReview(applicationId, version);
  if (!row) throw new Error("application version not found");
  const body: AgentReviewRequest = {
    applicationId,
    version,
    jobType: row.app.jobType,
    address: row.app.address,
    files: row.v.files,
    extraction: row.v.extraction,
  };
  const res = await fetch(serviceUrl(agentUrl, "review"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [AGENT_SECRET_HEADER]: process.env.AGENT_SHARED_SECRET ?? "",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`agent responded ${res.status}`);
  return AgentReviewResponse.parse(await res.json());
}

async function stubReview(applicationId: string, version: number) {
  await new Promise((r) => setTimeout(r, STUB_DELAY_MS));
  const row = await getVersionForReview(applicationId, version);
  if (!row) throw new Error("application version not found");
  return { extraction: null, recommendation: placeholderRecommendation(row.app.jobType, version) };
}

/** The demo recommendation for this job type, relabeled so nobody mistakes it for a real review. */
function placeholderRecommendation(jobType: JobType, version: number): Recommendation {
  const sample =
    jobType === "heat_pump_panel"
      ? (version === 1 ? hpVersion1 : hpVersion2).recommendation
      : MOCK_APPLICATIONS.find((d) => d.application.jobType === jobType)?.versions[0]?.recommendation;
  if (!sample) throw new Error(`no sample recommendation for ${jobType}`);
  return {
    ...sample,
    summary: `Placeholder: the review agent is not connected, so these are sample checks, not this application's. ${sample.summary}`,
    version,
    model: "placeholder",
    createdAt: new Date().toISOString(),
  };
}
