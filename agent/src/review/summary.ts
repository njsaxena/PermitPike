/**
 * Asks the permitReviewer model for the official-facing summary. Only the summary
 * text is taken from the model; the decision and every check stay as the rules made them.
 */
import type { Agent } from "@mastra/core/agent";
import type { Recommendation } from "@permitpike/contract";

export const SUMMARY_TIMEOUT_MS = 15_000;
const MAX_SUMMARY_CHARS = 1200;

export interface SummaryResult {
  summary: string;
  /** Model id when the model wrote it, null when the fallback was used. */
  model: string | null;
}

function prompt(rec: Recommendation): string {
  const facts = {
    decision: rec.decision,
    conditions: rec.conditions,
    checks: rec.checks.map((c) => ({ title: c.title, status: c.status, citation: c.citation, message: c.message })),
    loadCalc: {
      method: rec.loadCalc.method,
      totalAmps: Math.round(rec.loadCalc.totalAmps),
      serviceAmps: rec.loadCalc.serviceAmps,
      percentOfRating: Math.round(rec.loadCalc.percentOfRating),
      result: rec.loadCalc.result,
    },
    utilityFlag: rec.utilityFlag,
  };
  return [
    "Write a 2 to 4 sentence plain-language summary of this permit review for the official.",
    "Restate the rule-based decision as a recommendation; do not change it or any check status.",
    "Mention failed checks and conditions by their citation. Plain text only, no lists, no tool calls.",
    "",
    JSON.stringify(facts),
  ].join("\n");
}

export async function summarize(agent: Agent, rec: Recommendation, modelId: string): Promise<SummaryResult> {
  const fallback = { summary: rec.summary, model: null };
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) return fallback;

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`summary timed out after ${SUMMARY_TIMEOUT_MS} ms`));
    }, SUMMARY_TIMEOUT_MS);
  });
  try {
    const out = await Promise.race([
      agent.generate(prompt(rec), { abortSignal: controller.signal, maxSteps: 1 }),
      timeout,
    ]);
    const text = out.text.trim();
    if (!text) return fallback;
    return { summary: text.slice(0, MAX_SUMMARY_CHARS), model: modelId };
  } catch (err) {
    console.warn(`[review] summary fallback: ${err instanceof Error ? err.message : String(err)}`);
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
