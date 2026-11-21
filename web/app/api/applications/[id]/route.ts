import type { GetApplicationResponse } from "@permitpike/contract";
import { fail, handleError, ok } from "@/lib/http";
import { getApplicationDetail } from "@/lib/server/repo";

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
