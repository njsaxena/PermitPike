import type { GetApplicationResponse } from "@permitpike/contract";
import { mocksEnabled } from "@/lib/env";
import { fail, notImplemented, ok } from "@/lib/http";
import * as mocks from "@/mocks/store";

// GET /api/applications/:id
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!mocksEnabled()) return notImplemented(); // TODO: read application + versions + actions from db
  const detail = mocks.getApplication(id);
  if (!detail) return fail("not_found", `No application ${id}`);
  return ok<GetApplicationResponse>(detail);
}
