import { ResubmitApplicationRequest } from "@permitpike/contract";
import type { ResubmitApplicationResponse } from "@permitpike/contract";
import { mocksEnabled } from "@/lib/env";
import { fail, notImplemented, ok, parseBody } from "@/lib/http";
import * as mocks from "@/mocks/store";

// POST /api/applications/:id/resubmit
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await parseBody(req, ResubmitApplicationRequest);
  if ("error" in body) return body.error;

  if (!mocksEnabled()) return notImplemented(); // TODO: insert new version, call the agent
  const result = mocks.resubmitApplication(id, body.data);
  if (!result.ok) return fail(result.code, result.message);
  return ok<ResubmitApplicationResponse>({ application: result.value });
}
