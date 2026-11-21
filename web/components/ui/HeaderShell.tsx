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
 * App header: the logo, plus who you entered as. There is no role toggle: people
 * choose a role on the entry screen, and `action` (a quiet "Sign out") takes
 * them back there. Without a role (on the entry screen) the right side is empty.
 */
export function HeaderShell({
  role,
  action,
  homeHref = "/",
  wide,
  className,
}: {
  role?: ShellRole | null;
  /** Where the logo goes: the home of the side you're on, e.g. "/apply". */
  homeHref?: string;
  /** Match the wider review workspace (--pp-workspace-width). */
  wide?: boolean;
  /** Shown after the role, e.g. "Sign out". */
  action?: ReactNode;
  className?: string;
}) {
  const r = role ? ROLE[role] : null;
  return (
    <header className={cx("border-b border-ink bg-surface", className)}>
      <div
        className={cx(
          "mx-auto flex h-16 items-center justify-between gap-4 px-4 sm:px-6",
          wide ? "max-w-[var(--pp-workspace-width)]" : "max-w-page",
        )}
      >
        <div className="flex min-w-0 items-center gap-4">
          <Link href={homeHref} aria-label="PermitPike home">
            <PermitPikeLogo size="sm" />
          </Link>
          <span aria-hidden className="hidden h-6 w-px bg-border lg:block" />
          <span className="hidden text-sm whitespace-nowrap text-muted lg:block">Boston&apos;s Fast Lane for Electrical Permits</span>
        </div>

        {r && (
          <div className="flex shrink-0 items-center gap-3">
            {/* On a phone the links need the room; the page itself says which side you are on. */}
            <span className={cx("items-center gap-1.5 text-sm font-semibold text-ink", action ? "hidden sm:flex" : "flex")}>
              <r.Icon aria-hidden className="size-4" strokeWidth={1.75} />
              <span className="sr-only">Signed in as </span>
              {r.label}
            </span>
            {action && (
              <>
                <span aria-hidden className="hidden h-5 w-px bg-border sm:block" />
                {action}
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
