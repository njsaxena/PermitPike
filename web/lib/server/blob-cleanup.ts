import "server-only";
import { del } from "@vercel/blob";

/**
 * Removes a deleted permit's uploads from Vercel Blob. Only files this app uploaded
 * (a Blob host, under permits/) are touched, never example documents or other URLs.
 * Best effort: the permit is already gone, so a failure is logged, not raised.
 */
export async function deletePermitUploads(urls: string[]): Promise<void> {
  const ours = urls.filter((u) => {
    try {
      const url = new URL(u);
      return url.hostname.endsWith(".blob.vercel-storage.com") && url.pathname.startsWith("/permits/");
    } catch {
      return false;
    }
  });
  if (ours.length === 0 || !process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await del(ours);
  } catch (err) {
    console.error("blob cleanup failed", err);
  }
}
