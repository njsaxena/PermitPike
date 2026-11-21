/**
 * Rule pack: residential battery energy storage system (ESS), with or without solar.
 *
 * Code edition: 527 CMR 12.00 (effective April 24, 2026) adopts the 2026 NEC with no
 * Massachusetts amendment to Articles 705 or 706. 527 CMR 1.00 (Fire Code) 52.1.1.1 and
 * 52.9: ESS in one- and two-family dwellings follow Chapter 15 of NFPA 855 (2020 edition)
 * and 52.9 (confirmed with get_compliance_source on "ma-fire-code", pp. 51 and 149-150).
 * The compliance tools hold neither the base NEC nor NFPA 855 text, so those section
 * numbers are marked VERIFY.
 */
import { HomeBatteryFields } from "@permitpike/contract";
import type { FieldsFor, NewLoad } from "@permitpike/contract";
import { result, type Rule, type RulePack } from "./types";

type Fields = FieldsFor<"home_battery">;

/** NEC 705.12 "120% rule": main breaker + backfeed breaker <= 120% of the busbar rating. */
export const BUSBAR_BACKFEED_FACTOR = 1.2;

/**
 * Minimum distance from an outdoor / exterior-wall ESS to doors and windows that open
 * into the dwelling. VERIFY: NFPA 855 (2020) Chapter 15 location rules (15.5 in our
 * reading) and 780 CMR R328.4 (IRC-based residential code) both state 3 ft; neither text
 * is in the compliance sources.
 */
export const EXTERIOR_MIN_CLEARANCE_TO_OPENINGS_FT = 3;

/** Locations NFPA 855 Ch. 15 allows, as our field enum names them. VERIFY with 15.5. */
const INDOOR_ALLOWED: ReadonlyArray<Fields["installLocation"]> = ["garage", "basement", "utility_room"];

/** A 240 V backfeed breaker is double-pole. */
export const BACKFEED_BREAKER_SPACES = 2;

function needsBackfeedBreaker(f: Fields) {
  return f.interconnection === "load_side";
}

const listing: Rule<"home_battery"> = {
  id: "home_battery.listing",
  title: "Energy storage system is UL 9540 listed",
  // 527 CMR 1.00 52.9 confirmed. VERIFY: NEC 2026 706.5 and the NFPA 855 Ch. 15 listing section.
  citation: "NEC 706.5; 527 CMR 1.00 52.9 (NFPA 855 Ch. 15)",
  check(f) {
    if (f.battery.ul9540Listed === true) {
      return result(this, "pass", "Spec sheet shows a UL 9540 system listing.");
    }
    return result(
      this,
      f.battery.ul9540Listed === null ? "warn" : "fail",
      f.battery.ul9540Listed === null
        ? "Could not find a UL 9540 system listing in the documents. A UL 1973 cell or module listing alone is not enough."
        : "Spec sheet says the system is not UL 9540 listed.",
      "Upload the UL 9540 certificate or a spec sheet that shows the system listing, or choose a listed system.",
    );
  },
};

const interconnectionBreaker: Rule<"home_battery"> = {
  id: "home_battery.interconnection_breaker",
  title: "Backfeed breaker within the busbar 120% rule",
  citation: "NEC 705.12", // VERIFY: 2026 subsection for the 120% option (705.12(B)(3)(2) in 2020)
  check(f) {
    if (f.interconnection === "backup_only") {
      return result(this, "pass", "Backup-only system: it does not feed the grid, so no backfeed breaker is needed.");
    }
    if (f.backfeedBreakerAmps === null) {
      return result(
        this,
        "warn",
        `A ${f.interconnection.replace("_", "-")} connection needs a breaker size, and the documents do not show one.`,
        "Add the backfeed or interconnection breaker size to the single-line diagram.",
      );
    }
    if (f.interconnection === "supply_side") {
      // Supply-side taps are 705.11, not the busbar rule. The reviewer still checks the tap.
      return result(
        this,
        "pass",
        `Supply-side connection with a ${f.backfeedBreakerAmps} A disconnect; the busbar 120% rule does not apply.`,
      );
    }
    const limit = f.existingPanelRatingAmps * BUSBAR_BACKFEED_FACTOR;
    const sum = f.mainBreakerAmps + f.backfeedBreakerAmps;
    if (sum <= limit) {
      return result(
        this,
        "pass",
        `${f.mainBreakerAmps} A main + ${f.backfeedBreakerAmps} A backfeed = ${sum} A, within 120% of the ${f.existingPanelRatingAmps} A busbar (${limit} A). The backfeed breaker must sit at the opposite end of the bus from the main.`,
      );
    }
    const maxBackfeed = Math.max(0, limit - f.mainBreakerAmps);
    return result(
      this,
      "fail",
      `${f.mainBreakerAmps} A main + ${f.backfeedBreakerAmps} A backfeed = ${sum} A, over 120% of the ${f.existingPanelRatingAmps} A busbar (${limit} A).`,
      maxBackfeed > 0
        ? `Limit the backfeed breaker to ${maxBackfeed} A, downsize the main breaker, or connect on the supply side.`
        : "Downsize the main breaker or connect on the supply side.",
    );
  },
};

const locationClearance: Rule<"home_battery"> = {
  id: "home_battery.location_clearance",
  title: "Install location and clearance to openings",
  // 527 CMR 1.00 52.9.4 (locations per NFPA 855 Ch. 15) confirmed. VERIFY: NFPA 855 15.5.
  citation: "527 CMR 1.00 52.9.4; NFPA 855 15.5",
  check(f) {
    if (f.installLocation === "exterior_wall") {
      const min = EXTERIOR_MIN_CLEARANCE_TO_OPENINGS_FT;
      if (f.clearanceToOpeningsFt === null) {
        return result(
          this,
          "warn",
          "Exterior wall install, but the site plan does not show the distance to the nearest door or window.",
          "Add the distance from the battery to the nearest door or operable window.",
        );
      }
      if (f.clearanceToOpeningsFt < min) {
        return result(
          this,
          "fail",
          `Battery is ${f.clearanceToOpeningsFt} ft from the nearest door or window; minimum is ${min} ft.`,
          `Move the battery at least ${min} ft from doors and windows that open into the home.`,
        );
      }
      return result(this, "pass", `Exterior wall install, ${f.clearanceToOpeningsFt} ft from the nearest opening (min ${min} ft).`);
    }
    if (INDOOR_ALLOWED.includes(f.installLocation)) {
      // 52.9.4.1 adds conditions for enclosed utility closets and storage spaces; the
      // inspector checks those on site.
      return result(this, "pass", `${f.installLocation.replace("_", " ")} install is a permitted location.`);
    }
    return result(
      this,
      "warn",
      "Install location is not one the residential ESS rules list.",
      "Move the system to a garage, basement, utility room or exterior wall, or describe the location for the reviewer.",
    );
  },
};

const panelSpace: Rule<"home_battery"> = {
  id: "home_battery.panel_space",
  title: "Panel has space for the backfeed breaker",
  citation: "NEC 408.54", // VERIFY: 2026 numbering (panelboard maximum overcurrent devices)
  check(f) {
    if (!needsBackfeedBreaker(f)) {
      return result(this, "pass", "No backfeed breaker in the panel for this connection type.");
    }
    if (f.availableBreakerSpaces >= BACKFEED_BREAKER_SPACES) {
      return result(this, "pass", `${f.availableBreakerSpaces} open spaces for the double-pole backfeed breaker.`);
    }
    return result(
      this,
      "fail",
      `Panel has ${f.availableBreakerSpaces} open space(s); the double-pole backfeed breaker needs ${BACKFEED_BREAKER_SPACES}.`,
      "Free up two spaces (e.g. with listed tandem breakers the panel allows), add a subpanel, or connect on the supply side.",
    );
  },
};

export const homeBatteryPack: RulePack<"home_battery"> = {
  jobType: "home_battery",
  version: "0.1.0",

  extraction: {
    schema: HomeBatteryFields,
    hints: [
      "battery.ul9540Listed: true only if the spec sheet or certificate lists UL 9540 for the system. UL 1973 (cells/modules) or UL 1741 (inverter) alone is not UL 9540.",
      "battery.continuousOutputW is the rated continuous AC output power on the spec sheet.",
      "interconnection: 'load_side' for a breaker in the existing panel, 'supply_side' for a tap ahead of the main, 'backup_only' if it never exports to the grid.",
      "backfeedBreakerAmps comes from the single-line diagram (often labeled 'PV/ESS breaker' or 'backfeed').",
      "clearanceToOpeningsFt: site plan distance from the battery to the nearest door or operable window.",
    ],
  },

  rules: [listing, interconnectionBreaker, locationClearance, panelSpace],

  addedLoads(): NewLoad[] {
    // Decision: 0 VA. The loadcalc README and Table 120.83 do not list ESS charging as a
    // dwelling load, and loadcalc's own test ("battery adds no continuous load") uses
    // 0 VA. A battery that charges from the grid draws up to the inverter's charge rate;
    // if an AHJ counts that, change this to the charge rate with kind "other".
    // The entry stays so the load calc shows the battery as a 0 VA line.
    return [{ source: "home_battery", name: "Home battery", va: 0, kind: "other", isHeatingOrCooling: false }];
  },

  serviceRatingAmps(f: Fields) {
    return f.existingServiceAmps;
  },

  utilityFlag(f: Fields) {
    if (f.interconnection === "backup_only") return null;
    return {
      utility: "Eversource",
      kind: "interconnection",
      reason: `Grid-connected battery (${f.interconnection.replace("_", "-")})${f.hasSolar ? " with solar" : ""}.`,
      action: "Submit an Eversource interconnection application and wait for approval before operating the system.",
    };
  },

  cleanEnergyTip() {
    return {
      message: "The homeowner can enroll the battery in Mass Save ConnectedSolutions and earn payments for discharging during peak events.",
      program: "Mass Save ConnectedSolutions",
      url: "https://www.masssave.com/residential/rebates-offers-services/battery-storage-and-evs/batteries",
    };
  },

  inspectorChecklist: [
    "Battery make and model match the approved spec sheet; UL 9540 label on the unit.",
    "Location and clearance to doors and windows match the site plan.",
    "Backfeed breaker size and position (opposite end from the main) match the single-line diagram.",
    "ESS disconnect and required labels in place.",
  ],
};
