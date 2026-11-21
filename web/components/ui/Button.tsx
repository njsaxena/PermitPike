import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { Loader } from "lucide-react";
import { cx } from "@/lib/cx";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "destructive";
export type ButtonSize = "md" | "sm";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * Shows a spinner and blocks clicks. Uses aria-disabled rather than disabled so the
   * button keeps focus while the request runs and screen readers still find it.
   */
  loading?: boolean;
  /** Optional lucide icon element rendered before the label. */
  icon?: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-ink bg-accent text-ink hov:bg-accent-hover",
  secondary: "border-border-strong bg-surface text-ink hov:border-ink hov:bg-sunken",
  quiet: "border-transparent bg-transparent text-ink hov:bg-accent-tint",
  destructive:
    "border-critical bg-critical text-surface hov:border-critical-hover hov:bg-critical-hover",
};

const SIZES: Record<ButtonSize, string> = {
  md: "h-10 px-4 text-base gap-2",
  sm: "h-8 px-3 text-sm gap-1.5",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  disabled,
  className,
  children,
  type = "button",
  onClick,
  ...rest
}: ButtonProps) {
  return (
    <button
      // While loading: no click handler and no form submit, but the button keeps focus.
      type={loading ? "button" : type}
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      onClick={loading ? undefined : onClick}
      className={cx(
        "inline-flex items-center justify-center border font-semibold whitespace-nowrap",
        "transition-[background-color,border-color,color,transform] duration-100 ease-out active:translate-y-px",
        SIZES[size],
        disabled
          ? cx(
              "cursor-not-allowed text-muted",
              variant === "quiet" ? "border-transparent" : "border-border bg-sunken",
            )
          : VARIANTS[variant],
        loading && "cursor-progress",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

/** A link that looks like a Button, for navigation ("File a permit"). */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex items-center justify-center border font-semibold whitespace-nowrap",
        "transition-[background-color,border-color,color] duration-100 ease-out",
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
