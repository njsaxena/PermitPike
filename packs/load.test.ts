/**
 * Worked runLoadCalc examples: fields in, NEC 2026 load calc out.
 * Baseline home (fixtures.ts): 1,800 sq ft × 2 = 3,600 + small-appliance 3,000 + laundry 1,500
 * + fixed appliances 6,000 = 14,100 VA connected; 8,000 + 6,100 × 40% = 10,440 VA calculated.
 */
import { describe, expect, it } from "vitest";
import { LoadCalcResult } from "@permitpike/contract";
import { evChargerFields, heatPumpFields, homeBatteryFields } from "./fixtures";
import { reviewFields, runLoadCalc } from "./load";

describe("runLoadCalc", () => {
  it("fits: heat pump on a 200 A service", () => {
    // Heat pump 18 A MCA × 240 V = 4,320 × 50% = 2,160. 12,600 VA ÷ 240 = 52.5 A, 26.3%.
    const r = LoadCalcResult.parse(runLoadCalc(heatPumpFields()));
    expect(r.existingVA).toBe(10440);
    expect(r.addedVA).toBe(2160);
    expect(r.totalAmps).toBe(52.5);
    expect(r.percentOfRating).toBe(26.3);
    expect(r.result).toBe("fits");
    expect(r.check.citation).toContain("120.83");
  });

  it("tight: 48 A EV charger on a 100 A service", () => {
    // EV 48 A × 240 V = 11,520 × 80% = 9,216. 19,656 VA ÷ 240 = 81.9 A, over the 80% threshold.
    const f = evChargerFields({ existingServiceAmps: 100, charger: { ...evChargerFields().charger, outputAmps: 48 }, proposedBreakerAmps: 60 });
    const r = runLoadCalc(f);
    expect(r.addedVA).toBe(9216);
    expect(r.totalAmps).toBe(81.9);
    expect(r.result).toBe("tight");
    expect(r.check.status).toBe("warn");
    expect(r.loadManagementTip).toBe(true);
  });

  it("needs upgrade: large heat pump in an all-electric home on 100 A, fits once upgraded to 200 A", () => {
    // 3,600 + 3,000 + 1,500 + 20,000 fixed + 10,000 existing HVAC = 38,100 connected
    // → 8,000 + 30,100 × 40% = 20,040. Heat pump 40 A × 240 = 9,600 × 50% = 4,800.
    // 24,840 VA ÷ 240 = 103.5 A on 100 A.
    const existingLoad = { ...heatPumpFields().existingLoad, fixedAppliancesVA: 20000, existingHvacVA: 10000 };
    const heatPump = { ...heatPumpFields().heatPump, mcaAmps: 40, mocpAmps: 50 };
    const f = heatPumpFields({ existingServiceAmps: 100, existingPanelRatingAmps: 100, mainBreakerAmps: 100, existingLoad, heatPump });
    const r = runLoadCalc(f);
    expect(r.totalCalculatedVA).toBe(24840);
    expect(r.totalAmps).toBe(103.5);
    expect(r.result).toBe("needs_upgrade");
    expect(r.check.suggestedFix).toContain("125 A");

    const upgraded = runLoadCalc({ ...f, panelUpgrade: { proposedPanelRatingAmps: 200, proposedServiceAmps: 200 } });
    expect(upgraded.serviceAmps).toBe(200);
    expect(upgraded.percentOfRating).toBe(51.7);
    expect(upgraded.result).toBe("fits");
  });

  it("120.87 measured peak: 9 kW peak replaces the 120.83 existing-load calc", () => {
    // 9,000 VA × 125% = 11,250 + heat pump 4,320 at 100% = 15,570 VA ÷ 240 = 64.9 A on 100 A.
    const existingLoad = { ...heatPumpFields().existingLoad, measuredPeakDemandKW: 9 };
    const r = runLoadCalc(heatPumpFields({ existingServiceAmps: 100, existingLoad }));
    expect(r.existingVA).toBe(11250);
    expect(r.addedVA).toBe(4320);
    expect(r.totalAmps).toBe(64.9);
    expect(r.result).toBe("fits");
    expect(r.method).toBe("nec_120_87");
    expect(r.check.citation).toContain("120.87");
  });

  it("backup heat strips count as central resistance heat at 80%", () => {
    // Heat pump 2,160 + 10 kW strips × 80% = 8,000 → 10,160 added. 20,600 VA ÷ 240 = 85.8 A on 200 A.
    const heatPump = { ...heatPumpFields().heatPump, backupHeatKW: 10 };
    const r = runLoadCalc(heatPumpFields({ heatPump }));
    expect(r.addedVA).toBe(10160);
    expect(r.totalAmps).toBe(85.8);
    expect(r.result).toBe("fits");
  });

  it("a battery adds no load", () => {
    expect(runLoadCalc(homeBatteryFields()).addedVA).toBe(0);
  });
});

describe("reviewFields", () => {
  it("approves a clean EV charger", () => {
    const r = reviewFields(evChargerFields());
    expect(r.decision).toBe("approve");
    expect(r.checks[0]?.ruleId).toBe("shared.service_capacity");
  });
  it("returns an application with any failing check", () => {
    expect(reviewFields(heatPumpFields({ outdoorUnitSetbackFt: 2 })).decision).toBe("return_for_fixes");
  });
  it("adds conditions for a utility flag", () => {
    const r = reviewFields(homeBatteryFields({ interconnection: "load_side", backfeedBreakerAmps: 40, hasSolar: true }));
    expect(r.utilityFlag?.kind).toBe("interconnection");
    expect(r.decision).toBe("approve_with_conditions");
  });
});
