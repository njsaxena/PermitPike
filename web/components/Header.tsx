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
  const role = path.startsWith("/apply") ? "applicant" : path.startsWith("/review") ? "reviewer" : null;
  return (
    <HeaderShell
      role={role}
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
