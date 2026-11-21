import "server-only";
import { eq } from "drizzle-orm";
import {
  PermitRiskScoreResponse,
  type PermitRiskScoreRequest,
  type PermitRiskScoreResponse as PermitRiskScoreResponseType,
} from "@permitpike/contract";
import { contractorStats, getDb } from "@permitpike/db";
import type { Application, Extraction } from "@permitpike/contract";
import { buildPermitRiskScoreRequest } from "@/lib/closure-risk";
import { saveClosureRisk } from "./repo";

const SCORE_TIMEOUT_MS = 2_000;
const CITYWIDE_KEY = "";

function normalizeApplicantName(value: string): string {
  return value.trim().toLowerCase();
}

async function applicantPriorClosureRate(applicantName: string): Promise<number> {
  const db = getDb();
  const key = normalizeApplicantName(applicantName);
  const [contractor] = key
    ? await db
        .select({ rate: contractorStats.priorClosureRate })
        .from(contractorStats)
        .where(eq(contractorStats.normalizedApplicant, key))
        .limit(1)
    : [];
  if (contractor) return contractor.rate;

  const [citywide] = await db
    .select({ rate: contractorStats.priorClosureRate })
    .from(contractorStats)
    .where(eq(contractorStats.normalizedApplicant, CITYWIDE_KEY))
    .limit(1);
  if (!citywide) throw new Error("Contractor closure statistics have not been built.");
  return citywide.rate;
}

export async function scoreAndSaveClosureRisk(
  application: Pick<
    Application,
    "id" | "version" | "jobType" | "address" | "parcel" | "applicant"
  >,
  extraction: Extraction | null,
): Promise<void> {
  let result: PermitRiskScoreResponseType | null = null;
  const riskApiUrl = process.env.RISK_API_URL?.trim();

  try {
    if (!riskApiUrl) throw new Error("RISK_API_URL is not configured.");
    const applicantPriorRate = await applicantPriorClosureRate(application.applicant.name);
    const request: PermitRiskScoreRequest = buildPermitRiskScoreRequest(
      application,
      extraction,
      applicantPriorRate,
    );
    const response = await fetch(new URL("/score", riskApiUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(SCORE_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Risk API responded ${response.status}.`);
    result = PermitRiskScoreResponse.parse(await response.json());
  } catch (error) {
    console.error(`[closure-risk] scoring skipped for ${application.id}:`, error);
  }

  try {
    await saveClosureRisk(application.id, application.version, result);
  } catch (error) {
    console.error(`[closure-risk] could not save result for ${application.id}:`, error);
  }
}
