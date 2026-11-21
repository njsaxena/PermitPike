"use client";

import { upload } from "@vercel/blob/client";
import type { FileKind, FileRef } from "@permitpike/contract";

export interface PickedFile {
  file: File;
  kind: FileKind;
}

/**
 * Uploads straight from the browser to Vercel Blob (tokens from /api/blob), one file at a time.
 * Returns contract FileRefs for the application.
 */
export async function uploadFiles(
  files: PickedFile[],
  applicantId: string,
  onProgress?: (done: number, total: number) => void,
): Promise<FileRef[]> {
  const refs: FileRef[] = [];
  for (const [i, { file, kind }] of files.entries()) {
    onProgress?.(i, files.length);
    const blob = await upload(`permits/${file.name}`, file, {
      access: "public",
      handleUploadUrl: "/api/blob",
      clientPayload: applicantId,
      contentType: file.type || undefined,
    });
    refs.push({
      id: crypto.randomUUID(),
      kind,
      name: file.name,
      url: blob.url,
      contentType: file.type || blob.contentType,
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
    });
  }
  onProgress?.(files.length, files.length);
  return refs;
}
