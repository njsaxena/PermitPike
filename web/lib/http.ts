import type { z } from "zod";
import type { ApiError } from "@permitpike/contract";

type ErrorCode = ApiError["error"]["code"];

const STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  not_found: 404,
  conflict: 409,
  not_implemented: 501,
  internal: 500,
};

export function ok<T>(data: T, status = 200): Response {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

export function fail(code: ErrorCode, message: string, issues?: unknown[]): Response {
  const body: ApiError = { error: { code, message, ...(issues ? { issues } : {}) } };
  return Response.json(body, { status: STATUS[code], headers: { "cache-control": "no-store" } });
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

/** Maps thrown errors to API responses. RepoError carries its own code. */
export function handleError(err: unknown): Response {
  if (err instanceof Error && "code" in err && typeof err.code === "string") {
    const code = err.code as ErrorCode;
    if (code in STATUS) return fail(code, err.message);
  }
  console.error(err);
  return fail("internal", "Something went wrong on our side.");
}
