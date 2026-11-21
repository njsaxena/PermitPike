import { ArrowRight } from "lucide-react";
import { cx } from "@/lib/cx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./Table";

export interface DiffRow {
  label: string;
  /** Null when the field is new in this version. */
  before: string | null;
  /** Null when the field was removed in this version. */
  after: string | null;
  unit?: string;
}

function withUnit(v: string | null, unit?: string, side: "before" | "after" = "before") {
  if (v === null) return side === "before" ? "Not set" : "Removed";
  return unit ? `${v} ${unit}` : v;
}

/** Old vs new values, e.g. between application versions. Unchanged rows are dimmed. */
export function DiffView({
  rows,
  beforeLabel = "Before",
  afterLabel = "After",
  caption,
}: {
  rows: DiffRow[];
  beforeLabel?: string;
  afterLabel?: string;
  caption?: string;
}) {
  return (
    <Table>
      {caption && <caption className="sr-only">{caption}</caption>}
      <TableHead>
        <TableRow>
          <TableHeader>Field</TableHeader>
          <TableHeader>{beforeLabel}</TableHeader>
          <TableHeader className="w-8">
            <span className="sr-only">Change</span>
          </TableHeader>
          <TableHeader>{afterLabel}</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r) => {
          const changed = r.before !== r.after;
          return (
            <TableRow key={r.label}>
              <TableCell className={cx("text-sm font-semibold", !changed && "text-muted")}>
                {r.label}
              </TableCell>
              <TableCell mono>
                {changed ? (
                  <del className="bg-critical-tint px-1 text-critical decoration-1">
                    <span className="sr-only">was </span>
                    {withUnit(r.before, r.unit)}
                  </del>
                ) : (
                  <span className="text-muted">{withUnit(r.before, r.unit)}</span>
                )}
              </TableCell>
              <TableCell className="text-muted">
                {changed && <ArrowRight aria-hidden className="mt-0.5 size-4" strokeWidth={1.75} />}
              </TableCell>
              <TableCell mono>
                {changed ? (
                  <ins className="bg-positive-tint px-1 font-semibold text-positive no-underline">
                    <span className="sr-only">now </span>
                    {withUnit(r.after, r.unit, "after")}
                  </ins>
                ) : (
                  <span className="text-muted">
                    {withUnit(r.after, r.unit, "after")}
                    <span className="sr-only"> (unchanged)</span>
                  </span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
