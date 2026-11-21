import type { z } from "zod";
import type { ApiError } from "@permitpike/contract";

type ErrorCode = ApiError["error"]["code"];

const STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  not_found: 404,
  conflict: 409,
  not_implemented: 501,
  internal: 500,
};

export function ok<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

export function fail(code: ErrorCode, message: string, issues?: unknown[]): Response {
  const body: ApiError = { error: { code, message, ...(issues ? { issues } : {}) } };
  return Response.json(body, { status: STATUS[code] });
}

/** Returned by every route while the real (DB + agent) path is unwritten. */
export function notImplemented(): Response {
  return fail("not_implemented", "Real data path not built yet. Set USE_MOCKS=true.");
}

export async function parseBody<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<{ data: z.infer<S> } | { error: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: fail("bad_request", "Body must be JSON.") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: fail("bad_request", "Body does not match the contract.", parsed.error.issues) };
  }
  return { data: parsed.data };
}
