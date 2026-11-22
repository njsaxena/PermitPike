"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HeaderShell } from "@/components/ui";
import { clearApplicantId, useApplicantId } from "@/lib/applicant";

/**
 * The role comes from where you are: /apply is the applicant side, /review the reviewer
 * side. The logo goes to that side's home (your permits, or the queue). "Sign out" ends the
 * session and goes back to the entry screen. No role switch.
 */
export function Header() {
  const path = usePathname();
  const router = useRouter();
  const { id: applicantId } = useApplicantId();
  // The homepage is a full-screen map with the logo in the middle; no header bar.
  if (path === "/") return null;
  const reviewer = path.startsWith("/review");
  const applicant = path.startsWith("/apply");
  const role = applicant ? "applicant" : reviewer ? "reviewer" : null;
  // An applicant on the entry form hasn't signed in yet, so there is nothing to sign out of.
  const signedIn = reviewer || (applicant && Boolean(applicantId));

  async function signOut() {
    if (reviewer) await fetch("/api/reviewer/session", { method: "DELETE" }).catch(() => null);
    else clearApplicantId();
    router.push("/");
    router.refresh();
  }

  return (
    <HeaderShell
      role={role}
      homeHref={applicant ? "/apply" : reviewer ? "/review" : "/"}
      action={
        <nav aria-label="Main" className="flex items-center gap-2.5 text-sm whitespace-nowrap max-[359px]:gap-2 max-[359px]:text-xs sm:gap-3">
          <Link
            href={reviewer ? "/archive?from=review" : "/archive"}
            aria-current={path === "/archive" ? "page" : undefined}
            className="pp-link underline-offset-4 aria-[current=page]:underline"
          >
            Archive
          </Link>
          {applicant && applicantId && (
            <Link href="/apply/account" aria-current={path === "/apply/account" ? "page" : undefined} className="pp-link">
              Account
            </Link>
          )}
          {role && (
            <>
              <span aria-hidden className="hidden h-5 w-px bg-border sm:block" />
              {signedIn ? (
                <button type="button" onClick={() => void signOut()} className="pp-link">
                  Sign out
                </button>
              ) : (
                <Link href="/" className="pp-link">
                  Leave
                </Link>
              )}
            </>
          )}
        </nav>
      }
    />
  );
}
