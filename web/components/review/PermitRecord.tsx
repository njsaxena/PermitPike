"use client";

import { useState } from "react";
import { Check, Pencil, TriangleAlert, X } from "lucide-react";
import type { CheckStatus, Extraction, ExtractedFields } from "@permitpike/contract";
import { Button, Callout } from "@/components/ui";
import { cx } from "@/lib/cx";
import { fieldGroups, type FieldRow } from "@/lib/example-fields";
import { longDate } from "@/lib/format";
import {
  fromDraft,
  getAt,
  inputFor,
  optionLabel,
  setAt,
  toDraft,
  unitFor,
  validate,
  type RecordInput,
} from "@/lib/record-edit";
import { DOCUMENT_LABEL, LOW_CONFIDENCE, fieldSource } from "@/lib/review-sources";

/*
 * The permit record: every value the permit rests on, in one place. PermitPike reads
 * them from the documents and the electrician confirms them when filing; the official
 * can correct any of them here. Each row says where its value came from.
 * Both the read view and the edit form are always in the markup (one hidden) so the
 * static copy on the design artifact can switch between them without React.
 */

const STATUS_ICON: Record<CheckStatus, { Icon: typeof Check; className: string; word: string }> = {
  pass: { Icon: Check, className: "text-positive", word: "passes" },
  warn: { Icon: TriangleAlert, className: "text-warning", word: "needs a look" },
  fail: { Icon: X, className: "text-critical", word: "fails" },
};

/** The inputs that edit one row ("Make and model" is two). */
function inputsFor(fields: ExtractedFields, row: FieldRow): RecordInput[] {
  if (row.key.endsWith(".model")) {
    const base = row.key.slice(0, -".model".length);
    return [inputFor(fields.jobType, `${base}.manufacturer`, "Make"), inputFor(fields.jobType, row.key, "Model")].filter(
      (i): i is RecordInput => i !== null,
    );
  }
  if (row.key === "panelUpgrade") {
    if (!("panelUpgrade" in fields) || !fields.panelUpgrade) return [];
    return [
      inputFor(fields.jobType, "panelUpgrade.proposedPanelRatingAmps", "New panel rating", "A"),
      inputFor(fields.jobType, "panelUpgrade.proposedServiceAmps", "New service rating", "A"),
    ].filter((i): i is RecordInput => i !== null);
  }
  const one = inputFor(fields.jobType, row.key, row.label, unitFor(row.key));
  return one ? [one] : [];
}

export function PermitRecord({
  fields,
  extraction,
  fieldStatus = {},
  edited,
  editable,
  onSave,
}: {
  /** The record as it stands now (the extraction plus any edits). */
  fields: ExtractedFields;
  /** What PermitPike read, for confidence and provenance. */
  extraction: Extraction | null;
  fieldStatus?: Record<string, CheckStatus>;
  /** Row keys an official changed. */
  edited: ReadonlySet<string>;
  /** Whether this official can edit the record here. */
  editable: boolean;
  onSave?: (next: ExtractedFields, changedRows: string[]) => void;
}) {
  const groups = fieldGroups(fields);
  const rows = groups.flatMap((g) => g.rows);
  const initialDraft = () =>
    Object.fromEntries(rows.flatMap((r) => inputsFor(fields, r)).map((i) => [i.path, toDraft(i, getAt(fields, i.path))]));

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>(initialDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function start() {
    setDraft(initialDraft());
    setErrors({});
    setEditing(true);
  }

  function save() {
    let next = fields;
    const errs: Record<string, string> = {};
    const changed = new Set<string>();
    for (const row of rows) {
      for (const input of inputsFor(fields, row)) {
        const parsed = fromDraft(input, draft[input.path] ?? "");
        if ("error" in parsed) {
          errs[input.path] = parsed.error;
          continue;
        }
        if (parsed.value !== (getAt(fields, input.path) ?? null)) {
          next = setAt(next, input.path, parsed.value);
          changed.add(row.key);
        }
      }
    }
    if (Object.keys(errs).length === 0) Object.assign(errs, validate(fields.jobType, next));
    if (Object.keys(errs).length) return setErrors(errs);
    setEditing(false);
    if (changed.size) onSave?.(next, [...changed]);
  }

  const editedCount = rows.filter((r) => edited.has(r.key)).length;

  return (
    <div data-record className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-prose text-sm text-muted">
          {extraction ? (
            <>
              Read by <span className="font-semibold text-ink">{extraction.model}</span> on {longDate(extraction.extractedAt)}
            </>
          ) : (
            "Entered by the electrician"
          )}
          <span data-record-edited-note hidden={editedCount === 0}>
            , <span className="font-semibold text-ink">corrected by you</span>
          </span>
          .
        </p>
        {editable && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={start}
              hidden={editing}
              data-record-edit=""
              icon={<Pencil aria-hidden className="size-4" strokeWidth={1.75} />}
            >
              Edit record
            </Button>
          </div>
        )}
      </div>

      {editedCount > 0 && Object.keys(fieldStatus).some((k) => edited.has(k)) && (
        <Callout tone="warning" title="Checks ran on the values before your edits">
          PermitPike reviews again when the electrician resubmits. Until then, check the edited values yourself.
        </Callout>
      )}

      {/* Read view */}
      <div data-record-view hidden={editing} className="flex flex-col gap-6">
        {groups.map((g) => (
          <section key={g.title} aria-label={g.title} className="flex flex-col gap-1">
            <h3 className="font-semibold text-ink">{g.title}</h3>
            <dl className="border-t border-ink">
              {g.rows.map((r) => (
                <RecordRow key={r.key} row={r} extraction={extraction} status={fieldStatus[r.key]} edited={edited.has(r.key)} />
              ))}
            </dl>
          </section>
        ))}
      </div>

      {/* Edit form */}
      {editable && (
        <form
          data-record-form
          hidden={!editing}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="flex flex-col gap-6"
        >
          {groups.map((g) => (
            <fieldset key={g.title} className="flex flex-col gap-1">
              <legend className="pb-1 font-semibold text-ink">{g.title}</legend>
              <div className="border-t border-ink">
                {g.rows.map((r) => {
                  const inputs = inputsFor(fields, r);
                  return (
                    <div
                      key={r.key}
                      data-record-row={r.key}
                      className="grid gap-x-4 gap-y-2 border-b border-border py-2.5 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:items-start"
                    >
                      <span className="pt-2 text-sm text-muted">{r.label}</span>
                      {inputs.length === 0 ? (
                        <span className="pt-2 text-sm text-ink">
                          {r.value ?? "None"} <span className="text-muted">· Change it on the application</span>
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          {inputs.map((i) => (
                            <RecordInputField
                              key={i.path}
                              input={i}
                              showLabel={inputs.length > 1}
                              value={draft[i.path] ?? ""}
                              error={errors[i.path]}
                              onChange={(v) => setDraft((d) => ({ ...d, [i.path]: v }))}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" data-record-save="">
              Save record
            </Button>
            <Button variant="quiet" onClick={() => setEditing(false)} data-record-cancel="">
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function RecordInputField({
  input,
  showLabel,
  value,
  error,
  onChange,
}: {
  input: RecordInput;
  showLabel: boolean;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  const id = `record-${input.path.replace(/\./g, "-")}`;
  const control = cx(
    "h-10 border bg-surface px-3 text-ink",
    error ? "border-critical" : "border-border-strong hov:border-ink",
  );
  const shared = {
    id,
    "aria-label": showLabel ? undefined : input.label,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
    "data-record-input": input.path,
    "data-kind": input.kind,
    "data-unit": input.unit,
    "data-nullable": input.nullable ? "" : undefined,
  };
  return (
    <div className="flex min-w-0 flex-col gap-1">
      {showLabel && (
        <label htmlFor={id} className="text-sm text-muted">
          {input.label}
        </label>
      )}
      <div className="flex items-center gap-2">
        {input.kind === "boolean" || input.kind === "enum" ? (
          <select {...shared} value={value} onChange={(e) => onChange(e.target.value)} className={cx(control, "pr-8")}>
            {input.nullable && <option value="">Not given</option>}
            {input.kind === "boolean" ? (
              <>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </>
            ) : (
              input.options?.map((o) => (
                <option key={o} value={o}>
                  {optionLabel(o)}
                </option>
              ))
            )}
          </select>
        ) : (
          <input
            {...shared}
            type="text"
            inputMode={input.kind === "number" ? "decimal" : undefined}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cx(control, input.kind === "number" ? "w-32 text-right tabular-nums" : "w-56 max-w-full")}
          />
        )}
        {input.unit && <span className="text-sm text-muted">{input.unit}</span>}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm font-semibold text-critical">
          {error}
        </p>
      )}
    </div>
  );
}

/** One saved value: label, value, where it came from, and the check that used it. */
function RecordRow({
  row,
  extraction,
  status,
  edited,
}: {
  row: FieldRow;
  extraction: Extraction | null;
  status?: CheckStatus;
  edited: boolean;
}) {
  const confidence = extraction?.fieldConfidence[row.key];
  const missing = row.value === null;
  const low = !edited && confidence !== undefined && confidence < LOW_CONFIDENCE;
  const from = fieldSource(row.key);
  const s = status && STATUS_ICON[status];
  return (
    <div
      data-field={row.key}
      className={cx(
        "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-0.5 border-b border-border py-2.5 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto]",
        !edited && (missing || low) && "-mx-2 bg-warning-tint px-2",
        !edited && status === "fail" && "-mx-2 bg-critical-tint px-2",
      )}
    >
      <dt className="text-sm text-muted">{row.label}</dt>
      <dd className="flex items-center gap-1.5 text-right sm:text-left">
        <span
          data-record-value={row.key}
          className={cx(
            "font-semibold",
            missing ? "text-warning" : status === "fail" && !edited ? "text-critical" : "text-ink",
          )}
        >
          {missing ? "Not found" : row.value}
        </span>
        {s && (
          <>
            <s.Icon aria-hidden className={cx("size-4", s.className)} strokeWidth={2.5} />
            <span className="sr-only"> (check {s.word})</span>
          </>
        )}
      </dd>
      <dd data-record-source={row.key} className="col-span-2 text-sm text-muted sm:col-span-1 sm:text-right">
        {edited ? (
          <span className="inline-flex items-center gap-1 font-semibold text-ink">
            <Pencil aria-hidden className="size-3.5" strokeWidth={2} />
            Edited by you
          </span>
        ) : (
          <>
            {from === "application" ? "Application form" : DOCUMENT_LABEL[from]}
            {confidence !== undefined && (
              <span className={cx(low && "font-semibold text-warning")}> · {Math.round(confidence * 100)}%</span>
            )}
          </>
        )}
      </dd>
    </div>
  );
}
