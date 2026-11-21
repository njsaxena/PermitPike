"use client";

import Link from "next/link";
import { useState } from "react";
import { JOB_TYPE_LABELS } from "@permitpike/contract";
import { clockTime, longDate } from "@/lib/format";
import { CheckSummary } from "./CheckRow";
import { hasChecks, MiniTrail, TRAIL_PROGRESS, type PermitSummary } from "./PermitCard";
import { RiskBadge } from "./RiskBadge";
import { StatusChip } from "./StatusChip";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableRow,
  TableSortHeader,
  type SortDirection,
} from "./Table";

/** One table row: the permit and, if the row links somewhere, its URL (worked out on the server). */
export interface PermitRow {
  permit: PermitSummary;
  href?: string;
}

type SortValue = number | string | null;

const RISK_RANK = { low: 1, med: 2, high: 3 } as const;

/** Sort keys for every column either table offers. Null sorts last in both directions. */
const VALUE: Record<string, (p: PermitSummary) => SortValue> = {
  permit: (p) => p.permitNumber,
  address: (p) => p.street,
  job: (p) => JOB_TYPE_LABELS[p.jobType],
  progress: (p) => TRAIL_PROGRESS[p.status].at,
  // Most failures first when descending, then most warnings.
  checks: (p) => (hasChecks(p) ? (p.checks.fail ?? 0) * 1000 + (p.checks.warn ?? 0) : null),
  risk: (p) => (p.risk ? RISK_RANK[p.risk] : null),
  filed: (p) => p.filed,
};

/** The direction a column starts in when you first click it. */
const FIRST_DIRECTION: Record<string, SortDirection> = {
  permit: "ascending",
  address: "ascending",
  job: "ascending",
  progress: "ascending",
  checks: "descending",
  risk: "descending",
  filed: "descending",
};

function compare(a: SortValue, b: SortValue) {
  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b, "en-US", { numeric: true, sensitivity: "base" });
  }
  return (a as number) - (b as number);
}

function useSort(rows: PermitRow[], initial: { key: string; direction: SortDirection }) {
  const [sort, setSort] = useState(initial);
  const value = VALUE[sort.key]!;
  // Array.prototype.sort is stable, so ties keep the order the rows came in.
  const sorted = [...rows].sort((x, y) => {
    const a = value(x.permit);
    const b = value(y.permit);
    if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1;
    return sort.direction === "ascending" ? compare(a, b) : compare(b, a);
  });
  function header(key: string) {
    return {
      direction: sort.key === key ? sort.direction : undefined,
      onSort: () =>
        setSort((s) =>
          s.key === key
            ? { key, direction: s.direction === "ascending" ? "descending" : "ascending" }
            : { key, direction: FIRST_DIRECTION[key]! },
        ),
    };
  }
  return { sorted, header };
}

function PermitLink({ row }: { row: PermitRow }) {
  return row.href ? (
    <Link href={row.href} className="pp-link">
      {row.permit.permitNumber}
    </Link>
  ) : (
    <>{row.permit.permitNumber}</>
  );
}

function FiledAt({ filed }: { filed: string }) {
  return (
    <time dateTime={filed.replace(" ", "T")}>
      {longDate(filed)}
      <span className="block text-sm text-muted">{clockTime(filed)}</span>
    </time>
  );
}

/** Open permits. Starts in progress order (the board's column order); every column sorts. */
export function OpenPermitTable({ rows, label }: { rows: PermitRow[]; label: string }) {
  const { sorted, header } = useSort(rows, { key: "progress", direction: "ascending" });
  return (
    <Table aria-label={label}>
      <TableHead>
        <TableRow>
          <TableSortHeader {...header("permit")}>Permit</TableSortHeader>
          <TableSortHeader {...header("address")}>Address</TableSortHeader>
          <TableSortHeader {...header("progress")}>Progress</TableSortHeader>
          <TableSortHeader {...header("checks")}>Checks</TableSortHeader>
          <TableSortHeader {...header("risk")}>Risk</TableSortHeader>
          <TableSortHeader {...header("filed")}>Filed</TableSortHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {sorted.length === 0 && <TableEmpty colSpan={6}>No open permits.</TableEmpty>}
        {sorted.map((row) => {
          const p = row.permit;
          return (
            <TableRow key={p.id} interactive={Boolean(row.href)}>
              <TableCell mono>
                <PermitLink row={row} />
                <span className="mt-1 block">
                  <StatusChip status={p.status} />
                </span>
              </TableCell>
              <TableCell className="min-w-44">
                {p.street}
                <span className="block text-sm text-muted">
                  {p.neighborhood} · {JOB_TYPE_LABELS[p.jobType]}
                </span>
              </TableCell>
              <TableCell className="min-w-48">
                <MiniTrail status={p.status} />
              </TableCell>
              <TableCell>
                {hasChecks(p) ? (
                  <CheckSummary counts={p.checks} variant="inline" className="flex-nowrap" />
                ) : (
                  <span className="text-sm whitespace-nowrap text-muted">Not run yet</span>
                )}
              </TableCell>
              <TableCell>
                {p.risk ? (
                  <RiskBadge level={p.risk} plain />
                ) : (
                  <span className="text-sm whitespace-nowrap text-muted">Not rated yet</span>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <FiledAt filed={p.filed} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/** Approved permits. Starts newest first. */
export function ApprovedPermitTable({ rows, label }: { rows: PermitRow[]; label: string }) {
  const { sorted, header } = useSort(rows, { key: "filed", direction: "descending" });
  return (
    <Table aria-label={label}>
      <TableHead>
        <TableRow>
          <TableSortHeader {...header("permit")}>Permit</TableSortHeader>
          <TableSortHeader {...header("address")}>Address</TableSortHeader>
          <TableSortHeader {...header("job")}>Job</TableSortHeader>
          <TableSortHeader {...header("filed")}>Filed</TableSortHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {sorted.map((row) => {
          const p = row.permit;
          return (
            <TableRow key={p.id} interactive={Boolean(row.href)}>
              <TableCell mono className="whitespace-nowrap">
                <PermitLink row={row} />
              </TableCell>
              <TableCell className="min-w-44">
                {p.street}
                <span className="block text-sm text-muted">{p.neighborhood}</span>
              </TableCell>
              <TableCell>{JOB_TYPE_LABELS[p.jobType]}</TableCell>
              <TableCell className="whitespace-nowrap">
                <FiledAt filed={p.filed} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
