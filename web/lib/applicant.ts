"use client";

import { useEffect, useState } from "react";

/*
 * The applicant's id lives in localStorage so "My permits" survives reloads on a phone.
 * Only the id: applications themselves always come from the API.
 * Storage can throw (private browsing, blocked storage), so every access is wrapped,
 * with an in-memory fallback for the rest of the visit.
 */

const KEY = "permitpike.applicantId";
let memory: string | null = null;

export function readApplicantId(): string | null {
  try {
    return window.localStorage.getItem(KEY) ?? memory;
  } catch {
    return memory;
  }
}

export function saveApplicantId(id: string): void {
  memory = id;
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    // Keep the in-memory copy.
  }
}

/** `ready` is false until storage has been read, so pages don't flash the entry form. */
export function useApplicantId() {
  const [id, setId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setId(readApplicantId());
    setReady(true);
  }, []);
  return {
    id,
    ready,
    save(next: string) {
      saveApplicantId(next);
      setId(next);
    },
  };
}
