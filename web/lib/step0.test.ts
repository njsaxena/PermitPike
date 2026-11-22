/**
 * Eversource Step 0 draft. Run: pnpm --filter @permitpike/web test
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Application, ApplicationDetail, HeatPumpPanelFields } from "@permitpike/contract";
import { MOCK_APPLICATIONS } from "@/mocks/applications";
import {
  NOT_PROVIDED,
  STEP0_DISCLAIMER,
  STEP0_TITLE,
  applicantProposesUpgrade,
  buildStep0Draft,
  parseStep0Text,
  splitStep0,
} from "./step0";

const PREPARED = new Date("2026-11-21T15:00:00.000Z");

function byJob(jobType: Application["jobType"]): ApplicationDetail {
  const found = MOCK_APPLICATIONS.find((d) => d.application.jobType === jobType);
  assert.ok(found, `no mock ${jobType}`);
  return found;
}

/** The mock heat pump job with the applicant's panel upgrade from 100 A to 200 A. */
function upgraded(): Application {
  const app = byJob("heat_pump_panel").application;
  const fields = app.extraction!.fields as HeatPumpPanelFields;
  return {
    ...app,
    extraction: {
      ...app.extraction!,
      fields: { ...fields, panelUpgrade: { proposedPanelRatingAmps: 200, proposedServiceAmps: 200 } },
    },
  };
}

const value = (d: ReturnType<typeof buildStep0Draft>, key: string) => d.fields.filter((f) => f.key === key).map((f) => f.value);

test("heat pump with a service upgrade: every field from the application", () => {
  const app = upgraded();
  const d = buildStep0Draft(app, null, PREPARED);
  assert.deepEqual(value(d, "address"), ["28 Brookside Ave, Boston, MA 02130"]);
  assert.deepEqual(value(d, "parcelId"), ["1102073000"]);
  assert.deepEqual(value(d, "existingServiceAmps"), ["100 A"]);
  assert.deepEqual(value(d, "serviceVoltage"), ["240 V"]);
  assert.deepEqual(value(d, "proposedServiceAmps"), ["200 A"]);
  // 18 A MCA x 240 V = 4,320 VA.
  assert.deepEqual(value(d, "newLoad"), ["Heat pump (Example HVAC Co. EX-24H), 4.32 kW"]);
  assert.deepEqual(value(d, "contractor"), ["Dana Ortiz (mock), Ortiz Electric (mock)"]);
  assert.deepEqual(value(d, "licenseNumber"), ["MOCK-A-1001"]);
  assert.deepEqual(value(d, "trackingCode"), ["PP-7K3Q-9M2X"]);
  assert.deepEqual(value(d, "preparedOn"), ["November 21, 2026"]);
});

test("without a load calc there are no total load lines", () => {
  const d = buildStep0Draft(upgraded(), undefined, PREPARED);
  assert.equal(value(d, "totalLoad").length, 0);
  assert.equal(value(d, "percentOfRating").length, 0);
  assert.doesNotMatch(d.text, /Total calculated load|Percent of service rating/);
});

test("with a load calc: total load and percent of rating", () => {
  const detail = byJob("heat_pump_panel");
  const calc = detail.application.recommendation!.loadCalc;
  assert.ok(calc, "the mock heat pump has a load calc");
  const d = buildStep0Draft(upgraded(), calc, PREPARED);
  assert.deepEqual(value(d, "totalLoad"), [
    `${Math.round(calc.totalCalculatedVA / 10) / 100} kW (${Math.round(calc.totalAmps)} A)`,
  ]);
  assert.deepEqual(value(d, "percentOfRating"), [`${Math.round(calc.percentOfRating)}% of ${calc.serviceAmps} A`]);
});

test("backup heat strips are their own load line", () => {
  const app = upgraded();
  const f = app.extraction!.fields as HeatPumpPanelFields;
  const withStrips: Application = {
    ...app,
    extraction: { ...app.extraction!, fields: { ...f, heatPump: { ...f.heatPump, backupHeatKW: 10 } } },
  };
  assert.deepEqual(value(buildStep0Draft(withStrips, null, PREPARED), "newLoad"), [
    "Heat pump (Example HVAC Co. EX-24H), 4.32 kW",
    "Backup heat strips (10 kW), 10 kW",
  ]);
});

test("no proposed service line when the job keeps the existing service", () => {
  const d = buildStep0Draft(byJob("heat_pump_panel").application, null, PREPARED);
  assert.equal(value(d, "proposedServiceAmps").length, 0);
});

test("battery: its output, not the 0 VA load-calc line", () => {
  const d = buildStep0Draft(byJob("home_battery").application, null, PREPARED);
  assert.deepEqual(value(d, "newLoad"), ["Home battery (Example Storage Co. HB-13), 5 kW output, 13.5 kWh"]);
});

test("missing values read Not provided", () => {
  const app = byJob("ev_charger").application;
  const bare: Application = { ...app, extraction: null, parcel: null, applicant: { ...app.applicant, company: null } };
  const d = buildStep0Draft(bare, null, PREPARED);
  for (const key of ["parcelId", "existingServiceAmps", "serviceVoltage", "newLoad"]) {
    assert.deepEqual(value(d, key), [NOT_PROVIDED], key);
  }
  assert.deepEqual(value(d, "contractor"), [app.applicant.name]);
});

test("text: title, the not-sent line, then one line per field", () => {
  const d = buildStep0Draft(upgraded(), null, PREPARED);
  const lines = d.text.split("\n");
  assert.equal(lines[0], STEP0_TITLE);
  assert.equal(lines[1], STEP0_DISCLAIMER);
  assert.match(STEP0_DISCLAIMER, /does not send anything to Eversource/);
  assert.equal(lines.length, 3 + d.fields.length);
  assert.ok(d.text.includes("Proposed service: 200 A"));
});

test("the applicant sees a draft only for their own proposed upgrade", () => {
  assert.equal(applicantProposesUpgrade(upgraded()), true);
  assert.equal(applicantProposesUpgrade(byJob("heat_pump_panel").application), false);
  // A battery gets an interconnection flag from the review, but no upgrade from the applicant.
  assert.equal(applicantProposesUpgrade(byJob("home_battery").application), false);
  assert.equal(applicantProposesUpgrade(byJob("ev_charger").application), false);
  // Same or smaller service is not an upgrade.
  const app = upgraded();
  const f = app.extraction!.fields as HeatPumpPanelFields;
  const same: Application = {
    ...app,
    extraction: { ...app.extraction!, fields: { ...f, panelUpgrade: { proposedPanelRatingAmps: 100, proposedServiceAmps: 100 } } },
  };
  assert.equal(applicantProposesUpgrade(same), false);
});

test("a draft attached to an official's message splits out and parses back", () => {
  const d = buildStep0Draft(upgraded(), null, PREPARED);
  const { message, draft } = splitStep0(`Approved with the panel upgrade.\n\n${d.text}`);
  assert.equal(message, "Approved with the panel upgrade.");
  assert.equal(draft, d.text);
  assert.deepEqual(parseStep0Text(draft!).fields.map(({ label, value }) => [label, value]), d.fields.map(({ label, value }) => [label, value]));
  assert.deepEqual(splitStep0("No draft here."), { message: "No draft here.", draft: null });
});
