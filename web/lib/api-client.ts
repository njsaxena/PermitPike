/**
 * Typed client for the web API. Every response is validated against the contract,
 * so a shape drift fails loudly instead of rendering junk.
 */
import {
  ApiError,
  CreateApplicantResponse,
  CreateApplicationResponse,
  CreateReviewerSessionResponse,
  DeleteApplicationResponse,
  GetApplicantResponse,
  GetApplicationResponse,
  GetTrackResponse,
  ListApplicationsResponse,
  ParcelLookupResponse,
  ResubmitApplicationResponse,
  ReviewApplicationResponse,
  UpdateApplicantResponse,
  type CreateApplicantRequest,
  type CreateApplicationRequest,
  type CreateReviewerSessionRequest,
  type DeleteApplicationRequest,
  type ListApplicationsQuery,
  type ParcelLookupQuery,
  type ResubmitApplicationRequest,
  type ReviewApplicationRequest,
  type UpdateApplicantRequest,
} from "@permitpike/contract";
import type { z } from "zod";

/** A non-2xx response. `code` is the contract ApiError code ("conflict", "unauthorized", ...). */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiError["error"]["code"] | "unknown",
    message: string,
  ) {
    super(message);
  }
}

async function call<S extends z.ZodType>(schema: S, path: string, init?: RequestInit): Promise<z.infer<S>> {
  const res = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = ApiError.safeParse(body);
    throw err.success
      ? new ApiRequestError(res.status, err.data.error.code, err.data.error.message)
      : new ApiRequestError(res.status, "unknown", `Request failed (${res.status}).`);
  }
  return schema.parse(body);
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });
const enc = encodeURIComponent;

export const api = {
  createApplicant(body: CreateApplicantRequest) {
    return call(CreateApplicantResponse, "/api/applicants", post(body));
  },
  getApplicant(id: string) {
    return call(GetApplicantResponse, `/api/applicants/${enc(id)}`);
  },
  updateApplicant(id: string, body: UpdateApplicantRequest) {
    return call(UpdateApplicantResponse, `/api/applicants/${enc(id)}`, { method: "PATCH", body: JSON.stringify(body) });
  },
  createReviewerSession(body: CreateReviewerSessionRequest) {
    return call(CreateReviewerSessionResponse, "/api/reviewer/session", post(body));
  },
  listApplications(query: ListApplicationsQuery = {}) {
    const qs = new URLSearchParams();
    if (query.status) qs.set("status", query.status);
    if (query.jobType) qs.set("jobType", query.jobType);
    if (query.applicantId) qs.set("applicantId", query.applicantId);
    const suffix = qs.size > 0 ? `?${qs}` : "";
    return call(ListApplicationsResponse, `/api/applications${suffix}`);
  },
  getApplication(id: string) {
    return call(GetApplicationResponse, `/api/applications/${enc(id)}`);
  },
  createApplication(body: CreateApplicationRequest) {
    return call(CreateApplicationResponse, "/api/applications", post(body));
  },
  resubmitApplication(id: string, body: ResubmitApplicationRequest) {
    return call(ResubmitApplicationResponse, `/api/applications/${enc(id)}/resubmit`, post(body));
  },
  deleteApplication(id: string, body: DeleteApplicationRequest) {
    return call(DeleteApplicationResponse, `/api/applications/${enc(id)}`, { method: "DELETE", body: JSON.stringify(body) });
  },
  reviewApplication(id: string, body: ReviewApplicationRequest) {
    return call(ReviewApplicationResponse, `/api/applications/${enc(id)}/review`, post(body));
  },
  /** Public status by tracking code. No login. */
  getTrack(code: string) {
    return call(GetTrackResponse, `/api/track/${enc(code)}`);
  },
  /**
   * Parcel and zoning for the "Is this the property?" step. Never throws: errors and
   * anything slower than the 3-second rule come back as "unavailable".
   */
  async lookupParcel(query: ParcelLookupQuery, signal?: AbortSignal): Promise<ParcelLookupResponse> {
    const qs = new URLSearchParams("pid" in query ? { pid: query.pid } : { address: query.address, ...(query.zip ? { zip: query.zip } : {}) });
    const timeout = AbortSignal.timeout(PARCEL_TIMEOUT_MS);
    try {
      return await call(ParcelLookupResponse, `/api/parcel?${qs}`, {
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
    } catch (err) {
      if (signal?.aborted) throw err;
      return { result: "unavailable", message: "The map could not load in time." };
    }
  },
};

/** The server answers within 3 seconds; this leaves room for the round trip. */
export const PARCEL_TIMEOUT_MS = 3500;

/** Live data refresh for queue and status pages. Postgres LISTEN/NOTIFY can't run on Vercel functions. */
export const POLL_MS = 3000;

/** The public /track page polls slower: 6 lookups a minute stays well under its 20-per-minute limit. */
export const TRACK_POLL_MS = 10_000;
