import type { Part } from "@google/genai";
import type { Extraction, FileRef, JobType } from "@permitpike/contract";
import { extractApplicationDocuments, SUPPORTED_FILES } from "../../extract";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
// Leave room for base64 expansion and the prompt in Gemini's 100 MB request limit.
const MAX_UPLOAD_BYTES = 70 * 1024 * 1024;
// The web caller allows 55 seconds for extraction, checks, and the summary.
const EXTRACTION_TIMEOUT_MS = 35_000;
const supportedMimeTypes = new Set<string>(Object.values(SUPPORTED_FILES));

function permitUploadUrl(file: FileRef): URL {
  const url = new URL(file.url);
  if (
    url.protocol !== "https:" || url.port || url.username || url.password ||
    !url.hostname.endsWith(".blob.vercel-storage.com") || !url.pathname.startsWith("/permits/")
  ) {
    throw new Error("Extraction requires a public Vercel Blob permit upload URL.");
  }
  return url;
}

async function readUpload(url: URL, maxBytes: number, signal: AbortSignal) {
  const response = await fetch(url, { redirect: "error", signal });
  const mimeType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new Error(`Could not download a permit document (HTTP ${response.status}).`);
  }
  if (!mimeType || !supportedMimeTypes.has(mimeType)) {
    await response.body.cancel();
    throw new Error("Permit documents must be supported PDF or image uploads.");
  }
  const sizeError = "Permit documents exceed the extraction limit of 25 MiB per file or 70 MiB combined.";
  if (Number(response.headers.get("content-length")) > maxBytes) {
    await response.body.cancel();
    throw new Error(sizeError);
  }

  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = response.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error(sizeError);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (size === 0) throw new Error("A permit document is empty.");
  return { mimeType, data: Buffer.concat(chunks, size) };
}

export async function extract(files: FileRef[], jobType: JobType): Promise<Extraction> {
  if (files.length === 0) throw new Error("Upload permit documents before running extraction.");
  const uploads = files.map((file) => ({ url: permitUploadUrl(file), kind: file.kind }));
  const signal = AbortSignal.timeout(EXTRACTION_TIMEOUT_MS);
  const parts: Part[] = [];
  let remainingBytes = MAX_UPLOAD_BYTES;
  for (const [index, { url, kind }] of uploads.entries()) {
    const { mimeType, data } = await readUpload(url, Math.min(MAX_FILE_BYTES, remainingBytes), signal);
    remainingBytes -= data.length;
    parts.push({ text: `Document ${index + 1} type: ${kind}` }, {
      inlineData: { mimeType, data: data.toString("base64") },
    });
  }
  return extractApplicationDocuments(parts, jobType, signal);
}
