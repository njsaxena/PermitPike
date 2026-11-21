import { CreateReviewerSessionRequest, type CreateReviewerSessionResponse } from "@permitpike/contract";
import { ok, parseBody } from "@/lib/http";
import { clearReviewerCookie, setReviewerCookie } from "@/lib/server/session";

// POST /api/reviewer/session  remember the reviewer's name in a cookie
export async function POST(req: Request) {
  const body = await parseBody(req, CreateReviewerSessionRequest);
  if ("error" in body) return body.error;
  const reviewer = { name: body.data.name.trim() };
  await setReviewerCookie(reviewer);
  return ok<CreateReviewerSessionResponse>({ reviewer });
}

// DELETE /api/reviewer/session
export async function DELETE() {
  await clearReviewerCookie();
  return ok({ ok: true });
}
