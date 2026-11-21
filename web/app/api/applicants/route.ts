import { CreateApplicantRequest, type CreateApplicantResponse } from "@permitpike/contract";
import { handleError, ok, parseBody } from "@/lib/http";
import { upsertApplicant } from "@/lib/server/repo";

// POST /api/applicants  create, or reuse the applicant with this license number
export async function POST(req: Request) {
  const body = await parseBody(req, CreateApplicantRequest);
  if ("error" in body) return body.error;
  try {
    const applicant = await upsertApplicant(body.data.name, body.data.licenseNumber);
    return ok<CreateApplicantResponse>({ applicant });
  } catch (err) {
    return handleError(err);
  }
}
