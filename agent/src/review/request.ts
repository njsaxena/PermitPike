import type { AgentReviewRequest, Extraction } from "@permitpike/contract";
import { getPack } from "@permitpike/packs";

/** The request's extraction, if it is for this job type and its fields satisfy the pack schema. */
export function usableExtraction(request: AgentReviewRequest): Extraction | null {
  const e = request.extraction;
  if (!e || e.fields.jobType !== request.jobType) return null;
  return getPack(request.jobType).extraction.schema.safeParse(e.fields).success ? e : null;
}
