/**
 * run-checks + recommend on fictional heat pump extractions (no applicant data).
 * Run: pnpm --filter @permitpike/agent test
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { AgentReviewRequest, Extraction, Recommendation } from "@permitpike/contract";
import { buildRecommendation, confidenceFrom, decide } from "../src/review/recommend";
import { ReviewIncompleteError, runChecks } from "../src/review/run-checks";
import { usableExtraction } from "../src/review/request";

const fixture = (name: string) =>
  Extraction.parse(JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", `${name}.json`), "utf8")));

function review(extraction: Extraction) {
  const { checks, loadCalc, manualReviewRuleIds } = runChecks(extraction);
  const rec = buildRecommendation({ version: 1, extraction, checks, loadCalc, createdAt: "2026-11-21T15:00:00.000Z" });
  return { rec: Recommendation.parse(rec), manualReviewRuleIds };
}

test("clean pass: every rule passes, load fits, approve", () => {
  const { rec, manualReviewRuleIds } = review(fixture("hp-clean-pass"));
  assert.deepEqual(manualReviewRuleIds, []);
  assert.ok(rec.checks.every((c) => c.status === "pass"), JSON.stringify(rec.checks.map((c) => [c.ruleId, c.status])));
  assert.ok(rec.checks.every((c) => c.citation.length > 0));
  assert.ok(rec.checks.some((c) => c.ruleId === "shared.service_capacity"));
  assert.equal(rec.loadCalc.result, "fits");
  assert.equal(rec.decision, "approve");
  assert.deepEqual(rec.conditions, []);
  assert.equal(rec.utilityFlag, null);
  assert.equal(rec.confidence, 0.88);
  assert.ok(rec.inspectorChecklist.length > 0);
  assert.ok(rec.summary.includes("A licensed official makes the final call."));
});

test("verified fail: setback under the minimum returns for fixes", () => {
  const { rec } = review(fixture("hp-setback-fail"));
  const setback = rec.checks.find((c) => c.ruleId === "heat_pump_panel.outdoor_setback");
  assert.equal(setback?.status, "fail");
  assert.equal(rec.decision, "return_for_fixes");
  assert.deepEqual(rec.conditions, []);
});

test("missing field: rule is skipped for manual review, not run on the placeholder", () => {
  const { rec, manualReviewRuleIds } = review(fixture("hp-setback-missing"));
  assert.deepEqual(manualReviewRuleIds, ["heat_pump_panel.outdoor_setback"]);
  const setback = rec.checks.find((c) => c.ruleId === "heat_pump_panel.outdoor_setback");
  // The placeholder value (2 ft) would fail; skipping makes it a manual-review warn instead.
  assert.equal(setback?.status, "warn");
  assert.match(setback?.message ?? "", /Manual review/);
  assert.ok(setback?.citation);
  assert.equal(rec.decision, "approve_with_conditions");
  assert.equal(rec.conditions.length, 1);
});

test("missing load calc input stops the review instead of guessing", () => {
  const e = fixture("hp-clean-pass");
  assert.throws(() => runChecks({ ...e, missingFields: ["existingLoad.dwellingSqFt"] }), ReviewIncompleteError);
});

test("load over the service rating raises an Eversource service_upgrade flag", () => {
  const e = fixture("hp-clean-pass");
  const f = e.fields;
  assert.equal(f.jobType, "heat_pump_panel");
  if (f.jobType !== "heat_pump_panel") return;
  const fields = {
    ...f,
    heatPump: { ...f.heatPump, backupHeatKW: 15 },
    existingLoad: { ...f.existingLoad, fixedAppliancesVA: 16000 },
  };
  const { rec } = review({ ...e, fields });
  assert.equal(rec.loadCalc.result, "needs_upgrade");
  assert.equal(rec.utilityFlag?.utility, "Eversource");
  assert.equal(rec.utilityFlag?.kind, "service_upgrade");
});

test("decide: fail beats warn beats a utility flag", () => {
  const c = (status: "pass" | "warn" | "fail") => ({ ruleId: "x", title: "x", status, citation: "NEC 1", message: "", suggestedFix: null });
  assert.equal(decide([c("pass"), c("warn"), c("fail")], null), "return_for_fixes");
  assert.equal(decide([c("pass"), c("warn")], null), "approve_with_conditions");
  assert.equal(decide([c("pass")], null), "approve");
  assert.equal(confidenceFrom({ ...fixture("hp-clean-pass"), fieldConfidence: {} }), 0);
});

test("extract step uses the request's extraction only when it matches the job type", () => {
  const extraction = fixture("hp-clean-pass");
  const base = {
    applicationId: "app-fixture",
    version: 1,
    address: { street: "1 Example St", unit: null, neighborhood: null, city: "Boston" as const, state: "MA" as const, zip: "02101" },
    files: [],
  };
  const ok = AgentReviewRequest.safeParse({ ...base, jobType: "heat_pump_panel", extraction });
  assert.ok(ok.success);
  assert.equal(usableExtraction(ok.data), ok.data.extraction);
  const wrong = { ...base, jobType: "ev_charger" as const, extraction } as unknown as AgentReviewRequest;
  assert.equal(usableExtraction(wrong), null);
});
