import type { Application } from "@permitpike/contract";
import type { StatusChipStatus } from "@/components/ui/StatusChip";

/*
 * Approved permits are valid for APPROVAL_VALID_DAYS (contract). Expiry is read from
 * expiresAt at display time, so nothing has to run on a schedule: the stored status stays
 * "approved", and the official's decision stays exactly as signed.
 */

export function isExpired(app: Pick<Application, "expiresAt">, now = Date.now()): boolean {
  return app.expiresAt !== null && Date.parse(app.expiresAt) <= now;
}

/** The chip to show: "expired" once an approval has run out. */
export function displayStatus(app: Pick<Application, "status" | "expiresAt">, now = Date.now()): StatusChipStatus {
  return isExpired(app, now) ? "expired" : app.status;
}
