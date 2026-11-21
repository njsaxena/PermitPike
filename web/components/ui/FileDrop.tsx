"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { FileText, Upload, X, CircleAlert } from "lucide-react";
import type { FileRef } from "@permitpike/contract";
import { cx } from "@/lib/cx";

/** What a chip needs to render. Matches the name/size fields of the contract's FileRef. */
export type FileChipData = Pick<FileRef, "name" | "sizeBytes">;

export interface FileDropProps {
  label: string;
  /** Passed to the file input, e.g. ".pdf,.jpg,.png". */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  error?: string;
  /** Initial chips (for /design and resubmits). */
  defaultFiles?: FileChipData[];
  /** Called with the full current list after every add or remove. */
  onFilesChange?: (files: FileChipData[]) => void;
  /** Static state for /design samples: "dragging" or "focus". */
  "data-demo"?: string;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDrop({
  label,
  accept,
  multiple = true,
  disabled = false,
  error,
  defaultFiles = [],
  onFilesChange,
  "data-demo": demo,
}: FileDropProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileChipData[]>(defaultFiles);
  const [dragging, setDragging] = useState(false);
  const isDragging = dragging || demo?.includes("dragging");

  function update(next: FileChipData[]) {
    setFiles(next);
    onFilesChange?.(next);
  }

  function add(list: FileList | null) {
    if (!list || list.length === 0) return;
    const added = Array.from(list, (f) => ({ name: f.name, sizeBytes: f.size }));
    update(multiple ? [...files, ...added] : added.slice(0, 1));
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    if (!disabled) add(e.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${inputId}-label`} className="text-sm font-semibold text-ink">
        {label}
      </span>
      <label
        htmlFor={inputId}
        data-demo={demo?.includes("focus") ? "focus" : undefined}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cx(
          "flex flex-col items-start gap-3 rounded-md border border-dashed p-6 sm:flex-row sm:items-center",
          "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
          disabled
            ? "cursor-not-allowed border-border bg-sunken text-muted"
            : isDragging
              ? "cursor-copy border-solid border-accent bg-accent-tint"
              : error
                ? "cursor-pointer border-critical bg-surface"
                : "cursor-pointer border-border-strong bg-sunken hov:border-ink",
        )}
      >
        <span
          aria-hidden
          className={cx(
            "flex size-10 shrink-0 items-center justify-center rounded-md border bg-surface",
            isDragging ? "border-accent text-accent" : "border-border text-muted",
          )}
        >
          <Upload className="size-5" strokeWidth={1.75} />
        </span>
        <span className="flex flex-col">
          <span className={cx("font-semibold", disabled ? "text-muted" : "text-ink")}>
            {isDragging ? "Drop to attach" : "Drag files here or choose from your computer"}
          </span>
          {accept && (
            <span className="font-mono text-sm text-muted">
              {accept.replaceAll(",", " ").toUpperCase()}
            </span>
          )}
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="sr-only"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          aria-labelledby={`${inputId}-label`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm text-critical">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
          {error}
        </p>
      )}

      {files.length > 0 && (
        <ul aria-label="Attached files" className="flex flex-wrap gap-2 pt-1">
          {files.map((f, i) => (
            <FileChip
              key={`${f.name}-${i}`}
              file={f}
              disabled={disabled}
              onRemove={() => {
                update(files.filter((_, j) => j !== i));
                inputRef.current?.focus();
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export function FileChip({
  file,
  onRemove,
  disabled,
}: {
  file: FileChipData;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  return (
    <li className="flex h-8 items-center gap-2 rounded-sm border border-border-strong bg-surface pl-2 text-sm">
      <FileText aria-hidden className="size-4 text-muted" strokeWidth={1.75} />
      <span className="max-w-56 truncate text-ink">{file.name}</span>
      <span className="font-mono text-label text-muted">{formatBytes(file.sizeBytes)}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove ${file.name}`}
          className="flex h-full items-center border-l border-border px-2 text-muted hov:bg-critical-tint hov:text-critical disabled:cursor-not-allowed"
        >
          <X aria-hidden className="size-3.5" strokeWidth={2} />
        </button>
      ) : (
        <span className="pr-2" />
      )}
    </li>
  );
}
