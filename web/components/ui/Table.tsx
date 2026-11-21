import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cx } from "@/lib/cx";

/* Horizontal rules only: no vertical lines, no zebra stripes, no outer box. */

export function Table({ className, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cx("w-full border-collapse text-left", className)} {...rest} />
    </div>
  );
}

export function TableHead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />;
}

export function TableBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

export function TableRow({
  className,
  interactive,
  ...rest
}: HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean; "data-demo"?: string }) {
  return (
    <tr
      className={cx("border-b border-border", interactive && "cursor-pointer hov:bg-hover", className)}
      {...rest}
    />
  );
}

export function TableHeader({
  className,
  numeric,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cx(
        "border-b border-ink py-2 pr-4 align-bottom whitespace-nowrap text-label font-semibold tracking-label text-muted uppercase last:pr-0",
        numeric && "text-right",
        className,
      )}
      {...rest}
    />
  );
}

export function TableCell({
  className,
  numeric,
  mono,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean; mono?: boolean }) {
  return (
    <td
      className={cx(
        "py-3 pr-4 align-top text-ink last:pr-0",
        (numeric || mono) && "font-mono text-sm whitespace-nowrap",
        numeric && "text-right tabular-nums",
        className,
      )}
      {...rest}
    />
  );
}

export type SortDirection = "ascending" | "descending";

/**
 * A column header that sorts. The whole label is a button; the arrow shows the active
 * column and its direction, and faint up-down chevrons mark the columns you can sort by.
 * Render inside a client component (it takes an onSort handler).
 */
export function TableSortHeader({
  children,
  direction,
  onSort,
  sortKey,
  firstDirection,
  numeric,
  className,
}: {
  children: string;
  /** Set on the column the table is sorted by; leave out on the others. */
  direction?: SortDirection;
  onSort: () => void;
  /** Column id and the direction a first click sorts in; written as data attributes for static copies of a page. */
  sortKey?: string;
  firstDirection?: SortDirection;
  numeric?: boolean;
  className?: string;
}) {
  const Icon = direction === "ascending" ? ArrowUp : direction === "descending" ? ArrowDown : ChevronsUpDown;
  return (
    <TableHeader
      aria-sort={direction ?? "none"}
      data-sort-key={sortKey}
      data-first-direction={firstDirection}
      numeric={numeric}
      className={className}
    >
      <button
        type="button"
        onClick={onSort}
        className={cx(
          "inline-flex items-center gap-1 py-0.5 uppercase transition-colors duration-100 ease-out hov:text-ink",
          direction ? "text-ink" : "text-muted",
          numeric && "flex-row-reverse",
        )}
      >
        {children}
        <Icon
          aria-hidden
          className={cx("size-3.5", direction ? "text-ink" : "text-border-strong")}
          strokeWidth={2.5}
        />
      </button>
    </TableHeader>
  );
}

/** Full-width row for "nothing here" states. */
export function TableEmpty({ colSpan, children }: { colSpan: number; children: string }) {
  return (
    <tr className="border-b border-border">
      <td colSpan={colSpan} className="py-6 text-muted">
        {children}
      </td>
    </tr>
  );
}
