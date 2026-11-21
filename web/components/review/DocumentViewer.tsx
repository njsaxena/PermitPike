"use client";

import { useState } from "react";
import { Check, ExternalLink, Maximize, Minus, Pencil, Plus, TriangleAlert, X } from "lucide-react";
import type { CheckStatus, Extraction, FileKind, FileRef } from "@permitpike/contract";
import { Tabs, formatBytes } from "@/components/ui";
import { cx } from "@/lib/cx";
import { fieldGroups, type FieldRow } from "@/lib/example-fields";
import { longDate } from "@/lib/format";
import { DOCUMENT_LABEL, LOW_CONFIDENCE, fieldSource } from "@/lib/review-sources";

/*
 * The applicant's documents, one at a time, at a size an official can read. Under each
 * document: the extracted values it should back up, with the model's confidence and the
 * result of the check that used them. Low confidence and missing values are called out
 * so the official looks at those first.
 */

const ZOOMS = [50, 75, 100, 125, 150, 200, 300];

export interface ViewerFile extends FileRef {
  /** Image of the first page, for PDFs. Without one, PDFs open in the browser's viewer. */
  preview?: string;
}

/** Tab id for a file's document. Exported so a check can open "its" document. */
export const docTabId = (kind: FileKind) => `doc-${kind}`;

const STATUS_ICON: Record<CheckStatus, { Icon: typeof Check; className: string; word: string }> = {
  pass: { Icon: Check, className: "text-positive", word: "passes" },
  warn: { Icon: TriangleAlert, className: "text-warning", word: "needs a look" },
  fail: { Icon: X, className: "text-critical", word: "fails" },
};

function labelFor(file: ViewerFile, files: ViewerFile[]) {
  const same = files.filter((f) => f.kind === file.kind);
  const base = DOCUMENT_LABEL[file.kind];
  return same.length > 1 ? `${base} ${same.indexOf(file) + 1}` : base;
}

export function DocumentViewer({
  files,
  extraction,
  fieldStatus = {},
  edited = new Set(),
  active,
  onActiveChange,
  className,
}: {
  files: ViewerFile[];
  extraction: Extraction | null;
  /** Check result for each field a check read, by dot path. */
  fieldStatus?: Record<string, CheckStatus>;
  /** Fields an official corrected in the permit record. */
  edited?: ReadonlySet<string>;
  /** Controlled: the open document's tab id (see docTabId). */
  active?: string;
  onActiveChange?: (id: string) => void;
  className?: string;
}) {
  const rows = extraction ? fieldGroups(extraction.fields).flatMap((g) => g.rows) : [];
  // One tab per kind; a second file of the same kind gets its own tab.
  const seen = new Set<FileKind>();
  const tabs = files.map((f) => {
    const id = seen.has(f.kind) ? `doc-${f.id}` : docTabId(f.kind);
    seen.add(f.kind);
    return { file: f, id };
  });

  return (
    <section aria-labelledby="documents-heading" className={cx("flex flex-col border border-ink bg-surface", className)}>
      <header className="flex flex-col gap-3 border-b border-border px-card py-4">
        <h2 id="documents-heading" className="text-lg text-ink">
          Documents <span className="text-muted">{files.length}</span>
        </h2>
        {files.length === 0 && <p className="text-muted">No documents were uploaded.</p>}
      </header>
      {files.length > 0 && (
        <div className="px-card pt-4 pb-card">
          <Tabs
            label="Documents"
            value={active}
            onChange={onActiveChange}
            panelClassName="pt-4"
            items={tabs.map(({ file, id }) => ({
              id,
              label: labelFor(file, files),
              content: (
                <DocumentPanel
                  file={file}
                  rows={rows.filter((r) => fieldSource(r.key) === file.kind)}
                  extraction={extraction}
                  fieldStatus={fieldStatus}
                  edited={edited}
                />
              ),
            }))}
          />
        </div>
      )}
    </section>
  );
}

function DocumentPanel({
  file,
  rows,
  extraction,
  fieldStatus,
  edited,
}: {
  file: ViewerFile;
  rows: FieldRow[];
  extraction: Extraction | null;
  fieldStatus: Record<string, CheckStatus>;
  edited: ReadonlySet<string>;
}) {
  const [zoom, setZoom] = useState<number | "fit">("fit");
  const image = file.preview ?? (file.contentType.startsWith("image/") ? file.url : null);
  const step = (dir: 1 | -1) =>
    setZoom((z) => {
      const now = z === "fit" ? 100 : z;
      const i = ZOOMS.indexOf(now);
      return ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, (i === -1 ? 2 : i) + dir))]!;
    });

  return (
    <div data-viewer-panel className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-sm text-muted">
          <span className="font-semibold text-ink">{file.name}</span> · {formatBytes(file.sizeBytes)} · Uploaded{" "}
          {longDate(file.uploadedAt)}
        </p>
        <div className="flex items-center gap-1" role="group" aria-label={`Zoom ${file.name}`}>
          {image && (
            <>
              <ToolButton label="Zoom out" data-zoom="out" onClick={() => step(-1)}>
                <Minus aria-hidden className="size-4" strokeWidth={1.75} />
              </ToolButton>
              <span data-zoom-label aria-live="polite" className="w-14 text-center text-sm text-ink">
                {zoom === "fit" ? "Fit" : `${zoom}%`}
              </span>
              <ToolButton label="Zoom in" data-zoom="in" onClick={() => step(1)}>
                <Plus aria-hidden className="size-4" strokeWidth={1.75} />
              </ToolButton>
              <ToolButton label="Fit to width" data-zoom="fit" onClick={() => setZoom("fit")}>
                <Maximize aria-hidden className="size-4" strokeWidth={1.75} />
              </ToolButton>
            </>
          )}
          <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="ml-2 inline-flex h-8 items-center gap-1.5 border border-border-strong px-3 text-sm font-semibold text-ink transition-[background-color,box-shadow] duration-100 ease-out hov:wash"
          >
            Open original
            <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.75} />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </div>

      <div data-zoom-stage className="max-h-[68vh] overflow-auto border border-border bg-sunken lg:max-h-[58vh]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- applicant uploads, any size, from Blob
          <img
            src={image}
            alt={`${DOCUMENT_LABEL[file.kind]}: ${file.name}`}
            data-zoom-image
            className="block h-auto max-w-none bg-surface"
            style={{ width: zoom === "fit" ? "100%" : `${zoom}%` }}
          />
        ) : (
          <object data={file.url} type={file.contentType} aria-label={file.name} className="block h-[68vh] w-full">
            <p className="p-card text-ink">
              This file can't be shown here.{" "}
              <a href={file.url} target="_blank" rel="noreferrer" className="pp-link">
                Open {file.name}
              </a>
            </p>
          </object>
        )}
      </div>

      {rows.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-ink">Check these against the {DOCUMENT_LABEL[file.kind].toLowerCase()}</h3>
          <dl className="border-t border-ink">
            {rows.map((r) => (
              <FieldLine
                key={r.key}
                row={r}
                extraction={extraction}
                status={fieldStatus[r.key]}
                edited={edited.has(r.key)}
              />
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  children,
  ...rest
}: { label: string; onClick: () => void; children: React.ReactNode } & Record<`data-${string}`, string>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-8 items-center justify-center border border-border-strong bg-surface text-ink transition-[background-color,box-shadow] duration-100 ease-out hov:wash"
      {...rest}
    >
      {children}
    </button>
  );
}

/** One extracted value: label, value, how sure the model was, and the check that used it. */
export function FieldLine({
  row,
  extraction,
  status,
  source,
  edited = false,
}: {
  row: FieldRow;
  extraction: Extraction | null;
  status?: CheckStatus;
  /** Where to check it, e.g. "Spec sheet". */
  source?: string;
  /** An official corrected this value in the permit record. */
  edited?: boolean;
}) {
  const confidence = extraction?.fieldConfidence[row.key];
  const missing = row.value === null || (!edited && extraction?.missingFields.includes(row.key));
  const low = !edited && confidence !== undefined && confidence < LOW_CONFIDENCE;
  const s = status && STATUS_ICON[status];
  return (
    <div
      data-field={row.key}
      className={cx(
        "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-0.5 border-b border-border py-2",
        (missing || low) && "-mx-2 bg-warning-tint px-2",
        status === "fail" && !edited && "-mx-2 bg-critical-tint px-2",
      )}
    >
      <dt className="text-sm text-muted">
        {row.label}
        {source && <span className="whitespace-nowrap"> · {source}</span>}
      </dt>
      <dd className="flex items-center justify-end gap-1.5 text-right text-sm">
        {missing ? (
          <span data-record-value={row.key} className="font-semibold text-warning">
            Not found
          </span>
        ) : (
          <span data-record-value={row.key} className={cx("font-semibold text-ink", status === "fail" && !edited && "text-critical")}>
            {row.value}
          </span>
        )}
        {s && (
          <>
            <s.Icon aria-hidden className={cx("size-3.5", s.className)} strokeWidth={3} />
            <span className="sr-only"> (check {s.word})</span>
          </>
        )}
      </dd>
      {(low || missing) && (
        <dd className="col-span-2 flex items-center gap-1.5 text-sm text-warning">
          <TriangleAlert aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
          {missing
            ? "PermitPike could not find this. Read it from the document yourself."
            : `Read with ${Math.round(confidence! * 100)}% confidence. Confirm it on the document.`}
        </dd>
      )}
      {edited ? (
        <dd className="col-span-2 inline-flex items-center gap-1 text-sm font-semibold text-ink">
          <Pencil aria-hidden className="size-3.5" strokeWidth={2} />
          Edited by you
        </dd>
      ) : (
        !low &&
        !missing &&
        confidence !== undefined && (
          <dd className="col-span-2 text-sm text-muted">Read with {Math.round(confidence * 100)}% confidence</dd>
        )
      )}
    </div>
  );
}
