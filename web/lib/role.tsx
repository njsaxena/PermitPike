"use client";

/**
 * No auth: the header toggle switches between Applicant and Reviewer views.
 * Stored in localStorage so it survives reloads.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "applicant" | "reviewer";

const STORAGE_KEY = "permitpike.role";

const RoleContext = createContext<{ role: Role; setRole: (role: Role) => void } | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("applicant");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "applicant" || saved === "reviewer") setRoleState(saved);
  }, []);

  function setRole(next: Role) {
    setRoleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside <RoleProvider>");
  return ctx;
}
