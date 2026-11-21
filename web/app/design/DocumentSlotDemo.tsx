"use client";

import { useState } from "react";
import { DocumentSlot, type DocumentSlotProps, type FileChipData } from "@/components/ui";

/** /design only: a DocumentSlot that keeps its own files, so samples can be tried. */
export function DocumentSlotDemo({
  files: initial = [],
  ...props
}: Omit<DocumentSlotProps, "files" | "onFilesChange"> & { files?: FileChipData[] }) {
  const [files, setFiles] = useState(initial);
  return <DocumentSlot {...props} files={files} onFilesChange={setFiles} />;
}
