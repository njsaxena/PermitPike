import { after } from "next/server";
import { ResubmitApplicationRequest, type ResubmitApplicationResponse } from "@permitpike/contract";
import { handleError, ok, parseBody } from "@/lib/http";
import { resubmitApplication } from "@/lib/server/repo";
import { runReview } from "@/lib/server/review";

export const maxDuration = 60;

// POST /api/applications/:id/resubmit  new version, status back to "submitted"
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await parseBody(req, ResubmitApplicationRequest);
  if ("error" in body) return body.error;
  try {
    const application = await resubmitApplication(id, body.data);
    after(() => runReview(application.id, application.version));
    return ok<ResubmitApplicationResponse>({ application });
  } catch (err) {
    return handleError(err);
  }
}
