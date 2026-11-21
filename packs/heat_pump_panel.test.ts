import { describe, expect, it } from "vitest";
import { CheckResult } from "@permitpike/contract";
import type { HeatPumpPanelFields } from "@permitpike/contract";
import { parseConductor } from "./conductors";
import { heatPumpFields } from "./fixtures";
import { heatPumpPanelPack } from "./heat_pump_panel";

function check(ruleId: string, overrides: Partial<HeatPumpPanelFields> = {}) {
  const rule = heatPumpPanelPack.rules.find((r) => r.id === `heat_pump_panel.${ruleId}`);
  if (!rule) throw new Error(`no rule ${ruleId}`);
  return CheckResult.parse(rule.check(heatPumpFields(overrides)));
}

function expectFix(c: CheckResult) {
  expect(c.suggestedFix).toBeTruthy();
}

describe("heat_pump_panel pack", () => {
  it("every rule passes on the baseline application except GFCI, which it can't confirm", () => {
    const statuses = heatPumpPanelPack.rules.map((r) => [r.id, r.check(heatPumpFields()).status]);
    expect(Object.fromEntries(statuses)).toEqual({
      "heat_pump_panel.breaker_sizing": "pass",
      "heat_pump_panel.outdoor_setback": "pass",
      "heat_pump_panel.disconnect_within_sight": "pass",
      "heat_pump_panel.outdoor_gfci": "warn",
      "heat_pump_panel.conductor_ampacity": "pass",
      "heat_pump_panel.breaker_space_available": "pass",
      "heat_pump_panel.panel_working_clearance": "pass",
      "heat_pump_panel.panel_upgrade_matches_service": "pass",
    });
  });

  it("every rule has a citation", () => {
    for (const r of heatPumpPanelPack.rules) expect(r.citation.length).toBeGreaterThan(0);
  });

  describe("disconnect_within_sight", () => {
    it("passes when a disconnect is within sight", () => {
      expect(check("disconnect_within_sight").status).toBe("pass");
    });
    it("fails when the disconnect is not within sight", () => {
      const c = check("disconnect_within_sight", { disconnectWithinSight: false });
      expect(c.status).toBe("fail");
      expectFix(c);
    });
    it("warns when the documents don't show a disconnect", () => {
      expect(check("disconnect_within_sight", { disconnectWithinSight: null }).status).toBe("warn");
    });
  });

  describe("outdoor_gfci", () => {
    it("passes when the circuit is over 50 A, outside the 210.8(F) scope", () => {
      expect(check("outdoor_gfci", { proposedBreakerAmps: 60 }).status).toBe("pass");
    });
    it("flags a 50 A or smaller outdoor circuit because GFCI isn't shown", () => {
      const c = check("outdoor_gfci");
      expect(c.status).toBe("warn");
      expectFix(c);
    });
    it("passes when the documents show GFCI protection", () => {
      expect(check("outdoor_gfci", { gfciProtected: true }).status).toBe("pass");
    });
    it("fails when the documents say there is no GFCI protection", () => {
      const c = check("outdoor_gfci", { gfciProtected: false });
      expect(c.status).toBe("fail");
      expectFix(c);
    });
  });

  describe("conductor_ampacity", () => {
    it("passes 10 AWG copper on an 18 A MCA", () => {
      expect(check("conductor_ampacity").status).toBe("pass");
    });
    it("fails 14 AWG copper on an 28 A MCA", () => {
      const c = check("conductor_ampacity", {
        conductorAWG: "14 AWG",
        heatPump: { ...heatPumpFields().heatPump, mcaAmps: 28, mocpAmps: 40 },
        proposedBreakerAmps: 40,
      });
      expect(c.status).toBe("fail");
      expect(c.suggestedFix).toContain("10 AWG copper");
    });
    it("warns when it only works with 75 °C terminations", () => {
      const c = check("conductor_ampacity", { heatPump: { ...heatPumpFields().heatPump, mcaAmps: 33, mocpAmps: 35 }, proposedBreakerAmps: 35 });
      expect(c.status).toBe("warn");
      expect(c.suggestedFix).toContain("110.14(C)");
    });
    it("warns when the conductor size is missing or unreadable", () => {
      expect(check("conductor_ampacity", { conductorAWG: null }).status).toBe("warn");
      expect(check("conductor_ampacity", { conductorAWG: "thick wire" }).status).toBe("warn");
    });
  });

  describe("breaker_space_available", () => {
    it("passes with 2 free spaces for a 240 V breaker", () => {
      expect(check("breaker_space_available", { availableBreakerSpaces: 2 }).status).toBe("pass");
    });
    it("fails with 1 free space for a 240 V breaker", () => {
      const c = check("breaker_space_available", { availableBreakerSpaces: 1 });
      expect(c.status).toBe("fail");
      expectFix(c);
    });
    it("passes when the job replaces the panel", () => {
      const c = check("breaker_space_available", {
        availableBreakerSpaces: 0,
        panelUpgrade: { proposedPanelRatingAmps: 200, proposedServiceAmps: 200 },
      });
      expect(c.status).toBe("pass");
    });
  });

  describe("panel_working_clearance", () => {
    it("passes at 36 in", () => {
      expect(check("panel_working_clearance").status).toBe("pass");
    });
    it("fails at 24 in", () => {
      const c = check("panel_working_clearance", { panelWorkingClearanceIn: 24 });
      expect(c.status).toBe("fail");
      expectFix(c);
    });
    it("warns when not shown", () => {
      expect(check("panel_working_clearance", { panelWorkingClearanceIn: null }).status).toBe("warn");
    });
  });

  describe("panel_upgrade_matches_service", () => {
    it("passes a 200 A panel on a 200 A service", () => {
      const c = check("panel_upgrade_matches_service", {
        panelUpgrade: { proposedPanelRatingAmps: 200, proposedServiceAmps: 200 },
      });
      expect(c.status).toBe("pass");
    });
    it("fails a 150 A panel on a 200 A service", () => {
      const c = check("panel_upgrade_matches_service", {
        panelUpgrade: { proposedPanelRatingAmps: 150, proposedServiceAmps: 200 },
      });
      expect(c.status).toBe("fail");
      expectFix(c);
    });
    it("fails a service under 100 A", () => {
      const c = check("panel_upgrade_matches_service", {
        panelUpgrade: { proposedPanelRatingAmps: 100, proposedServiceAmps: 60 },
      });
      expect(c.status).toBe("fail");
    });
    it("passes when there is no upgrade", () => {
      expect(check("panel_upgrade_matches_service").status).toBe("pass");
    });
  });
});

describe("parseConductor", () => {
  it.each([
    ["8 AWG", { size: "8", material: "cu" }],
    ["#10 Cu THHN", { size: "10", material: "cu" }],
    ["10/2 NM-B w/g", { size: "10", material: "cu" }],
    ["2/0 AL", { size: "2/0", material: "al" }],
    ["10", { size: "10", material: "cu" }],
  ])("reads %s", (text, expected) => {
    expect(parseConductor(text)).toEqual(expected);
  });
  it("returns null for sizes not in the table", () => {
    expect(parseConductor("500 kcmil")).toBeNull();
  });
});
