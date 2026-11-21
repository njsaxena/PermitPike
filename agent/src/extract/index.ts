/**
 * Document extraction: uploaded files -> Extraction for one job type.
 *
 * STUB. Janice owns the real implementation (Gemini vision with the pack's
 * extraction schema and hints). Until then the review workflow only runs when the
 * request already carries a valid extraction.
 */
import type { Extraction, FileRef, JobType } from "@permitpike/contract";

export class ExtractionNotConnectedError extends Error {
  override name = "ExtractionNotConnectedError";
  constructor() {
    super("extraction not connected");
  }
}

export async function extract(_files: FileRef[], _jobType: JobType): Promise<Extraction> {
  throw new ExtractionNotConnectedError();
}
