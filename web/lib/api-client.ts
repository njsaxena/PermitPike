/**
 * Typed client for the web API. Every response is validated against the contract,
 * so a shape drift fails loudly in the browser console instead of rendering junk.
 */
import {
  ApiError,
  CreateApplicationResponse,
  GetApplicationResponse,
  ListApplicationsResponse,
  ListEvalsResponse,
  ResubmitApplicationResponse,
  ReviewApplicationResponse,
  type CreateApplicationRequest,
  type ListApplicationsQuery,
  type ResubmitApplicationRequest,
  type ReviewApplicationRequest,
} from "@permitpike/contract";
import type { z } from "zod";

async function call<S extends z.ZodType>(schema: S, path: string, init?: RequestInit): Promise<z.infer<S>> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body: unknown = await res.json();
  if (!res.ok) {
    const err = ApiError.safeParse(body);
    throw new Error(err.success ? err.data.error.message : `Request failed: ${res.status}`);
  }
  return schema.parse(body);
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const api = {
  listApplications(query: ListApplicationsQuery = {}) {
    const qs = new URLSearchParams();
    if (query.status) qs.set("status", query.status);
    if (query.jobType) qs.set("jobType", query.jobType);
    const suffix = qs.size > 0 ? `?${qs}` : "";
    return call(ListApplicationsResponse, `/api/applications${suffix}`);
  },
  getApplication(id: string) {
    return call(GetApplicationResponse, `/api/applications/${encodeURIComponent(id)}`);
  },
  createApplication(body: CreateApplicationRequest) {
    return call(CreateApplicationResponse, "/api/applications", post(body));
  },
  resubmitApplication(id: string, body: ResubmitApplicationRequest) {
    return call(ResubmitApplicationResponse, `/api/applications/${encodeURIComponent(id)}/resubmit`, post(body));
  },
  reviewApplication(id: string, body: ReviewApplicationRequest) {
    return call(ReviewApplicationResponse, `/api/applications/${encodeURIComponent(id)}/review`, post(body));
  },
  listEvals() {
    return call(ListEvalsResponse, "/api/evals");
  },
};
