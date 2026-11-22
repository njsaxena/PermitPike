/**
 * Rule pack: Level 2 EV charger (EVSE) on an existing service.
 *
 * Code edition: 527 CMR 12.00 (effective April 24, 2026) adopts the 2026 NEC with no
 * Massachusetts amendment to Article 625 (checked with get_compliance_source on
 * "ma-electrical-code"). The compliance tools don't hold the base NFPA 70 text, so the
 * NEC section numbers below are marked VERIFY until someone reads them in the 2026 book.
 */
import { EvChargerFields } from "@permitpike/contract";
import type { FieldsFor, NewLoad } from "@permitpike/contract";
import { breakerNotShown, result, type Rule, type RulePack } from "./types";

type Fields = FieldsFor<"ev_charger">;

/** EVSE is a continuous load: the breaker must be at least 125% of the charger output. */
export const EVSE_CONTINUOUS_FACTOR = 1.25;

/** Standard breaker ratings (NEC 240.6(A)), up to what a dwelling EV circuit uses. */
export const STANDARD_BREAKER_AMPS = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150];

/**
 * Copper conductor ampacity, 75 °C column of NEC Table 310.16. VERIFY against the 2026
 * book: 527 CMR 12.00 refers to "Tables 310.16 through 310.19" (confirmed), but the
 * values themselves are not in the compliance sources.
 * Assumes 75 °C terminations and THHN/THWN-type wire. NM-B cable is limited to the
 * 60 °C column (NEC 334.80), so a passing result here is not a pass for NM-B.
 */
export const COPPER_75C_AMPACITY: Record<string, number> = {
  "14": 20,
  "12": 25,
  "10": 35,
  "8": 50,
  "6": 65,
  "4": 85,
  "3": 100,
  "2": 115,
  "1": 130,
  "1/0": 150,
  "2/0": 175,
  "3/0": 200,
  "4/0": 230,
};

/** Sizes smallest to largest. Object key order can't be used: JS sorts "1" before "14". */
export const COPPER_SIZES_ASCENDING = ["14", "12", "10", "8", "6", "4", "3", "2", "1", "1/0", "2/0", "3/0", "4/0"];

/** NEC 240.4(D) small-conductor limits on the breaker, whatever the table says. VERIFY. */
export const SMALL_CONDUCTOR_MAX_BREAKER: Record<string, number> = { "14": 15, "12": 20, "10": 30 };

/** NEC 210.8(F) covers outdoor outlets on circuits of 50 A or less. VERIFY 2026 wording. */
export const OUTDOOR_GFCI_MAX_BREAKER_AMPS = 50;

const OUTDOOR_LOCATIONS: ReadonlyArray<Fields["installLocation"]> = ["exterior_wall", "pedestal"];

function isOutdoor(f: Fields) {
  return OUTDOOR_LOCATIONS.includes(f.installLocation);
}

/** "6", "#6", "6 AWG", "6 awg cu" -> "6"; "1/0" -> "1/0". Null for aluminum or anything else. */
export function parseCopperAWG(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (/\bal\b|alum/.test(s)) return null;
  const m = s.match(/^#?\s*(\d\/0|\d{1,2})\s*(awg)?\s*(cu|copper)?$/);
  const size = m?.[1];
  return size !== undefined && size in COPPER_75C_AMPACITY ? size : null;
}

function nextStandardBreaker(amps: number) {
  return STANDARD_BREAKER_AMPS.find((a) => a >= amps) ?? Math.ceil(amps / 5) * 5;
}

const breakerContinuousLoad: Rule<"ev_charger"> = {
  id: "ev_charger.breaker_continuous_load",
  title: "Breaker sized for continuous EV load",
  citation: "NEC 625.41", // VERIFY: 2026 numbering (625.41 in the 2020 and 2023 editions)
  check(f) {
    const min = f.charger.outputAmps * EVSE_CONTINUOUS_FACTOR;
    if (f.proposedBreakerAmps === null) return breakerNotShown(this);
    if (f.proposedBreakerAmps >= min) {
      return result(
        this,
        "pass",
        `${f.proposedBreakerAmps} A breaker is at least 125% of the ${f.charger.outputAmps} A charger output (${min} A).`,
      );
    }
    return result(
      this,
      "fail",
      `${f.proposedBreakerAmps} A breaker is under 125% of the ${f.charger.outputAmps} A charger output (${min} A needed).`,
      `Use a ${nextStandardBreaker(min)} A breaker (with conductors rated for it), or set the charger's output to ${Math.floor(f.proposedBreakerAmps / EVSE_CONTINUOUS_FACTOR)} A or less.`,
    );
  },
};

const conductorSpecified: Rule<"ev_charger"> = {
  id: "ev_charger.conductor_specified",
  title: "Branch circuit conductor size shown and rated for the breaker",
  citation: "NEC 310.16; NEC 240.4(D)", // VERIFY: values in the 2026 Table 310.16
  check(f) {
    if (f.conductorAWG === null) {
      return result(
        this,
        "warn",
        "Documents do not show the branch circuit conductor size.",
        "Add the conductor size and type (e.g. 6 AWG copper THHN) to the single-line diagram or panel schedule.",
      );
    }
    const awg = parseCopperAWG(f.conductorAWG);
    if (awg === null) {
      return result(
        this,
        "warn",
        `Conductor "${f.conductorAWG}" is not a copper size this check knows. Review the ampacity by hand.`,
        "State the conductor as a copper AWG size, or have the reviewer check aluminum against the 310.16 aluminum column.",
      );
    }
    const ampacity = COPPER_75C_AMPACITY[awg] ?? 0;
    const maxBreaker = Math.min(ampacity, SMALL_CONDUCTOR_MAX_BREAKER[awg] ?? Infinity);
    const breaker = f.proposedBreakerAmps;
    if (breaker === null) return breakerNotShown(this);
    if (breaker > maxBreaker) {
      const fit = COPPER_SIZES_ASCENDING.find(
        (size) => Math.min(COPPER_75C_AMPACITY[size] ?? 0, SMALL_CONDUCTOR_MAX_BREAKER[size] ?? Infinity) >= breaker,
      );
      return result(
        this,
        "fail",
        `${awg} AWG copper is good for ${maxBreaker} A, less than the ${f.proposedBreakerAmps} A breaker.`,
        fit
          ? `Use ${fit} AWG copper or larger, or a smaller breaker if the charger allows it.`
          : "Use a larger conductor or a smaller breaker.",
      );
    }
    return result(
      this,
      "pass",
      `${awg} AWG copper (${ampacity} A at 75 °C) is rated for the ${f.proposedBreakerAmps} A breaker. NM-B cable would need the 60 °C column.`,
    );
  },
};

const gfci: Rule<"ev_charger"> = {
  id: "ev_charger.gfci",
  title: "GFCI protection",
  citation: "NEC 625.54; NEC 210.8(F)", // VERIFY: 2026 numbering and 210.8(F) scope
  check(f) {
    const receptacle = f.charger.connection === "receptacle";
    // An outdoor hardwired charger needs GFCI only on 50 A or less, so its breaker decides.
    if (!receptacle && isOutdoor(f) && f.proposedBreakerAmps === null) return breakerNotShown(this);
    const outdoorOutlet =
      isOutdoor(f) && f.proposedBreakerAmps !== null && f.proposedBreakerAmps <= OUTDOOR_GFCI_MAX_BREAKER_AMPS;
    if (!receptacle && !outdoorOutlet) {
      return result(
        this,
        "pass",
        "Hardwired charger: personnel protection is built into the listed charger (NEC 625.22); a GFCI breaker is not required here.",
      );
    }
    const why = receptacle ? "EV charging receptacles need GFCI protection" : "Outdoor outlets on circuits of 50 A or less need GFCI protection";
    if (f.gfciProtected === true) {
      return result(this, "pass", `${why}; the documents show a GFCI breaker.`);
    }
    return result(
      this,
      f.gfciProtected === null ? "warn" : "fail",
      f.gfciProtected === null ? `${why}, and the documents do not show it.` : `${why}, and the documents say there is none.`,
      "Use a GFCI breaker for the EV circuit and note it on the panel schedule.",
    );
  },
};

const outdoorRating: Rule<"ev_charger"> = {
  id: "ev_charger.outdoor_rating",
  title: "Charger rated for outdoor install",
  citation: "NEC 110.28", // VERIFY: enclosure types for wet locations, 2026 numbering
  check(f) {
    if (!isOutdoor(f)) {
      return result(this, "pass", "Indoor install; an outdoor rating is not needed.");
    }
    if (f.outdoorRated === true) {
      return result(this, "pass", "Spec sheet shows an outdoor-rated enclosure (e.g. NEMA 3R or 4).");
    }
    return result(
      this,
      f.outdoorRated === null ? "warn" : "fail",
      f.outdoorRated === null
        ? "Charger is outdoors but the spec sheet does not show an outdoor rating."
        : "Charger is outdoors and the spec sheet says it is not rated for outdoor use.",
      "Use a charger with an outdoor-rated enclosure (NEMA 3R or 4) or install it indoors.",
    );
  },
};

const pedestalSetback: Rule<"ev_charger"> = {
  id: "ev_charger.pedestal_setback",
  title: "Pedestal location shown on the site plan",
  // VERIFY: Boston zoning setback for a freestanding charger pedestal, and its section.
  // No minimum is enforced until that is confirmed; the rule only asks for the dimension.
  citation: "Boston Zoning Code Art. 10",
  check(f) {
    if (f.installLocation !== "pedestal") {
      return result(this, "pass", "Not a pedestal install; no setback dimension needed.");
    }
    if (f.setbackFt === null) {
      return result(
        this,
        "warn",
        "Site plan does not show the pedestal's distance to the property line.",
        "Add the pedestal location and its setback dimension to the site plan.",
      );
    }
    return result(this, "pass", `Pedestal is ${f.setbackFt} ft from the property line, shown on the site plan.`);
  },
};

export const evChargerPack: RulePack<"ev_charger"> = {
  jobType: "ev_charger",
  version: "0.1.0",

  extraction: {
    schema: EvChargerFields,
    hints: [
      "charger.outputAmps is the maximum continuous output on the charger spec sheet or nameplate (e.g. 'Max output 48 A'). If the installer sets a lower output, use the set value.",
      "charger.connection is 'receptacle' for a plug-in charger (NEMA 14-50 / 6-50 outlet), 'hardwired' otherwise.",
      "proposedBreakerAmps and conductorAWG come from the single-line diagram or panel schedule, e.g. '60 A 2P, 6 AWG Cu'.",
      "gfciProtected: true only if a GFCI breaker or GFCI receptacle is shown or stated.",
      "outdoorRated: true if the spec sheet lists NEMA 3R, 4 or 4X, or says rated for outdoor use.",
      "hasLoadManagement: true if a load manager, energy management system, DCC unit or 'load sharing device' is part of the job.",
      "setbackFt: only for a pedestal; the site plan dimension to the nearest property line.",
    ],
  },

  rules: [breakerContinuousLoad, conductorSpecified, gfci, outdoorRating, pedestalSetback],

  addedLoads(f: Fields): NewLoad[] {
    // Connected VA at nameplate: output amps x voltage (NEC 2026 120.57; 7,200 VA is only
    // for an unknown nameplate, see loadcalc constants.ts). loadcalc applies the Table
    // 120.83 new-EVSE percentage (80%).
    // hasLoadManagement: an energy management system can limit the load to its setpoint
    // (NEC 625.42), but the fields carry no setpoint, so the full nameplate is counted.
    // controllable (default true for EVSE) lets loadcalc suggest load management when
    // the service is short.
    return [
      {
        source: "ev_charger",
        name: `EV charger (${f.charger.outputAmps} A)`,
        va: f.charger.outputAmps * f.charger.voltage,
        kind: "evse",
        isHeatingOrCooling: false,
      },
    ];
  },

  serviceRatingAmps(f: Fields) {
    return f.existingServiceAmps;
  },

  utilityFlag() {
    return null;
  },

  cleanEnergyTip() {
    return {
      message: "Level 2 chargers may qualify for a Mass Save rebate. Share the link with the homeowner.",
      program: "Mass Save",
      url: "https://www.masssave.com/residential/rebates-offers-services/battery-storage-and-evs/ev-charging-equipment",
    };
  },

  inspectorChecklist: [
    "Charger make, model and output setting match the approved spec sheet.",
    "Breaker and conductor size match the approved application.",
    "GFCI protection in place where the application requires it.",
    "Outdoor installs: enclosure is outdoor rated; pedestal sits where the site plan shows.",
    "Panel directory updated with the new EV circuit.",
  ],
};
