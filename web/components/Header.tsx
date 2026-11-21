"use client";

import { useRole, type Role } from "@/lib/role";

const ROLES: { value: Role; label: string }[] = [
  { value: "applicant", label: "Applicant" },
  { value: "reviewer", label: "Reviewer" },
];

export function Header() {
  const { role, setRole } = useRole();

  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <span className="font-semibold">PermitPike</span>
      <div role="radiogroup" aria-label="View as" className="flex gap-1 rounded border p-1 text-sm">
        {ROLES.map((r) => (
          <button
            key={r.value}
            type="button"
            role="radio"
            aria-checked={role === r.value}
            onClick={() => setRole(r.value)}
            className={role === r.value ? "rounded bg-black px-3 py-1 text-white" : "px-3 py-1"}
          >
            {r.label}
          </button>
        ))}
      </div>
    </header>
  );
}
