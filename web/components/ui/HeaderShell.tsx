import Link from "next/link";
import type { ReactNode } from "react";
import { HardHat, Landmark } from "lucide-react";
import { cx } from "@/lib/cx";
import { PermitPikeLogo } from "./Logo";

export type ShellRole = "applicant" | "reviewer";

const ROLE: Record<ShellRole, { label: string; Icon: typeof HardHat }> = {
  applicant: { label: "Applicant", Icon: HardHat },
  reviewer: { label: "Reviewer", Icon: Landmark },
};

/**
 * App header with the logo, a role when applicable, and optional navigation.
 */
export function HeaderShell({
  role,
  action,
  homeHref = "/",
  className,
}: {
  role?: ShellRole | null;
  /** Where the logo goes: the home of the side you're on, e.g. "/apply". */
  homeHref?: string;
  /** Navigation and actions, also available on public pages without a role. */
  action?: ReactNode;
  className?: string;
}) {
  const r = role ? ROLE[role] : null;
  return (
    <header className={cx("border-b border-ink bg-surface", className)}>
      <div
        className="mx-auto flex h-16 max-w-page items-center justify-between gap-3 px-4 max-[359px]:px-3 sm:gap-4 sm:px-6"
      >
        <div className="flex min-w-0 items-center gap-4">
          <Link href={homeHref} aria-label="PermitPike home">
            <PermitPikeLogo size="sm" />
          </Link>
          <span aria-hidden className="hidden h-6 w-px bg-border lg:block" />
          <span className="hidden text-sm whitespace-nowrap text-muted lg:block">Boston&apos;s Fast Lane for Electrical Permits</span>
        </div>

        {(r || action) && (
          <div className="flex shrink-0 items-center gap-3">
            {/* On a phone the links need the room; the page itself says which side you are on. */}
            {r && (
              <span className={cx("items-center gap-1.5 text-sm font-semibold text-ink", action ? "hidden sm:flex" : "flex")}>
                <r.Icon aria-hidden className="size-4" strokeWidth={1.75} />
                <span className="sr-only">Signed in as </span>
                {r.label}
              </span>
            )}
            {r && action && <span aria-hidden className="hidden h-5 w-px bg-border sm:block" />}
            {action}
          </div>
        )}
      </div>
    </header>
  );
}
