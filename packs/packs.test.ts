/**
 * Pass and fail cases for every ev_charger and home_battery rule.
 * Run: pnpm --filter @permitpike/packs test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CheckResult, CleanEnergyTip, EvChargerFields, HomeBatteryFields, NewLoad } from "@permitpike/contract";
import type { CheckStatus } from "@permitpike/contract";
import { evChargerPack, parseCopperAWG } from "./ev_charger";
import { homeBatteryPack } from "./home_battery";
import { getPack, PACKS } from "./index";
import type { RulePack } from "./types";

const service = {
  serviceVoltage: 240,
  existingServiceAmps: 200,
  existingPanelRatingAmps: 200,
  mainBreakerAmps: 200,
  availableBreakerSpaces: 4,
  panelWorkingClearanceIn: 36,
  existingLoad: {
    dwellingSqFt: 1800,
    smallApplianceCircuits: 2,
    hasLaundryCircuit: true,
    fixedAppliancesVA: 8000,
    existingHvacVA: 0,
    measuredPeakDemandKW: null,
  },
};

/** 48 A hardwired charger in a garage on a 60 A breaker with 6 AWG copper: every rule passes. */
const ev: EvChargerFields = EvChargerFields.parse({
  ...service,
  jobType: "ev_charger",
  charger: { manufacturer: "Example EV Co.", model: "L2-48", outputAmps: 48, voltage: 240, connection: "hardwired" },
  proposedBreakerAmps: 60,
  conductorAWG: "6",
  installLocation: "garage",
  gfciProtected: null,
  outdoorRated: null,
  hasLoadManagement: false,
  setbackFt: null,
});

/** 13.5 kWh UL 9540 battery, load side, 200 A bus with 175 A main, on an exterior wall 5 ft from openings. */
const battery: HomeBatteryFields = HomeBatteryFields.parse({
  ...service,
  mainBreakerAmps: 175,
  jobType: "home_battery",
  battery: { manufacturer: "Example Storage", model: "ES-13", capacityKWh: 13.5, continuousOutputW: 5000, ul9540Listed: true },
  hasSolar: true,
  interconnection: "load_side",
  backfeedBreakerAmps: 40,
  installLocation: "exterior_wall",
  clearanceToOpeningsFt: 5,
});

function run<J extends "ev_charger" | "home_battery">(pack: RulePack<J>, ruleId: string, fields: Parameters<RulePack<J>["addedLoads"]>[0]) {
  const rule = pack.rules.find((r) => r.id === ruleId);
  assert.ok(rule, `rule ${ruleId} exists`);
  const r = rule.check(fields);
  CheckResult.parse(r);
  assert.equal(r.ruleId, ruleId);
  assert.ok(r.citation.length > 0, "every check carries a citation");
  return r;
}

function expectStatus(r: CheckResult, status: CheckStatus) {
  assert.equal(r.status, status, r.message);
  if (status === "pass") assert.equal(r.suggestedFix, null);
  else assert.ok(r.suggestedFix, "non-pass results carry a suggested fix");
}

describe("ev_charger rules", () => {
  it("baseline passes every rule", () => {
    for (const rule of evChargerPack.rules) expectStatus(rule.check(ev), "pass");
  });

  it("breaker_continuous_load: fails under 125% of output", () => {
    const r = run(evChargerPack, "ev_charger.breaker_continuous_load", { ...ev, proposedBreakerAmps: 50 });
    expectStatus(r, "fail");
    assert.match(r.suggestedFix ?? "", /60 A breaker/);
    assert.match(r.suggestedFix ?? "", /40 A or less/);
  });

  it("breaker_continuous_load: exactly 125% passes", () => {
    expectStatus(run(evChargerPack, "ev_charger.breaker_continuous_load", { ...ev, charger: { ...ev.charger, outputAmps: 32 }, proposedBreakerAmps: 40 }), "pass");
  });

  it("conductor_specified: warns when the size is missing", () => {
    expectStatus(run(evChargerPack, "ev_charger.conductor_specified", { ...ev, conductorAWG: null }), "warn");
  });

  it("conductor_specified: fails when the conductor is too small for the breaker", () => {
    const r = run(evChargerPack, "ev_charger.conductor_specified", { ...ev, conductorAWG: "8 AWG" });
    expectStatus(r, "fail");
    assert.match(r.suggestedFix ?? "", /6 AWG/);
  });

  it("conductor_specified: 10 AWG is capped at 30 A by 240.4(D)", () => {
    const r = run(evChargerPack, "ev_charger.conductor_specified", { ...ev, proposedBreakerAmps: 35, conductorAWG: "#10" });
    expectStatus(r, "fail");
  });

  it("conductor_specified: aluminum or unknown sizes go to manual review", () => {
    expectStatus(run(evChargerPack, "ev_charger.conductor_specified", { ...ev, conductorAWG: "4 AWG AL" }), "warn");
  });

  it("parseCopperAWG reads common spellings", () => {
    assert.equal(parseCopperAWG("6"), "6");
    assert.equal(parseCopperAWG("#6 AWG Cu"), "6");
    assert.equal(parseCopperAWG("1/0"), "1/0");
    assert.equal(parseCopperAWG("2 AWG aluminum"), null);
    assert.equal(parseCopperAWG("six"), null);
  });

  it("gfci: receptacle without GFCI fails, with GFCI passes", () => {
    const plug = { ...ev, charger: { ...ev.charger, connection: "receptacle" as const } };
    expectStatus(run(evChargerPack, "ev_charger.gfci", { ...plug, gfciProtected: false }), "fail");
    expectStatus(run(evChargerPack, "ev_charger.gfci", { ...plug, gfciProtected: null }), "warn");
    expectStatus(run(evChargerPack, "ev_charger.gfci", { ...plug, gfciProtected: true }), "pass");
  });

  it("gfci: outdoor hardwired on 50 A or less needs GFCI; over 50 A does not", () => {
    const outdoor = { ...ev, installLocation: "exterior_wall" as const, outdoorRated: true };
    const small = { ...outdoor, charger: { ...ev.charger, outputAmps: 40 }, proposedBreakerAmps: 50 };
    expectStatus(run(evChargerPack, "ev_charger.gfci", { ...small, gfciProtected: false }), "fail");
    expectStatus(run(evChargerPack, "ev_charger.gfci", { ...small, gfciProtected: true }), "pass");
    expectStatus(run(evChargerPack, "ev_charger.gfci", { ...outdoor, gfciProtected: false }), "pass");
  });

  it("outdoor_rating: exterior wall or pedestal needs an outdoor rating", () => {
    expectStatus(run(evChargerPack, "ev_charger.outdoor_rating", { ...ev, installLocation: "pedestal", outdoorRated: false }), "fail");
    expectStatus(run(evChargerPack, "ev_charger.outdoor_rating", { ...ev, installLocation: "exterior_wall", outdoorRated: null }), "warn");
    expectStatus(run(evChargerPack, "ev_charger.outdoor_rating", { ...ev, installLocation: "exterior_wall", outdoorRated: true }), "pass");
  });

  it("pedestal_setback: warns when a pedestal has no setback, passes with one", () => {
    const pedestal = { ...ev, installLocation: "pedestal" as const, outdoorRated: true };
    expectStatus(run(evChargerPack, "ev_charger.pedestal_setback", { ...pedestal, setbackFt: null }), "warn");
    expectStatus(run(evChargerPack, "ev_charger.pedestal_setback", { ...pedestal, setbackFt: 8 }), "pass");
  });

  it("addedLoads: nameplate VA as new EVSE", () => {
    const loads = evChargerPack.addedLoads(ev);
    assert.equal(loads.length, 1);
    const load = NewLoad.parse(loads[0]);
    assert.equal(load.kind, "evse");
    assert.equal(load.va, 48 * 240);
  });

  it("tip and checklist", () => {
    const tip = CleanEnergyTip.parse(evChargerPack.cleanEnergyTip(ev));
    assert.match(tip.url ?? "", /^https:\/\/www\.masssave\.com\//);
    assert.ok(evChargerPack.inspectorChecklist.length >= 4 && evChargerPack.inspectorChecklist.length <= 5);
    assert.equal(evChargerPack.utilityFlag(ev), null);
  });
});

describe("home_battery rules", () => {
  it("baseline passes every rule", () => {
    for (const rule of homeBatteryPack.rules) expectStatus(rule.check(battery), "pass");
  });

  it("listing: not listed fails, unknown warns", () => {
    expectStatus(run(homeBatteryPack, "home_battery.listing", { ...battery, battery: { ...battery.battery, ul9540Listed: false } }), "fail");
    expectStatus(run(homeBatteryPack, "home_battery.listing", { ...battery, battery: { ...battery.battery, ul9540Listed: null } }), "warn");
  });

  it("interconnection_breaker: over 120% of the busbar fails", () => {
    // 200 A main + 40 A = 240 A = exactly 120% of 200 A passes; 200 + 50 = 250 A fails.
    expectStatus(run(homeBatteryPack, "home_battery.interconnection_breaker", { ...battery, mainBreakerAmps: 200 }), "pass");
    const r = run(homeBatteryPack, "home_battery.interconnection_breaker", { ...battery, mainBreakerAmps: 200, backfeedBreakerAmps: 50 });
    expectStatus(r, "fail");
    assert.match(r.suggestedFix ?? "", /40 A/);
  });

  it("interconnection_breaker: missing breaker size warns; supply side and backup only pass", () => {
    expectStatus(run(homeBatteryPack, "home_battery.interconnection_breaker", { ...battery, backfeedBreakerAmps: null }), "warn");
    expectStatus(run(homeBatteryPack, "home_battery.interconnection_breaker", { ...battery, interconnection: "supply_side", backfeedBreakerAmps: null }), "warn");
    expectStatus(run(homeBatteryPack, "home_battery.interconnection_breaker", { ...battery, interconnection: "supply_side", mainBreakerAmps: 200, backfeedBreakerAmps: 60 }), "pass");
    expectStatus(run(homeBatteryPack, "home_battery.interconnection_breaker", { ...battery, interconnection: "backup_only", backfeedBreakerAmps: null }), "pass");
  });

  it("location_clearance: exterior wall under 3 ft fails, missing warns", () => {
    expectStatus(run(homeBatteryPack, "home_battery.location_clearance", { ...battery, clearanceToOpeningsFt: 2 }), "fail");
    expectStatus(run(homeBatteryPack, "home_battery.location_clearance", { ...battery, clearanceToOpeningsFt: null }), "warn");
    expectStatus(run(homeBatteryPack, "home_battery.location_clearance", { ...battery, clearanceToOpeningsFt: 3 }), "pass");
  });

  it("location_clearance: indoor locations pass, 'other' warns", () => {
    expectStatus(run(homeBatteryPack, "home_battery.location_clearance", { ...battery, installLocation: "basement", clearanceToOpeningsFt: null }), "pass");
    expectStatus(run(homeBatteryPack, "home_battery.location_clearance", { ...battery, installLocation: "other" }), "warn");
  });

  it("panel_space: load side needs two open spaces", () => {
    expectStatus(run(homeBatteryPack, "home_battery.panel_space", { ...battery, availableBreakerSpaces: 1 }), "fail");
    expectStatus(run(homeBatteryPack, "home_battery.panel_space", { ...battery, availableBreakerSpaces: 2 }), "pass");
    expectStatus(run(homeBatteryPack, "home_battery.panel_space", { ...battery, interconnection: "supply_side", availableBreakerSpaces: 0 }), "pass");
  });

  it("addedLoads: one 0 VA line", () => {
    const loads = homeBatteryPack.addedLoads(battery).map((l) => NewLoad.parse(l));
    assert.deepEqual(loads.map((l) => l.va), [0]);
  });

  it("utility flag only for grid-connected systems", () => {
    assert.equal(homeBatteryPack.utilityFlag(battery)?.kind, "interconnection");
    assert.equal(homeBatteryPack.utilityFlag({ ...battery, interconnection: "backup_only" }), null);
  });

  it("tip and checklist", () => {
    const tip = CleanEnergyTip.parse(homeBatteryPack.cleanEnergyTip(battery));
    assert.match(tip.program ?? "", /ConnectedSolutions/);
    assert.match(tip.url ?? "", /^https:\/\/www\.masssave\.com\//);
    assert.ok(homeBatteryPack.inspectorChecklist.length >= 4);
  });
});

describe("registry", () => {
  it("every job type has a pack, rule ids are unique and prefixed", () => {
    for (const [jobType, pack] of Object.entries(PACKS)) {
      assert.equal(getPack(pack.jobType), pack);
      assert.equal(pack.jobType, jobType);
      const ids = pack.rules.map((r) => r.id);
      assert.equal(new Set(ids).size, ids.length);
      for (const id of ids) assert.ok(id.startsWith(`${jobType}.`), id);
      for (const r of pack.rules) assert.ok(r.citation.length > 0);
    }
  });
});
