import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cx } from "@/lib/cx";
import { BostonDrawing, type BostonDrawingKind } from "./BostonDrawing";

export interface RoleChoiceCardProps {
  icon: LucideIcon;
  label: string;
  /** Boston line drawing across the top of the card. Use one: the icon-only card is a fallback. */
  drawing?: BostonDrawingKind;
  /** Renders a link when set, otherwise a button. */
  href?: string;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  /** Static state for /design samples, e.g. "hover" or "focus". */
  "data-demo"?: string;
  className?: string;
}

/** Large bordered choice for the entry screen: a drawing or icon, and one label. */
export function RoleChoiceCard({
  icon: Icon,
  label,
  drawing,
  href,
  onClick,
  selected,
  disabled,
  "data-demo": demo,
  className,
}: RoleChoiceCardProps) {
  const classes = cx(
    "group flex min-h-44 w-full flex-col items-stretch justify-between gap-4 border p-card text-left text-ink",
    "transition-colors duration-120 ease-out",
    disabled
      ? "cursor-not-allowed border-border bg-sunken text-muted opacity-70"
      : selected
        ? "border-ink bg-accent-tint"
        : "border-border-strong bg-surface hov:bg-hover",
    className,
  );
  const body = (
    <>
      {drawing ? (
        <BostonDrawing kind={drawing} className="max-h-32" />
      ) : (
        <Icon aria-hidden className="size-9" strokeWidth={1.5} />
      )}
      <span className="flex items-center gap-2 text-lg font-semibold">
        {drawing && <Icon aria-hidden className="size-5" strokeWidth={1.75} />}
        {label}
      </span>
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} data-demo={demo} className={classes}>
        {body}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected === undefined ? undefined : selected}
      data-demo={demo}
      className={classes}
    >
      {body}
    </button>
  );
}
