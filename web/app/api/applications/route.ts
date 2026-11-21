import { after } from "next/server";
import {
  CreateApplicationRequest,
  ListApplicationsQuery,
  type CreateApplicationResponse,
  type ListApplicationsResponse,
} from "@permitpike/contract";
import { fail, handleError, ok, parseBody } from "@/lib/http";
import { parcelForFiling } from "@/lib/server/parcel";
import { createApplication, listApplications, saveParcel } from "@/lib/server/repo";
import { runReview } from "@/lib/server/review";
import { getReviewer } from "@/lib/server/session";

export const dynamic = "force-dynamic";
// The review runs after the response; give it room for the agent call.
export const maxDuration = 60;

// GET /api/applications?status=&jobType=  reviewer queue (reviewer cookie)
// GET /api/applications?applicantId=      "My permits"
export async function GET(req: Request) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const query = ListApplicationsQuery.safeParse(params);
  if (!query.success) return fail("bad_request", "Invalid query.", query.error.issues);
  if (!query.data.applicantId && !(await getReviewer())) {
    return fail("unauthorized", "Sign in as a reviewer to see the queue.");
  }
  try {
    return ok<ListApplicationsResponse>({ applications: await listApplications(query.data) });
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/applications  files are already in Vercel Blob (see /api/blob)
export async function POST(req: Request) {
  const body = await parseBody(req, CreateApplicationRequest);
  if ("error" in body) return body.error;
  try {
    const application = await createApplication(body.data);
    after(() => runReview(application.id, application.version));
    // The map never holds up filing: the parcel is saved after the response.
    after(async () => {
      const parcel = await parcelForFiling(body.data.parcelId, body.data.address.street, body.data.address.zip);
      if (parcel) await saveParcel(application.id, parcel);
    });
    return ok<CreateApplicationResponse>({ application }, 201);
  } catch (err) {
    return handleError(err);
  }
}
