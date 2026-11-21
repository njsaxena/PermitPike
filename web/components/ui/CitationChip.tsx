import { cx } from "@/lib/cx";

/** Code citation in mono, e.g. "NEC 220.83". Every CheckResult carries one. */
export function CitationChip({ citation, className }: { citation: string; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center rounded-sm border border-border bg-sunken px-1.5 font-mono text-sm whitespace-nowrap text-ink",
        className,
      )}
    >
      {citation}
    </span>
  );
}
