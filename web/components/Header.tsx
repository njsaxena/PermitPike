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
        role && (
          <span className="flex items-center gap-3">
            {applicant && applicantId && (
              <>
                <Link
                  href="/apply/account"
                  aria-current={path === "/apply/account" ? "page" : undefined}
                  className="pp-link text-sm"
                >
                  Account
                </Link>
                <span aria-hidden className="h-5 w-px bg-border" />
              </>
            )}
            {reviewer && (
              <>
                <Link
                  href="/review/archive"
                  aria-current={path === "/review/archive" ? "page" : undefined}
                  className="pp-link text-sm"
                >
                  Archive
                </Link>
                <span aria-hidden className="h-5 w-px bg-border" />
              </>
            )}
            {signedIn ? (
              <button type="button" onClick={() => void signOut()} className="pp-link text-sm">
                Sign out
              </button>
            ) : (
              <Link href="/" className="pp-link text-sm">
                Leave
              </Link>
            )}
          </span>
        )
      }
    />
  );
}
