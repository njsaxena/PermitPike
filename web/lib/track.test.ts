/**
 * The public /track view must never carry the city's review. Run: pnpm --filter @permitpike/web test
 * Builds the view from every mock permit, loaded with a recommendation, closure risk,
 * conditions and reviewer notes, and fails if any of those fields or their text appear.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { PublicTrackView, type ApplicationDetail } from "@permitpike/contract";
import { MOCK_APPLICATIONS } from "@/mocks/applications";
import { buildTrackView, streetNameOnly } from "./track";
import { newTrackingCode, normalizeTrackingCode } from "./tracking-code";

const FORBIDDEN_KEYS = [
  "recommendation",
  "checks",
  "confidence",
  "loadCalc",
  "closureRisk",
  "riskScore",
  "band",
  "reasons",
  "conditions",
  "note",
  "notes",
  "requestedFixes",
  "overriddenRuleIds",
  "summary",
  "decision",
  "utilityFlag",
  "inspectorChecklist",
  "extraction",
  "applicant",
  "applicantId",
  "licenseNumber",
  "files",
  "parcel",
  "actor",
  "estimatedProjectCost",
  "jobDescription",
];

const SECRET_NOTE = "Reviewer-only note: SECRET-NOTE-7731";
const SECRET_CONDITION = "Condition text SECRET-COND-4410";
const SECRET_REASON = "Closure reason SECRET-RISK-9902";

/** Every mock, with closure risk, an approve note and conditions added so there is something to leak. */
function loaded(): ApplicationDetail[] {
  return MOCK_APPLICATIONS.map((d) => ({
    ...d,
    application: {
      ...d.application,
      closureRisk: { riskScore: 0.81, band: "high", reasons: [SECRET_REASON], modelVersion: "test" },
      recommendation: d.application.recommendation && {
        ...d.application.recommendation,
        conditions: [SECRET_CONDITION],
      },
    },
    actions: d.actions.map((a) => (a.type === "approve" ? { ...a, note: SECRET_NOTE, conditions: [SECRET_CONDITION] } : a)),
  }));
}

function allKeys(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => allKeys(v, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      out.add(k);
      allKeys(v, out);
    }
  }
  return out;
}

/** Text the review produced, which must not show up anywhere in the public JSON. */
function privateText(d: ApplicationDetail): string[] {
  const rec = d.application.recommendation;
  const texts = [SECRET_NOTE, SECRET_CONDITION, SECRET_REASON, d.application.applicant.name, d.application.applicant.licenseNumber];
  if (rec) {
    texts.push(rec.summary, ...rec.conditions, ...rec.inspectorChecklist);
    for (const c of rec.checks) texts.push(c.message, c.citation);
    if (rec.utilityFlag) texts.push(rec.utilityFlag.reason, rec.utilityFlag.action);
  }
  for (const a of d.actions) if (a.type === "return") texts.push(...a.requestedFixes);
  return texts.filter((t) => t.length > 6);
}

test("public track view leaks none of the review", () => {
  for (const detail of loaded()) {
    const view = buildTrackView(detail, { queuedAt: null, aheadInQueue: 3 });
    const json = JSON.stringify(view);
    const keys = allKeys(JSON.parse(json));
    for (const key of FORBIDDEN_KEYS) {
      assert.ok(!keys.has(key), `${detail.application.id}: public view has forbidden field "${key}"`);
    }
    for (const text of privateText(detail)) {
      assert.ok(!json.includes(text), `${detail.application.id}: public view contains private text "${text.slice(0, 60)}"`);
    }
    assert.doesNotMatch(json, /\bAI\b|artificial|PermitPike recommends/i, "public copy must not mention AI");
    // No house number.
    assert.doesNotMatch(view.streetName, /^\d/);
  }
});

test("only the return reason comes through, and only when changes are requested", () => {
  for (const detail of loaded()) {
    const view = buildTrackView(detail, { queuedAt: null, aheadInQueue: 0 });
    const ret = detail.actions.filter((a) => a.type === "return").at(-1);
    if (detail.application.status === "returned") {
      assert.equal(view.status, "changes_requested");
      assert.equal(view.returnReason, ret?.reason);
      assert.equal(view.aheadInQueue, null);
    } else {
      assert.equal(view.returnReason, null);
    }
  }
});

test("both review stages read as the review queue, with a place in line", () => {
  const [hp] = loaded();
  for (const status of ["ai_review", "awaiting_official"] as const) {
    const detail = { ...hp!, application: { ...hp!.application, status, decidedAt: null }, actions: [] };
    const view = buildTrackView(detail, { queuedAt: "2026-11-21T09:00:05.000Z", aheadInQueue: 4 });
    assert.equal(view.status, "in_queue");
    assert.equal(view.statusLabel, "In the review queue");
    assert.equal(view.aheadInQueue, 4);
    assert.deepEqual(
      view.timeline.map((s) => [s.kind, s.at]),
      [
        ["received", hp!.application.submittedAt],
        ["in_queue", "2026-11-21T09:00:05.000Z"],
        ["decision", null],
      ],
    );
  }
});

test("the public schema rejects any field it doesn't list", () => {
  const view = buildTrackView(loaded()[1]!, { queuedAt: null, aheadInQueue: 0 });
  assert.equal(PublicTrackView.safeParse({ ...view, recommendation: {} }).success, false);
  assert.equal(PublicTrackView.safeParse({ ...view, closureRisk: null }).success, false);
});

test("street name drops the house number", () => {
  assert.equal(streetNameOnly("210 Dorchester St"), "Dorchester St");
  assert.equal(streetNameOnly("12-14 Pleasant St"), "Pleasant St");
  assert.equal(streetNameOnly("12A Main St"), "Main St");
  assert.equal(streetNameOnly("Monument Sq"), "Monument Sq");
});

test("tracking codes use the safe alphabet and read back from sloppy input", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 2000; i++) {
    const code = newTrackingCode();
    assert.match(code, /^PP-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    assert.doesNotMatch(code.slice(3), /[01IO]/);
    seen.add(code);
  }
  assert.equal(seen.size, 2000);
  assert.equal(normalizeTrackingCode(" pp 7k3q 9m2x "), "PP-7K3Q-9M2X");
  assert.equal(normalizeTrackingCode("7K3Q9M2X"), "PP-7K3Q-9M2X");
  assert.equal(normalizeTrackingCode("PP-7K3Q-9M20"), null);
  assert.equal(normalizeTrackingCode("nope"), null);
});
