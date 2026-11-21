"use client";

import { useEffect, useState } from "react";

/*
 * The applicant's id lives in localStorage so "My permits" survives reloads on a phone.
 * Only the id: applications themselves always come from the API.
 * Storage can throw (private browsing, blocked storage), so every access is wrapped,
 * with an in-memory fallback for the rest of the visit.
 */

const KEY = "permitpike.applicantId";
/** Fired on sign in and sign out, so the header and the page agree without a reload. */
const CHANGED = "permitpike:applicant";
let memory: string | null = null;

function announce() {
  window.dispatchEvent(new Event(CHANGED));
}

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
  announce();
}

/** Sign out on this device. Permits stay filed; entering the same license brings them back. */
export function clearApplicantId(): void {
  memory = null;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing stored.
  }
  announce();
}

/** `ready` is false until storage has been read, so pages don't flash the entry form. */
export function useApplicantId() {
  const [id, setId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const read = () => setId(readApplicantId());
    read();
    setReady(true);
    window.addEventListener(CHANGED, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(CHANGED, read);
      window.removeEventListener("storage", read);
    };
  }, []);
  return {
    id,
    ready,
    save(next: string) {
      saveApplicantId(next);
      setId(next);
    },
    clear() {
      clearApplicantId();
      setId(null);
    },
  };
}
