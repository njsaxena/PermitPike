/**
 * Worked examples for the NEC 2026 120.83 existing dwelling calculation.
 * Each test spells out the arithmetic so a reviewer can check it by hand.
 *
 * Table 120.83: first 8,000 VA of existing + new load at 100%, remainder of existing
 * at 40%, new EVSE at 80%, new central resistance heat at 80%, all other new loads at 50%.
 */
import { describe, expect, it } from "vitest";
import { LoadCalcResult } from "@permitpike/contract";
import type { ExistingAppliance, LoadCalcInput, NewLoad } from "@permitpike/contract";
import { calculateLoad, LoadCalcInputError } from "./index";

// --- Homes ------------------------------------------------------------------

/**
 * Small all-electric home, 100 A service.
 * 1,500 sq ft × 2 = 3,000 + small-appliance 3,000 + laundry 1,500 + range 12,000
 * + dryer 5,000 + water heater 4,500 + baseboard 10,000 = 39,000 VA connected.
 * Calculated: 8,000 + 31,000 × 40% = 20,400 VA (85 A).
 */
const smallElectricHome: LoadCalcInput["home"] = {
  squareFeet: 1500,
  existingAppliances: [
    { name: "Range", watts: 12000, isHeatingOrCooling: false },
    { name: "Dryer", watts: 5000, isHeatingOrCooling: false },
    { name: "Water heater", watts: 4500, isHeatingOrCooling: false },
    { name: "Electric baseboard", watts: 10000, isHeatingOrCooling: true, hvacMode: "heating" },
  ],
};

/**
 * Larger all-electric home, 200 A service, with central AC and baseboard heat.
 * Heating (15,000 VA baseboard) beats cooling (24 A × 240 V = 5,760 VA AC): AC omitted.
 * 2,400 sq ft × 2 = 4,800 + 3,000 + 1,500 + range 12,000 + dryer 5,000
 * + water heater 18.75 A × 240 V = 4,500 + dishwasher 1,200 + hot tub 7,500
 * + baseboard 15,000 = 54,500 VA connected.
 * Calculated: 8,000 + 46,500 × 40% = 26,600 VA (110.8 A).
 */
const largeElectricHome: LoadCalcInput["home"] = {
  squareFeet: 2400,
  smallApplianceCircuits: 2,
  laundryCircuits: 1,
  existingAppliances: [
    { name: "Range", watts: 12000, isHeatingOrCooling: false },
    { name: "Dryer", watts: 5000, isHeatingOrCooling: false },
    { name: "Water heater", amps: 18.75, volts: 240, isHeatingOrCooling: false },
    { name: "Dishwasher", watts: 1200, isHeatingOrCooling: false },
    { name: "Hot tub", watts: 7500, isHeatingOrCooling: false },
    { name: "Electric baseboard", watts: 15000, isHeatingOrCooling: true, hvacMode: "heating" },
    { name: "Central AC", amps: 24, volts: 240, isHeatingOrCooling: true, hvacMode: "cooling" },
  ],
};

/**
 * Gas-heat home, 100 A service.
 * 1,400 sq ft × 2 = 2,800 + 3,000 + 1,500 + range 12,000 + dryer 5,000
 * + dishwasher 1,200 + central AC 20 A × 240 V = 4,800 = 30,300 VA connected.
 * Calculated: 8,000 + 22,300 × 40% = 16,920 VA (70.5 A).
 */
const gasHeatHome: LoadCalcInput["home"] = {
  squareFeet: 1400,
  existingAppliances: [
    { name: "Range", watts: 12000, isHeatingOrCooling: false },
    { name: "Dryer", watts: 5000, isHeatingOrCooling: false },
    { name: "Dishwasher", watts: 1200, isHeatingOrCooling: false },
    { name: "Central AC", amps: 20, volts: 240, isHeatingOrCooling: true, hvacMode: "cooling" },
  ],
};

// --- New loads (va as the rule packs compute it) -----------------------------

/** heat_pump_panel addedLoad: MCA × voltage. */
function heatPump(mcaAmps: number, voltage = 240): NewLoad {
  return {
    source: "heat_pump_panel",
    name: "Heat pump",
    va: mcaAmps * voltage,
    kind: "other",
    isHeatingOrCooling: true,
    hvacMode: "both",
  };
}

/** ev_charger addedLoad: required breaker × 0.8 × voltage. */
function evCharger(breakerAmps: number, voltage = 240): NewLoad {
  return {
    source: "ev_charger",
    name: "EV charger",
    va: breakerAmps * 0.8 * voltage,
    kind: "evse",
    isHeatingOrCooling: false,
  };
}

function expectValidShape(result: LoadCalcResult) {
  expect(LoadCalcResult.parse(result)).toEqual(result);
  for (const step of result.steps) expect(step.citation.length).toBeGreaterThan(0);
  expect(result.check.citation).toContain("120.83");
}

// --- Worked examples -----------------------------------------------------------

describe("calculateLoad", () => {
  it("100 A home + heat pump: needs a service upgrade", () => {
    // Heat pump: 35 A MCA × 240 V = 8,400 VA × 50% = 4,200 VA.
    // Total 20,400 + 4,200 = 24,600 VA ÷ 240 V = 102.5 A on 100 A.
    const r = calculateLoad({
      service: { ratingAmps: 100, voltage: 240 },
      home: smallElectricHome,
      newLoads: [heatPump(35)],
    });

    expect(r.existingVA).toBe(20400);
    expect(r.addedVA).toBe(4200);
    expect(r.totalCalculatedVA).toBe(24600);
    expect(r.totalAmps).toBe(102.5);
    expect(r.percentOfRating).toBe(102.5);
    expect(r.result).toBe("needs_upgrade");
    expect(r.utilityLikely).toBe(true);
    // A heat pump isn't a load you can shed, so no load management tip.
    expect(r.loadManagementTip).toBe(false);
    expect(r.check.status).toBe("fail");
    expect(r.check.suggestedFix).toContain("at least 103 A (next common size: 125 A)");
    expectValidShape(r);
  });

  it("200 A home + heat pump: fits", () => {
    // Heat pump: 30 A × 240 V = 7,200 VA × 50% = 3,600 VA.
    // Total 26,600 + 3,600 = 30,200 VA ÷ 240 V = 125.8 A, 62.9% of 200 A.
    const r = calculateLoad({
      service: { ratingAmps: 200 },
      home: largeElectricHome,
      newLoads: [heatPump(30)],
    });

    expect(r.existingVA).toBe(26600);
    expect(r.addedVA).toBe(3600);
    expect(r.totalCalculatedVA).toBe(30200);
    expect(r.totalAmps).toBe(125.8);
    expect(r.percentOfRating).toBe(62.9);
    expect(r.result).toBe("fits");
    expect(r.utilityLikely).toBe(false);
    expect(r.loadManagementTip).toBe(false);
    expect(r.check.status).toBe("pass");
    expect(r.check.suggestedFix).toBeNull();

    // Only the larger of heating vs cooling counts: the AC is shown but omitted.
    const ac = r.steps.find((s) => s.label.startsWith("Central AC"));
    expect(ac).toMatchObject({ va: 0 });
    expect(ac?.label).toContain("5,760 VA omitted");
    expect(ac?.citation).toBe("NEC 2026 120.83");
    expect(r.steps.find((s) => s.label === "Existing connected load")?.va).toBe(54500);
    expectValidShape(r);
  });

  it("200 A home + heat pump + EV charger: tight", () => {
    // EV charger: 60 A breaker × 0.8 × 240 V = 11,520 VA × 80% = 9,216 VA.
    // Total 26,600 + 3,600 + 9,216 = 39,416 VA ÷ 240 V = 164.2 A, 82.1% of 200 A.
    const r = calculateLoad({
      service: { ratingAmps: 200, voltage: 240 },
      home: largeElectricHome,
      newLoads: [heatPump(30), evCharger(60)],
    });

    expect(r.addedVA).toBe(12816);
    expect(r.totalCalculatedVA).toBe(39416);
    expect(r.totalAmps).toBe(164.2);
    expect(r.percentOfRating).toBe(82.1);
    expect(r.result).toBe("tight");
    expect(r.utilityLikely).toBe(false);
    expect(r.loadManagementTip).toBe(true);
    expect(r.check.status).toBe("warn");
    expect(r.check.message).toContain("not a code limit");
    expect(r.steps.find((s) => s.label.startsWith("EV charger"))).toMatchObject({ va: 9216 });
    expectValidShape(r);
  });

  it("100 A home + EV charger: load management tip shown instead of only an upgrade", () => {
    // EV charger: 11,520 VA × 80% = 9,216 VA. Total 16,920 + 9,216 = 26,136 VA = 108.9 A.
    // Capping the charger leaves 16,920 VA = 70.5 A, within 100 A.
    const r = calculateLoad({
      service: { ratingAmps: 100 },
      home: gasHeatHome,
      newLoads: [evCharger(60)],
    });

    expect(r.existingVA).toBe(16920);
    expect(r.totalCalculatedVA).toBe(26136);
    expect(r.totalAmps).toBe(108.9);
    expect(r.result).toBe("needs_upgrade");
    expect(r.utilityLikely).toBe(true);
    expect(r.loadManagementTip).toBe(true);
    expect(r.check.status).toBe("fail");
    expect(r.check.suggestedFix).toMatch(/^A listed power control system that caps EV charger \(NEC 2026 120\.7/);
    expect(r.check.suggestedFix).toContain("Otherwise: Upgrade the service to at least 109 A");
    expectValidShape(r);
  });

  it("missing square footage: throws a clear error", () => {
    const input = { service: { ratingAmps: 100 }, home: { ...gasHeatHome, squareFeet: null }, newLoads: [] };
    expect(() => calculateLoad(input)).toThrow(LoadCalcInputError);
    expect(() => calculateLoad(input)).toThrow(/Square footage is missing.*home\.squareFeet/);

    const omitted = { ...input, home: { existingAppliances: [] } } as unknown as LoadCalcInput;
    expect(() => calculateLoad(omitted)).toThrow(/Square footage is missing/);
  });

  it("battery adds no continuous load", () => {
    // home_battery addedLoad is 0 VA: it charges from solar and adds no continuous load.
    const r = calculateLoad({
      service: { ratingAmps: 200 },
      home: largeElectricHome,
      newLoads: [
        { source: "home_battery", name: "Home battery", va: 0, kind: "other", isHeatingOrCooling: false },
      ],
    });

    expect(r.addedVA).toBe(0);
    expect(r.totalCalculatedVA).toBe(r.existingVA);
    expect(r.totalCalculatedVA).toBe(26600);
    expect(r.totalAmps).toBe(110.8);
    expect(r.result).toBe("fits");
    expect(r.loadManagementTip).toBe(false);
    expect(r.steps.find((s) => s.label.startsWith("Home battery"))).toMatchObject({ va: 0 });
    expectValidShape(r);
  });
});

describe("calculateLoad edge cases", () => {
  it("shares unused first-tier VA with new loads, lowest factor first", () => {
    // Existing: 500 sq ft × 2 = 1,000 + 3,000 + 1,500 = 5,500 VA, all at 100%. 2,500 VA of tier left.
    // Heat pump (50%) takes it: 2,500 at 100% + 2,300 × 50% = 3,650 VA.
    // EV (80%): 9,600 × 80% = 7,680 VA. Total 5,500 + 11,330 = 16,830 VA = 70.1 A.
    const r = calculateLoad({
      service: { ratingAmps: 100 },
      home: { squareFeet: 500, existingAppliances: [] },
      newLoads: [evCharger(50), heatPump(20)],
    });

    expect(r.existingVA).toBe(5500);
    expect(r.addedVA).toBe(11330);
    expect(r.totalAmps).toBe(70.1);
    expect(r.result).toBe("fits");
    expect(r.steps.find((s) => s.label.startsWith("Heat pump"))?.label).toContain("2,500 VA at 100%");
  });

  it("tight threshold is a setting, not a code rule", () => {
    const input: LoadCalcInput = {
      service: { ratingAmps: 200 },
      home: largeElectricHome,
      newLoads: [heatPump(30), evCharger(60)],
    };
    expect(calculateLoad(input).result).toBe("tight");
    expect(calculateLoad(input, { tightThresholdPercent: 85 }).result).toBe("fits");
    const thresholdStep = calculateLoad(input).steps.at(-1);
    expect(thresholdStep?.citation).toBe("PermitPike setting (not a code rule)");
  });

  it("rejects an appliance with neither watts nor amps and volts", () => {
    const bad = { name: "Mystery load", isHeatingOrCooling: false } as ExistingAppliance;
    expect(() =>
      calculateLoad({
        service: { ratingAmps: 100 },
        home: { squareFeet: 1000, existingAppliances: [bad] },
        newLoads: [],
      }),
    ).toThrow(/Give watts, or both amps and volts/);
  });
});
