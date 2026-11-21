import "server-only";
import { cookies } from "next/headers";
import type { ReviewerSession } from "@permitpike/contract";

/*
 * Reviewer session: an httpOnly cookie holding the reviewer's name, which goes on
 * every permit they sign. No passcode; this is a hackathon demo, not real access control.
 */

export const REVIEWER_COOKIE = "pp_reviewer";
const MAX_AGE_SECONDS = 12 * 60 * 60;
const MAX_NAME = 120;

export async function setReviewerCookie(session: ReviewerSession): Promise<void> {
  const jar = await cookies();
  jar.set(REVIEWER_COOKIE, encodeURIComponent(session.name.slice(0, MAX_NAME)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearReviewerCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(REVIEWER_COOKIE);
}

/** The signed-in reviewer, or null when there is no cookie. */
export async function getReviewer(): Promise<ReviewerSession | null> {
  const jar = await cookies();
  const raw = jar.get(REVIEWER_COOKIE)?.value;
  if (!raw) return null;
  try {
    const name = decodeURIComponent(raw).trim();
    return name ? { name: name.slice(0, MAX_NAME) } : null;
  } catch {
    return null;
  }
}
