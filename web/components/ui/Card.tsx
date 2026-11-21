import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** 12px uppercase label at the top-left. */
  label?: string;
  /** Right side of the header row, e.g. a StatusChip or a quiet Button. */
  actions?: ReactNode;
  /** Ruled footer row. */
  footer?: ReactNode;
  /** Selected cards get an ink border on a dome-gold tint. */
  selected?: boolean;
}

export function Card({ label, actions, footer, selected, className, children, ...rest }: CardProps) {
  return (
    <section
      className={cx(
        "border",
        selected ? "border-ink bg-accent-tint" : "border-border bg-surface",
        className,
      )}
      {...rest}
    >
      {(label || actions) && (
        <header className="flex min-h-14 items-center justify-between gap-4 border-b border-border px-card py-3">
          {label && <h3 className="pp-label">{label}</h3>}
          {actions}
        </header>
      )}
      <div className="p-card">{children}</div>
      {footer && <footer className="border-t border-border px-card py-3">{footer}</footer>}
    </section>
  );
}
