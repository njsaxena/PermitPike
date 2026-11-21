import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader } from "lucide-react";
import { cx } from "@/lib/cx";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "destructive";
export type ButtonSize = "md" | "sm";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, keeps the label for width, and blocks clicks. */
  loading?: boolean;
  /** Optional lucide icon element rendered before the label. */
  icon?: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-accent bg-accent text-surface hov:border-accent-hover hov:bg-accent-hover",
  secondary: "border-border-strong bg-surface text-ink hov:border-ink hov:bg-sunken",
  quiet: "border-transparent bg-transparent text-accent hov:bg-accent-tint",
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
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex items-center justify-center rounded-md border font-semibold whitespace-nowrap",
        "transition-colors duration-100",
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
