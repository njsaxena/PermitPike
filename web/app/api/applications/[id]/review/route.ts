import { ReviewApplicationRequest, type ReviewApplicationResponse } from "@permitpike/contract";
import { fail, handleError, ok, parseBody } from "@/lib/http";
import { reviewApplication } from "@/lib/server/repo";
import { getReviewer } from "@/lib/server/session";

// POST /api/applications/:id/review  human officials only; the AI never calls this
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const reviewer = await getReviewer();
  if (!reviewer) return fail("unauthorized", "Sign in as a reviewer to act on permits.");
  const { id } = await params;
  const body = await parseBody(req, ReviewApplicationRequest);
  if ("error" in body) return body.error;
  try {
    const result = await reviewApplication(id, body.data.expectedVersion, body.data.action, reviewer);
    return ok<ReviewApplicationResponse>(result);
  } catch (err) {
    return handleError(err);
  }
}
