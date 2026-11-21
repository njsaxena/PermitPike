import type { GetTrackResponse } from "@permitpike/contract";
import { fail, handleError, ok } from "@/lib/http";
import { allowRequest, clientIp } from "@/lib/server/rate-limit";
import { countAheadInQueue, getTrackRecord } from "@/lib/server/repo";
import { buildTrackView, TRACK_NOT_FOUND } from "@/lib/track";
import { normalizeTrackingCode } from "@/lib/tracking-code";

export const dynamic = "force-dynamic";

const LOOKUPS_PER_MINUTE = 20;

// GET /api/track/:code  public, no login. Returns the public view only (web/lib/track.ts).
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  try {
    if (!(await allowRequest("track", clientIp(req), LOOKUPS_PER_MINUTE))) {
      return fail("rate_limited", "Too many lookups. Wait a minute and try again.");
    }
    const code = normalizeTrackingCode(decodeURIComponent(raw));
    const record = code ? await getTrackRecord(code) : null;
    if (!record) return fail("not_found", TRACK_NOT_FOUND);
    const aheadInQueue = await countAheadInQueue(record.detail.application);
    return ok<GetTrackResponse>(buildTrackView(record.detail, { queuedAt: record.queuedAt, aheadInQueue }));
  } catch (err) {
    return handleError(err);
  }
}
