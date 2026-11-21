import {
  UpdateApplicantRequest,
  type GetApplicantResponse,
  type UpdateApplicantResponse,
} from "@permitpike/contract";
import { fail, handleError, ok, parseBody } from "@/lib/http";
import { getApplicant, updateApplicant } from "@/lib/server/repo";

export const dynamic = "force-dynamic";

// GET /api/applicants/:id  the signed-in electrician's profile
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const applicant = await getApplicant(id);
    if (!applicant) return fail("not_found", "No such applicant.");
    return ok<GetApplicantResponse>({ applicant });
  } catch (err) {
    return handleError(err);
  }
}

// PATCH /api/applicants/:id  name and company
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await parseBody(req, UpdateApplicantRequest);
  if ("error" in body) return body.error;
  try {
    const applicant = await updateApplicant(id, body.data);
    return ok<UpdateApplicantResponse>({ applicant });
  } catch (err) {
    return handleError(err);
  }
}
