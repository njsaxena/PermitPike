/**
 * Rule pack: heat pump install, optionally with a panel/service upgrade.
 *
 * Code basis: 527 CMR 12.00 adopts NEC 2026 (NFPA 70 as released August 20, 2025) for
 * permits granted after April 24, 2026. Confirmed with get_compliance_source on
 * "ma-electrical-code". The compliance catalog holds the Massachusetts amendments, not
 * the NEC base text, so each citation notes what was confirmed. VERIFY marks anything
 * that is still unconfirmed.
 */
import { HeatPumpPanelFields } from "@permitpike/contract";
import type { FieldsFor, NewLoad } from "@permitpike/contract";
import { conductorAmpacity, parseConductor, smallestConductorFor } from "./conductors";
import { breakerNotShown, result, type Rule, type RulePack } from "./types";

type Fields = FieldsFor<"heat_pump_panel">;

/** VERIFY: Boston zoning setback for outdoor mechanical equipment, and its section. */
export const OUTDOOR_UNIT_MIN_SETBACK_FT = 5;

/** VERIFY: NEC 2026 110.26(A)(1) Table 110.26(A)(1), Condition 1, 0-150 V to ground: 3 ft. */
export const PANEL_MIN_WORKING_CLEARANCE_IN = 36;

/** VERIFY: NEC 2026 230.79(C) one-family dwelling minimum service rating. */
export const MIN_DWELLING_SERVICE_AMPS = 100;

/** VERIFY: NEC 2026 210.8(F) scope: outdoor outlets at dwellings, 150 V to ground or less, 50 A or less. */
export const OUTDOOR_GFCI_MAX_BREAKER_AMPS = 50;

/** Breaker poles: a 240 V circuit takes a 2-pole breaker, 120 V takes one space. */
export function breakerSpacesFor(voltage: number): number {
  return voltage >= 200 ? 2 : 1;
}

const breakerSizing: Rule<"heat_pump_panel"> = {
  id: "heat_pump_panel.breaker_sizing",
  title: "Breaker matches heat pump nameplate",
  citation: "NEC 440.22", // VERIFY: no MA amendment to 440.22; NEC 2026 base text not in the compliance catalog.
  check(f) {
    const { mcaAmps, mocpAmps } = f.heatPump;
    if (f.proposedBreakerAmps === null) return breakerNotShown(this);
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

const disconnectWithinSight: Rule<"heat_pump_panel"> = {
  id: "heat_pump_panel.disconnect_within_sight",
  title: "Disconnect within sight of the outdoor unit",
  // 527 CMR 12.00 amends 440.14 with Informational Note No. 2 only (confirmed). VERIFY the
  // NEC 2026 440.14 base text and the Article 100 "within sight" definition (visible, 50 ft or less).
  citation: "NEC 440.14",
  check(f) {
    if (f.disconnectWithinSight === null) {
      return result(
        this,
        "warn",
        "Documents do not show a disconnect for the outdoor unit.",
        "Show the outdoor unit disconnect on the site plan or single-line diagram, within sight of the unit.",
      );
    }
    if (!f.disconnectWithinSight) {
      return result(
        this,
        "fail",
        "The outdoor unit disconnect is not within sight of the unit.",
        "Install a disconnect that is visible from and within 50 ft of the outdoor unit, and update the site plan.",
      );
    }
    return result(this, "pass", "A disconnect is shown within sight of the outdoor unit.");
  },
};

const outdoorGfci: Rule<"heat_pump_panel"> = {
  id: "heat_pump_panel.outdoor_gfci",
  title: "GFCI protection for the outdoor unit circuit",
  // 527 CMR 12.00 amends 210.8, 210.8(A)(9), (B)(7) and (D) but not 210.8(F) (confirmed).
  // VERIFY the NEC 2026 210.8(F) text, scope limits and any HVAC exception.
  citation: "NEC 210.8(F)",
  check(f) {
    if (f.proposedBreakerAmps === null) return breakerNotShown(this);
    if (f.proposedBreakerAmps > OUTDOOR_GFCI_MAX_BREAKER_AMPS || f.serviceVoltage > 240) {
      return result(
        this,
        "pass",
        `A ${f.proposedBreakerAmps} A circuit on a ${f.serviceVoltage} V service is outside the 210.8(F) scope used here (${OUTDOOR_GFCI_MAX_BREAKER_AMPS} A or less, 150 V to ground or less).`,
      );
    }
    const gfci = f.gfciProtected ?? null;
    if (gfci === true) {
      return result(this, "pass", `The documents show GFCI protection on the ${f.proposedBreakerAmps} A outdoor unit circuit.`);
    }
    return result(
      this,
      gfci === null ? "warn" : "fail",
      gfci === null
        ? `The ${f.proposedBreakerAmps} A outdoor unit circuit needs GFCI protection, and the documents don't show it.`
        : `The ${f.proposedBreakerAmps} A outdoor unit circuit needs GFCI protection, and the documents say there is none.`,
      "Show GFCI protection for the outdoor unit circuit (GFCI breaker or listed device) on the panel schedule, or note the exception that applies.",
    );
  },
};

const conductorAmpacityRule: Rule<"heat_pump_panel"> = {
  id: "heat_pump_panel.conductor_ampacity",
  title: "Branch circuit conductors meet nameplate MCA",
  // No MA amendment to 440.32 or 310.16; 527 CMR 12.00 revises only Table 310.15(C)(1)
  // adjustment factors (confirmed). VERIFY NEC 2026 440.32, Table 310.16 values and 110.14(C).
  citation: "NEC 440.32; NEC 310.16",
  check(f) {
    const mca = f.heatPump.mcaAmps;
    if (f.conductorAWG === null) {
      return result(
        this,
        "warn",
        "Documents do not show the branch circuit conductor size.",
        `Add the conductor size and material. Copper needs at least ${smallestConductorFor(mca, "cu", 60) ?? "a larger"} AWG for a ${mca} A MCA.`,
      );
    }
    const conductor = parseConductor(f.conductorAWG);
    if (!conductor) {
      return result(
        this,
        "warn",
        `Could not read the conductor size "${f.conductorAWG}".`,
        "State the conductor as an AWG size and material, e.g. \"8 AWG Cu\".",
      );
    }
    const at75 = conductorAmpacity(conductor, 75);
    const at60 = conductorAmpacity(conductor, 60);
    const label = `${conductor.size} AWG ${conductor.material === "cu" ? "copper" : "aluminum"}`;
    if (at75 < mca) {
      const min = smallestConductorFor(mca, conductor.material, 60);
      return result(
        this,
        "fail",
        `${label} is rated ${at75} A at 75 °C, below the nameplate MCA of ${mca} A.`,
        `Use at least ${min ?? "a larger"} AWG ${conductor.material === "cu" ? "copper" : "aluminum"} for a ${mca} A MCA.`,
      );
    }
    if (at60 < mca) {
      const min = smallestConductorFor(mca, conductor.material, 60);
      return result(
        this,
        "warn",
        `${label} is rated ${at60} A at 60 °C and ${at75} A at 75 °C; the MCA is ${mca} A, so it only works with 75 °C terminations.`,
        `Confirm the breaker and unit terminals are rated 75 °C (NEC 110.14(C)), or use ${min ?? "a larger"} AWG.`,
      );
    }
    return result(this, "pass", `${label} is rated ${at60} A at 60 °C, at least the nameplate MCA of ${mca} A.`);
  },
};

const breakerSpaceAvailable: Rule<"heat_pump_panel"> = {
  id: "heat_pump_panel.breaker_space_available",
  title: "Panel has space for the new breaker",
  // Practical check, not a code section of its own. VERIFY: NEC 2026 408.54 (overcurrent
  // devices limited to the spaces the panelboard is designed for); not in the compliance catalog.
  citation: "NEC 408.54",
  check(f) {
    const needed = breakerSpacesFor(f.heatPump.voltage);
    if (f.panelUpgrade) {
      return result(this, "pass", "The job replaces the panel, so the new breaker goes in the new panel.");
    }
    if (f.availableBreakerSpaces < needed) {
      return result(
        this,
        "fail",
        `A ${f.heatPump.voltage} V breaker needs ${needed} spaces; the panel has ${f.availableBreakerSpaces} free.`,
        "Free up spaces (for example with tandem breakers, where the panel label allows them), add a subpanel, or include a panel upgrade.",
      );
    }
    return result(
      this,
      "pass",
      `A ${f.heatPump.voltage} V breaker needs ${needed} spaces; the panel has ${f.availableBreakerSpaces} free.`,
    );
  },
};

const panelWorkingClearance: Rule<"heat_pump_panel"> = {
  id: "heat_pump_panel.panel_working_clearance",
  title: "Working space in front of the panel",
  // 527 CMR 12.00 adds 110.26(A)(1)(d): smaller spaces by special permission (confirmed).
  // VERIFY NEC 2026 Table 110.26(A)(1) depth for 0-150 V to ground.
  citation: "NEC 110.26(A)",
  check(f) {
    if (f.panelWorkingClearanceIn === null) {
      return result(
        this,
        "warn",
        "Documents do not show the working clearance in front of the panel.",
        `Add a photo or note showing at least ${PANEL_MIN_WORKING_CLEARANCE_IN} in of clear space in front of the panel.`,
      );
    }
    if (f.panelWorkingClearanceIn < PANEL_MIN_WORKING_CLEARANCE_IN) {
      return result(
        this,
        "fail",
        `The panel has ${f.panelWorkingClearanceIn} in of working clearance; the minimum is ${PANEL_MIN_WORKING_CLEARANCE_IN} in.`,
        `Clear at least ${PANEL_MIN_WORKING_CLEARANCE_IN} in in front of the panel, relocate the panel, or request special permission under 527 CMR 12.00 110.26(A)(1)(d).`,
      );
    }
    return result(
      this,
      "pass",
      `The panel has ${f.panelWorkingClearanceIn} in of working clearance (minimum ${PANEL_MIN_WORKING_CLEARANCE_IN} in).`,
    );
  },
};

const panelUpgradeMatchesService: Rule<"heat_pump_panel"> = {
  id: "heat_pump_panel.panel_upgrade_matches_service",
  title: "Upgraded panel matches the new service",
  // No MA amendment to 230.79 or 230.90; the MA amendments to 230.70 (outdoor service
  // disconnect) are separate (confirmed). VERIFY NEC 2026 230.79(C) and 230.90(A).
  citation: "NEC 230.79; NEC 230.90",
  check(f) {
    const up = f.panelUpgrade;
    if (!up) return result(this, "pass", "The job does not include a panel or service upgrade.");
    if (up.proposedServiceAmps < MIN_DWELLING_SERVICE_AMPS) {
      return result(
        this,
        "fail",
        `The proposed ${up.proposedServiceAmps} A service is below the ${MIN_DWELLING_SERVICE_AMPS} A dwelling minimum.`,
        `Size the new service at ${MIN_DWELLING_SERVICE_AMPS} A or more.`,
      );
    }
    if (up.proposedPanelRatingAmps < up.proposedServiceAmps) {
      return result(
        this,
        "fail",
        `The new panel is rated ${up.proposedPanelRatingAmps} A, below the proposed ${up.proposedServiceAmps} A service.`,
        `Use a panel rated at least ${up.proposedServiceAmps} A, or size the service and main breaker to the panel rating.`,
      );
    }
    return result(
      this,
      "pass",
      `The ${up.proposedPanelRatingAmps} A panel is rated for the proposed ${up.proposedServiceAmps} A service.`,
    );
  },
};

export const heatPumpPanelPack: RulePack<"heat_pump_panel"> = {
  jobType: "heat_pump_panel",
  version: "0.2.0",

  extraction: {
    schema: HeatPumpPanelFields,
    hints: [
      "heatPump.mcaAmps and heatPump.mocpAmps are on the outdoor unit nameplate or spec sheet (often 'MCA' / 'MOP' / 'Max Fuse').",
      "coolingBTU / heatingBTU come from the spec sheet capacity table at rated conditions.",
      "existingPanelRatingAmps is the bus rating on the panel label; mainBreakerAmps is printed on the main breaker handle.",
      "availableBreakerSpaces: count empty slots in the panel photo.",
      "outdoorUnitSetbackFt comes from the site plan dimension to the nearest property line.",
      "heatPump.backupHeatKW: electric backup / supplemental / auxiliary heat or 'heat strip' / 'heat kit' kW for the air handler, from the spec sheet or the electrician's notes. Null for ductless mini-splits or when none is listed.",
      "conductorAWG: size and material from the single-line diagram, e.g. \"8 AWG Cu\".",
      "disconnectWithinSight: true when the site plan shows a disconnect next to the outdoor unit.",
      "gfciProtected: true only if a GFCI breaker or listed GFCI device is shown or stated for the outdoor unit circuit; false if the documents say there is none; null otherwise.",
      "panelWorkingClearanceIn: clear depth in front of the panel from the photo or a note.",
    ],
  },

  rules: [
    breakerSizing,
    outdoorSetback,
    disconnectWithinSight,
    outdoorGfci,
    conductorAmpacityRule,
    breakerSpaceAvailable,
    panelWorkingClearance,
    panelUpgradeMatchesService,
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
    "Outdoor unit circuit is GFCI protected.",
    "Conductor size and terminal temperature rating match the MCA.",
    "36 in of clear working space in front of the panel.",
    "Outdoor unit location matches the site plan setback.",
    "Panel directory updated with the new circuit.",
  ],
};
