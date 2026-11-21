import type { Application, CheckStatus } from "@permitpike/contract";
import type { PermitSummary } from "@/components/ui";
import { stamp, streetLine } from "./format";
import { riskOf } from "./risk";

/** What PermitCard and PermitQueue need, from a contract Application. */
export function toSummary(app: Application): PermitSummary {
  const checks: Partial<Record<CheckStatus, number>> = {};
  for (const c of app.recommendation?.checks ?? []) checks[c.status] = (checks[c.status] ?? 0) + 1;
  return {
    id: app.id,
    permitNumber: app.permitNumber,
    street: streetLine(app.address),
    neighborhood: app.address.neighborhood ?? "Boston",
    jobType: app.jobType,
    status: app.status,
    risk: riskOf(app.recommendation),
    filed: stamp(app.submittedAt),
    checks,
  };
}
