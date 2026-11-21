import type { ListEvalsResponse } from "@permitpike/contract";
import { handleError, ok } from "@/lib/http";
import { listEvalRuns } from "@/lib/server/repo";

export const dynamic = "force-dynamic";

// GET /api/evals
export async function GET() {
  try {
    return ok<ListEvalsResponse>({ runs: await listEvalRuns() });
  } catch (err) {
    return handleError(err);
  }
}
