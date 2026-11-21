import "server-only";
import { cookies } from "next/headers";
import { APPLICANT_COOKIE } from "@/lib/applicant-cookie";

/** The applicant id this browser last signed in with, as mirrored from localStorage. Not access control. */
export async function getApplicantCookie(): Promise<string | null> {
  const raw = (await cookies()).get(APPLICANT_COOKIE)?.value;
  if (!raw) return null;
  try {
    return decodeURIComponent(raw).trim() || null;
  } catch {
    return null;
  }
}
