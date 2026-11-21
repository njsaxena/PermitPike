import { ReviewApplicationRequest } from "@permitpike/contract";
import type { ReviewApplicationResponse } from "@permitpike/contract";
import { mocksEnabled } from "@/lib/env";
import { fail, notImplemented, ok, parseBody } from "@/lib/http";
import * as mocks from "@/mocks/store";

// POST /api/applications/:id/review  (human official only; the AI never calls this)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await parseBody(req, ReviewApplicationRequest);
  if ("error" in body) return body.error;

  if (!mocksEnabled()) return notImplemented(); // TODO: insert reviewer_actions row, update status
  const result = mocks.reviewApplication(id, body.data);
  if (!result.ok) return fail(result.code, result.message);
  return ok<ReviewApplicationResponse>(result.value);
}
