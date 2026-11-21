import { z } from "zod";
import { fail, ok, parseBody } from "@/lib/http";
import { archiveChat } from "@/lib/server/archive-chat";
import { allowRequest, clientIp } from "@/lib/server/rate-limit";
import { getReviewer } from "@/lib/server/session";

const archiveInput = z.object({
  query: z.string().trim().min(1).max(500),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1200) })).max(8).optional(),
  recordContext: z.array(z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9-]{1,23}$/u)).max(12).optional(),
});

export async function POST(request: Request) {
  if (!await getReviewer()) return fail("unauthorized", "Sign in as a reviewer to search the archive.");
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return fail("bad_request", "Search from the reviewer workspace.");
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json") ||
      Number(request.headers.get("content-length")) > 64 * 1024) {
    return fail("bad_request", "Send a JSON archive question of up to 500 characters.");
  }
  const parsed = await parseBody(request, archiveInput);
  if ("error" in parsed) return parsed.error;

  // The reviewer cookie is a demo sign-in. Meter Gemini calls on the shared limiter
  // and keep public record search available if the meter or model is unavailable.
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  const modelAllowed = key && process.env.DATABASE_URL &&
    await allowRequest("archive-chat-gemini", clientIp(request), 8).catch(() => false);
  return ok(await archiveChat(parsed.data, modelAllowed ? key : undefined));
}
