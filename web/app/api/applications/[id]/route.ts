import { after } from "next/server";
import {
  DeleteApplicationRequest,
  type DeleteApplicationResponse,
  type GetApplicationResponse,
} from "@permitpike/contract";
import { fail, handleError, ok, parseBody } from "@/lib/http";
import { deletePermitUploads } from "@/lib/server/blob-cleanup";
import { deleteApplication, getApplicationDetail } from "@/lib/server/repo";

export const dynamic = "force-dynamic";

// GET /api/applications/:id
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const detail = await getApplicationDetail(id);
    if (!detail) return fail("not_found", "No such application.");
    return ok<GetApplicationResponse>(detail);
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/applications/:id  the filing electrician deletes it, before an official acts
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await parseBody(req, DeleteApplicationRequest);
  if ("error" in body) return body.error;
  try {
    const urls = await deleteApplication(id, body.data.applicantId);
    after(() => deletePermitUploads(urls));
    return ok<DeleteApplicationResponse>({ id });
  } catch (err) {
    return handleError(err);
  }
}
