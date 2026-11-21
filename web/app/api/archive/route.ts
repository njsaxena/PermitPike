import { z } from "zod";
import { fail, ok } from "@/lib/http";
import { archiveChat } from "@/lib/server/archive-chat";
import { allowRequest, clientIp } from "@/lib/server/rate-limit";

const MAX_BODY_BYTES = 64 * 1024;
const SEARCHES_PER_MINUTE = 20;
const MODEL_REQUESTS_PER_MINUTE = 8;
const GLOBAL_MODEL_REQUESTS_PER_MINUTE = 60;

const archiveInput = z.object({
  query: z.string().trim().min(1).max(500),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1200) })).max(8).optional(),
  recordContext: z.array(z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9-]{1,23}$/u)).max(12).optional(),
});

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const expected = new URL(request.url);
  // Next can use a different internal hostname when it constructs the request URL.
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host");
  if (host) expected.host = host;
  const protocol = request.headers.get("x-forwarded-proto");
  if (protocol === "http" || protocol === "https") expected.protocol = `${protocol}:`;
  return origin === expected.origin;
}

async function readJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return JSON.parse(text + decoder.decode());
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("bad_request", "Search from the PermitPike archive.");
  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (contentType !== "application/json" || Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    return fail("bad_request", "Send a JSON archive question of up to 500 characters.");
  }
  const parsed = archiveInput.safeParse(await readJson(request));
  if (!parsed.success) return fail("bad_request", "Send a valid archive question of up to 500 characters.");

  let modelKey: string | undefined;
  if (process.env.DATABASE_URL) {
    const ip = clientIp(request);
    try {
      if (!await allowRequest("archive-search", ip, SEARCHES_PER_MINUTE)) {
        return fail("rate_limited", "Too many archive searches. Wait a minute and try again.");
      }
      const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
      if (key && await allowRequest("archive-chat-gemini", ip, MODEL_REQUESTS_PER_MINUTE) &&
          await allowRequest("archive-chat-gemini-global", "all-visitors", GLOBAL_MODEL_REQUESTS_PER_MINUTE)) {
        modelKey = key;
      }
    } catch {
      // Public City records are available independently of the database and model.
    }
  }
  return ok(await archiveChat(parsed.data, modelKey));
}
