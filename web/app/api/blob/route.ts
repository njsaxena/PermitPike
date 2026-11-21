import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { fail } from "@/lib/http";
import { applicantExists } from "@/lib/server/repo";

/*
 * POST /api/blob  issues short-lived tokens so the browser uploads straight to Vercel Blob.
 * Files never pass through this function, so phone photos aren't capped by the 4.5 MB
 * request limit. The client sends its applicantId as clientPayload.
 */
const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return fail("internal", "File uploads are not configured on this server (BLOB_READ_WRITE_TOKEN).");
  }
  let body: HandleUploadBody;
  try {
    body = (await req.json()) as HandleUploadBody;
  } catch {
    return fail("bad_request", "Body must be JSON.");
  }
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        if (!clientPayload || !(await applicantExists(clientPayload))) {
          throw new Error("Unknown applicant");
        }
        return { allowedContentTypes: ALLOWED, maximumSizeInBytes: MAX_BYTES, addRandomSuffix: true };
      },
      // Called by Vercel after the upload; the application row records files on submit instead.
      onUploadCompleted: async () => {},
    });
    return Response.json(result);
  } catch (err) {
    return fail("bad_request", err instanceof Error ? err.message : "Upload refused.");
  }
}
