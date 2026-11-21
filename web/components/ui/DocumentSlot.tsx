"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { Check, CircleAlert, FileText, Plus } from "lucide-react";
import { cx } from "@/lib/cx";
import { FileChip, type FileChipData } from "./FileDrop";

export interface DocumentSlotProps {
  /** What the document is, e.g. "Photo of the electrical panel". */
  title: string;
  /** One or two sentences on what a good one shows. */
  hint: string;
  required?: boolean;
  /** Passed to the file input, e.g. ".pdf,.jpg,.png". */
  accept?: string;
  /** Controlled list of attached files. */
  files: FileChipData[];
  onFilesChange: (files: FileChipData[]) => void;
  error?: string;
  disabled?: boolean;
  /** Static state for /design samples: "dragging" or "focus". */
  "data-demo"?: string;
}

/**
 * One row of a document checklist: what to upload, whether it is required, and its own
 * file button. Takes several files (front and back of a spec sheet) and accepts drops.
 * The square on the left fills with gold and a check once something is attached.
 */
export function DocumentSlot({
  title,
  hint,
  required = false,
  accept,
  files,
  onFilesChange,
  error,
  disabled = false,
  "data-demo": demo,
}: DocumentSlotProps) {
  const inputId = useId();
  const titleId = `${inputId}-title`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const isDragging = dragging || demo?.includes("dragging");
  const attached = files.length > 0;

  function add(list: FileList | null) {
    if (!list || list.length === 0) return;
    const added = Array.from(list, (f) => ({ name: f.name, sizeBytes: f.size, file: f }));
    onFilesChange([...files, ...added]);
    setAnnouncement(`Attached ${added.map((f) => f.name).join(", ")} as ${title}`);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (!disabled) add(e.dataTransfer.files);
  }

  return (
    <div
      role="group"
      aria-labelledby={titleId}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cx(
        "flex gap-3 border p-3",
        disabled
          ? "border-border bg-sunken"
          : isDragging
            ? "border-ink bg-accent-tint"
            : error
              ? "border-critical bg-surface"
              : "border-border-strong bg-surface",
      )}
    >
      <span
        aria-hidden
        className={cx(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center border",
          attached ? "border-ink bg-accent text-ink" : "border-border-strong bg-surface text-muted",
        )}
      >
        {attached ? (
          <Check className="size-4" strokeWidth={2.5} />
        ) : (
          <FileText className="size-3.5" strokeWidth={1.75} />
        )}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p id={titleId} className="font-semibold text-ink">
              {title}
              <span className="ml-2 text-sm font-normal text-muted">{required ? "Required" : "Optional"}</span>
            </p>
            <p id={hintId} className="text-sm text-muted">
              {isDragging ? "Drop to attach." : hint}
            </p>
          </div>
          <label
            htmlFor={inputId}
            data-demo={demo?.includes("focus") ? "focus" : undefined}
            className={cx(
              "inline-flex h-8 shrink-0 items-center gap-1.5 self-start border px-3 text-sm font-semibold whitespace-nowrap",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-1 has-[:focus-visible]:outline-ink",
              disabled
                ? "cursor-not-allowed border-border bg-sunken text-muted"
                : "cursor-pointer border-border-strong bg-surface text-ink hov:border-ink hov:bg-sunken",
            )}
          >
            <Plus aria-hidden className="size-4" strokeWidth={1.75} />
            {attached ? "Add another" : "Choose file"}
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              className="sr-only"
              accept={accept}
              multiple
              disabled={disabled}
              aria-labelledby={titleId}
              aria-describedby={[hintId, error && errorId].filter(Boolean).join(" ")}
              aria-invalid={error ? true : undefined}
              aria-required={required || undefined}
              onChange={(e) => {
                add(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {error && (
          <p id={errorId} className="flex items-start gap-1.5 text-sm text-critical">
            <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
            {error}
          </p>
        )}

        {attached && (
          <ul aria-label={`${title}: attached files`} className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <FileChip
                key={`${f.name}-${i}`}
                file={f}
                disabled={disabled}
                onRemove={() => {
                  onFilesChange(files.filter((_, j) => j !== i));
                  setAnnouncement(`Removed ${f.name}`);
                  inputRef.current?.focus();
                }}
              />
            ))}
          </ul>
        )}

        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>
    </div>
  );
}
