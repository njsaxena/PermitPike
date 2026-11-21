"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeaderShell } from "@/components/ui";

/**
 * The role comes from where you are: /apply is the applicant side, /review the reviewer
 * side. It is a label only; "Leave" goes back to the entry screen. No role switch.
 */
export function Header() {
  const path = usePathname();
  // The portal demo on /design/portal is the reviewer side too.
  const reviewer = path.startsWith("/review") || path.startsWith("/design/portal");
  // …and the applicant demo on /design/applicant is the applicant side.
  const applicant = path.startsWith("/apply") || path.startsWith("/design/applicant");
  const role = applicant ? "applicant" : reviewer ? "reviewer" : null;
  return (
    <HeaderShell
      role={role}
      // One permit open for review uses the wider workspace.
      wide={/^\/(review|design\/portal)\/[^/]+/.test(path)}
      action={
        role && (
          <Link href="/" className="pp-link text-sm">
            Leave
          </Link>
        )
      }
    />
  );
}
