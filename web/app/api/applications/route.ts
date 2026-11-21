import { CreateApplicationRequest, ListApplicationsQuery } from "@permitpike/contract";
import type { CreateApplicationResponse, ListApplicationsResponse } from "@permitpike/contract";
import { mocksEnabled } from "@/lib/env";
import { fail, notImplemented, ok, parseBody } from "@/lib/http";
import * as mocks from "@/mocks/store";

// GET /api/applications?status=&jobType=
export async function GET(req: Request) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const query = ListApplicationsQuery.safeParse(params);
  if (!query.success) return fail("bad_request", "Invalid query.", query.error.issues);

  if (!mocksEnabled()) return notImplemented(); // TODO: read from db
  return ok<ListApplicationsResponse>({ applications: mocks.listApplications(query.data) });
}

// POST /api/applications
export async function POST(req: Request) {
  const body = await parseBody(req, CreateApplicationRequest);
  if ("error" in body) return body.error;

  if (!mocksEnabled()) return notImplemented(); // TODO: insert, then call the agent
  return ok<CreateApplicationResponse>({ application: mocks.createApplication(body.data) }, 201);
}
