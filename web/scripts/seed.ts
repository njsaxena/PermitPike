/**
 * pnpm seed (from the repo root): puts the 3 demo applications from web/mocks into
 * Tiger Data so the reviewer queue is never empty on stage.
 * Safe to rerun: it deletes earlier demo rows (applicants with MOCK- license numbers) first,
 * which also resets the demo to its starting state.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { inArray, like } from "drizzle-orm";
import { applicants, applications, applicationVersions, getDb, reviewerActions } from "@permitpike/db";
import { riskOf } from "../lib/risk";
import { MOCK_APPLICATIONS } from "../mocks/applications";

const rootEnv = resolve(process.cwd(), "../.env");
if (!process.env.DATABASE_URL && existsSync(rootEnv)) process.loadEnvFile(rootEnv);

async function main() {
  const db = getDb();

  await db.transaction(async (tx) => {
    const old = await tx.select({ id: applicants.id }).from(applicants).where(like(applicants.licenseNumber, "MOCK-%"));
    const oldIds = old.map((a) => a.id);
    if (oldIds.length > 0) {
      await tx.delete(applications).where(inArray(applications.applicantId, oldIds));
      await tx.delete(applicants).where(inArray(applicants.id, oldIds));
    }

    for (const detail of MOCK_APPLICATIONS) {
      const a = detail.application;
      const [applicant] = await tx
        .insert(applicants)
        .values({ name: a.applicant.name, company: a.applicant.company, licenseNumber: a.applicant.licenseNumber })
        .returning();
      if (!applicant) throw new Error("applicant insert failed");

      const risk = riskOf(a.recommendation);
      const [app] = await tx
        .insert(applications)
        .values({
          applicantId: applicant.id,
          jobType: a.jobType,
          address: a.address,
          parcel: a.parcel,
          parcelId: a.parcel?.parcelId ?? null,
          applicant: a.applicant,
          status: a.status,
          version: a.version,
          extraction: a.extraction,
          recommendation: a.recommendation,
          risk: risk ? { level: risk } : null,
          submittedAt: new Date(a.submittedAt),
          decidedAt: a.decidedAt ? new Date(a.decidedAt) : null,
        })
        .returning();
      if (!app) throw new Error("application insert failed");

      for (const v of detail.versions) {
        await tx.insert(applicationVersions).values({
          applicationId: app.id,
          version: v.version,
          files: v.files,
          extraction: v.extraction,
          recommendation: v.recommendation,
          note: v.note,
          submittedAt: new Date(v.submittedAt),
        });
      }

      for (const act of detail.actions) {
        await tx.insert(reviewerActions).values({
          applicationId: app.id,
          version: act.version,
          type: act.type,
          actorName: act.actor.name,
          reason: act.type === "approve" ? null : act.reason,
          note: act.type === "approve" ? act.note : null,
          finalDecision: act.type === "override" ? act.finalDecision : null,
          conditions: act.type === "approve" ? act.conditions : [],
          requestedFixes: act.type === "return" ? act.requestedFixes : [],
          overriddenRuleIds: act.type === "override" ? act.overriddenRuleIds : [],
          createdAt: new Date(act.timestamp),
        });
      }
      console.log(`seeded ${a.jobType} at ${a.address.street} (${a.status})`);
    }
  });
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
