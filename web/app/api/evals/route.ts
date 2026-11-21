import type { ListEvalsResponse } from "@permitpike/contract";
import { mocksEnabled } from "@/lib/env";
import { notImplemented, ok } from "@/lib/http";
import { MOCK_EVAL_RUNS } from "@/mocks/evals";

// GET /api/evals
export async function GET() {
  if (!mocksEnabled()) return notImplemented(); // TODO: read eval_runs from db
  return ok<ListEvalsResponse>({ runs: MOCK_EVAL_RUNS });
}
