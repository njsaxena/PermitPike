/**
 * Rule pack: heat pump install, optionally with a panel/service upgrade.
 *
 * Status: 2 rules stubbed, the rest TODO (see bottom of `rules`).
 * Every citation must be checked against NEC 2023 + 527 CMR 12 and the Boston Zoning
 * Code before the demo. Anything still marked VERIFY is unconfirmed.
 */
import { HeatPumpPanelFields } from "@permitpike/contract";
import type { FieldsFor, NewLoad } from "@permitpike/contract";
import { result, type Rule, type RulePack } from "./types";

type Fields = FieldsFor<"heat_pump_panel">;

/** VERIFY: Boston zoning setback for outdoor mechanical equipment, and its section. */
export const OUTDOOR_UNIT_MIN_SETBACK_FT = 5;

const breakerSizing: Rule<"heat_pump_panel"> = {
  id: "heat_pump_panel.breaker_sizing",
  title: "Breaker matches heat pump nameplate",
  citation: "NEC 440.22",
  check(f) {
    const { mcaAmps, mocpAmps } = f.heatPump;
    if (f.proposedBreakerAmps > mocpAmps) {
      return result(
        this,
        "fail",
        `Proposed ${f.proposedBreakerAmps} A breaker exceeds the nameplate MOCP of ${mocpAmps} A.`,
        `Use a breaker no larger than ${mocpAmps} A.`,
      );
    }
    if (f.proposedBreakerAmps < mcaAmps) {
      return result(
        this,
        "fail",
        `Proposed ${f.proposedBreakerAmps} A breaker is below the nameplate MCA of ${mcaAmps} A.`,
        `Use a breaker between ${mcaAmps} A and ${mocpAmps} A.`,
      );
    }
    return result(
      this,
      "pass",
      `${f.proposedBreakerAmps} A breaker is within MCA ${mcaAmps} A / MOCP ${mocpAmps} A.`,
    );
  },
};

const outdoorSetback: Rule<"heat_pump_panel"> = {
  id: "heat_pump_panel.outdoor_setback",
  title: "Outdoor unit setback from property line",
  citation: "Boston Zoning Code Art. 10", // VERIFY section
  check(f) {
    if (f.outdoorUnitSetbackFt === null) {
      return result(
        this,
        "warn",
        "Site plan does not show the outdoor unit's distance to the property line.",
        "Add the outdoor unit location and setback dimension to the site plan.",
      );
    }
    if (f.outdoorUnitSetbackFt < OUTDOOR_UNIT_MIN_SETBACK_FT) {
      return result(
        this,
        "fail",
        `Outdoor unit is ${f.outdoorUnitSetbackFt} ft from the property line; minimum is ${OUTDOOR_UNIT_MIN_SETBACK_FT} ft.`,
        `Relocate the outdoor unit at least ${OUTDOOR_UNIT_MIN_SETBACK_FT} ft from the property line and update the site plan.`,
      );
    }
    return result(
      this,
      "pass",
      `Outdoor unit is ${f.outdoorUnitSetbackFt} ft from the property line (min ${OUTDOOR_UNIT_MIN_SETBACK_FT} ft).`,
    );
  },
};

export const heatPumpPanelPack: RulePack<"heat_pump_panel"> = {
  jobType: "heat_pump_panel",
  version: "0.1.0",

  extraction: {
    schema: HeatPumpPanelFields,
    hints: [
      "heatPump.mcaAmps and heatPump.mocpAmps are on the outdoor unit nameplate or spec sheet (often 'MCA' / 'MOP' / 'Max Fuse').",
      "coolingBTU / heatingBTU come from the spec sheet capacity table at rated conditions.",
      "existingPanelRatingAmps is the bus rating on the panel label; mainBreakerAmps is printed on the main breaker handle.",
      "availableBreakerSpaces: count empty slots in the panel photo.",
      "outdoorUnitSetbackFt comes from the site plan dimension to the nearest property line.",
      "heatPump.backupHeatKW: electric backup / supplemental / auxiliary heat or 'heat strip' / 'heat kit' kW for the air handler, from the spec sheet or the electrician's notes. Null for ductless mini-splits or when none is listed.",
    ],
  },

  rules: [
    breakerSizing,
    outdoorSetback,
    // TODO heat_pump_panel.disconnect_within_sight   NEC 440.14
    // TODO heat_pump_panel.outdoor_gfci              NEC 210.8(F)
    // TODO heat_pump_panel.conductor_ampacity        NEC 440.32 / 310.16
    // TODO heat_pump_panel.breaker_space_available   (availableBreakerSpaces >= 2 for 240 V)
    // TODO heat_pump_panel.panel_working_clearance   NEC 110.26(A)
    // TODO heat_pump_panel.panel_upgrade_matches_service  NEC 230.79 / 230.90
  ],

  addedLoads(f: Fields): NewLoad[] {
    // Connected VA; loadcalc applies the NEC 2026 Table 120.83 percentages.
    const loads: NewLoad[] = [
      {
        // MCA x voltage, "all other new loads" (50%). Heats and cools, so never omitted.
        source: "heat_pump_panel",
        name: "Heat pump",
        va: f.heatPump.mcaAmps * f.heatPump.voltage,
        kind: "other",
        isHeatingOrCooling: true,
        hvacMode: "both",
      },
    ];
    const backupKW = f.heatPump.backupHeatKW ?? null;
    if (backupKW !== null) {
      // Backup strips are central electric resistance space heating (80%). They run with
      // the heat pump in deep cold and defrost, so they are added, not swapped.
      loads.push({
        source: "heat_pump_panel",
        name: `Backup heat strips (${backupKW} kW)`,
        va: backupKW * 1000,
        kind: "central_resistance_heat",
        isHeatingOrCooling: true,
        hvacMode: "heating",
      });
    }
    return loads;
  },

  serviceRatingAmps(f: Fields) {
    return f.panelUpgrade?.proposedServiceAmps ?? f.existingServiceAmps;
  },

  utilityFlag(f: Fields) {
    if (f.panelUpgrade && f.panelUpgrade.proposedServiceAmps > f.existingServiceAmps) {
      return {
        utility: "Eversource",
        kind: "service_upgrade",
        reason: `Service goes from ${f.existingServiceAmps} A to ${f.panelUpgrade.proposedServiceAmps} A.`,
        action: "Open an Eversource service upgrade request; the utility must reconnect the new service.",
      };
    }
    return null;
  },

  cleanEnergyTip() {
    return {
      message: "Heat pump installs may qualify for Mass Save rebates. Share the link with the homeowner.",
      program: "Mass Save",
      url: "https://www.masssave.com",
    };
  },

  inspectorChecklist: [
    "Nameplate MCA/MOCP matches the approved spec sheet.",
    "Breaker size matches the approved application.",
    "Disconnect is within sight of the outdoor unit.",
    "Outdoor unit location matches the site plan setback.",
    "Panel directory updated with the new circuit.",
  ],
};
