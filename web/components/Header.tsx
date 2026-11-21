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
  // The homepage is a full-screen map with the logo in the middle; no header bar.
  if (path === "/") return null;
  const reviewer = path.startsWith("/review");
  const applicant = path.startsWith("/apply");
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
