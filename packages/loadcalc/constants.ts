/**
 * Code-derived numbers for the existing dwelling load calculation.
 * Every value here comes from the electrical code. Product settings live in config.ts.
 *
 * Adopted code: 527 CMR 12.00, the Massachusetts Electrical Code, adopts NFPA 70
 * (NEC) 2026 for permits granted after April 24, 2026. Its only Article 120
 * amendment is an informational note at 120.40, so 120.83 applies as published.
 * Source: mass.gov "527 CMR 12.00 Massachusetts Electrical Code (Effective 4/24/26)".
 *
 * NEC 2026 moved Article 220 to Article 120 and kept the section suffixes:
 * 2023's 220.83 is 2026's 120.83.
 *
 * Source for 120.83: NFPA, "NEC 2026 Second Draft, Code-Making Panel 2, Public Comment
 * Responses" (docinfofiles.nfpa.org, 70_A2025_NEC_P02_SD_PCResponses.pdf), pp. 88-96.
 * That is the committee's final revision stage: the 120.83 text there was carried by
 * SR-7832, which changed only "where" to "if" and applied the "not connected to the
 * circuits in 120.83(1) or (2)" qualifier to all of 120.83(3). Exact revised text of
 * SR-7809, SR-7832 and SR-7849: CMP-2 Second Revision working draft
 * (70_A2025_NEC_P02_SD_PrelimSR.pdf). Not yet compared with the published NFPA 70-2026 book.
 */

/** Shown on every step and on the check. */
export const CODE_EDITION = "NEC 2026";
export const ADOPTING_REGULATION = "527 CMR 12.00";
export const METHOD_CITATION = `${CODE_EDITION} 120.83`;

/** NEC 2026 120.83(1): general lighting and general-use receptacles at 2 VA per sq ft (was 3 VA in 2023). */
export const GENERAL_LIGHTING_VA_PER_SQFT = 2;
export const GENERAL_LIGHTING_CITATION = `${CODE_EDITION} 120.83(1)`;

/**
 * NEC 2026 120.83(2): 1,500 VA for each 2-wire, 20 A small-appliance branch circuit and
 * each laundry branch circuit covered in 210.11(C)(1) and 210.11(C)(2).
 */
export const SMALL_APPLIANCE_CIRCUIT_VA = 1500;
export const LAUNDRY_CIRCUIT_VA = 1500;
export const CIRCUIT_LOAD_CITATION = `${CODE_EDITION} 120.83(2)`;

/**
 * Code minimum circuit counts, used when the application doesn't say.
 * NEC 210.11(C)(1): at least two small-appliance circuits; 210.11(C)(2): at least one
 * laundry circuit. 120.83(2) itself cites these sections in the 2026 text.
 */
export const MIN_SMALL_APPLIANCE_CIRCUITS = 2;
export const MIN_LAUNDRY_CIRCUITS = 1;
export const MIN_CIRCUITS_CITATION = `${CODE_EDITION} 210.11(C)(1), 210.11(C)(2)`;

/**
 * NEC 2026 120.83(3): nameplate rating of appliances fastened in place, permanently
 * connected or on a specific circuit; ranges, wall ovens and cooktops; clothes dryers;
 * water heaters; and EVSE on an individual branch circuit. Existing heating and cooling
 * equipment is fastened in place, so it enters here. Equipment on the circuits counted
 * in 120.83(1) or (2) is not counted again.
 */
export const APPLIANCE_CITATION = `${CODE_EDITION} 120.83(3)`;

/** NEC 2026 Table 120.83: the first 8 kVA of existing and new load at 100%. */
export const FIRST_TIER_VA = 8000;
export const FIRST_TIER_FACTOR = 1.0;

/** NEC 2026 Table 120.83: remainder of existing load at 40%. */
export const EXISTING_REMAINDER_FACTOR = 0.4;

/**
 * NEC 2026 Table 120.83: new loads by class. Public comments asking for new EVSE at
 * 100% (PC 1480, PC 1691) were rejected; the committee kept 80%, citing LBNL
 * sub-metering data.
 */
export const NEW_LOAD_FACTORS = {
  /** New EVSE at 80%. */
  evse: 0.8,
  /** New central electric resistance space heating at 80%. */
  central_resistance_heat: 0.8,
  /** All other new loads at 50%. */
  other: 0.5,
} as const;
export const TABLE_CITATION = `${CODE_EDITION} Table 120.83`;

/**
 * Which new loads get the share of the first 8 kVA that existing load doesn't use.
 * The table says "first 8 kVA of existing and new load" but not the order.
 * Decision: existing load first, then new loads lowest factor first. That gives the
 * highest (most conservative) total, and it's the reading other 2026 calculators use.
 * It only matters when existing load is under 8 kVA: a small all-gas unit (Boston
 * condos and triple-decker units with their own service). 120.83(1)+(2) alone are at
 * least 4,500 VA, so at most 3,500 VA of tier is left, and the order changes the total
 * by at most 3,500 x (80% - 50%) = 1,050 VA, about 4.4 A at 240 V.
 * Not settled by the code text: an AHJ could read it the other way.
 */
export const FIRST_TIER_ALLOCATION_NOTE = "existing first, then lowest-factor new loads (most conservative)";

// ---------------------------------------------------------------------------
// NEC 2026 120.87: existing load from measured maximum demand
// Source: same NFPA document, pp. 101-105 (PC 1121, 1611, 1613, 86; SR-7849).
// ---------------------------------------------------------------------------

export const MEASURED_METHOD_CITATION = `${CODE_EDITION} 120.87`;

/** 120.87(1): maximum demand data for a 1-year period (utility interval data). */
export const MEASURED_12_MONTH_CITATION = `${CODE_EDITION} 120.87(1)`;

/**
 * 120.87(1) Exception: a recording of at least 30 days, highest 15-minute average on the
 * highest loaded phase, taken while occupied. It must include, by measurement or by
 * calculation, the larger of the heating or cooling load. SR-7849 text: "This exception
 * shall not be permitted if the feeder or service has a renewable energy system (i.e.,
 * solar photovoltaic or wind electric) or employs any form of peak load shaving."
 * The committee rejected PCs 1121 and 1613 that would have allowed renewables.
 */
export const MEASURED_30_DAY_CITATION = `${CODE_EDITION} 120.87(1) Exception`;

/** 120.87(2): maximum demand at 125 percent, plus the new load, must not exceed the service rating. */
export const MEASURED_DEMAND_MULTIPLIER = 1.25;
export const MEASURED_LOAD_CITATION = `${CODE_EDITION} 120.87(2)`;

/**
 * 120.87(2), SR-7849 text: "The maximum demand at 125 percent plus the new load minus
 * any removed load determined in accordance with Article 120, Parts I, III, and IV does
 * not exceed the ampacity of the feeder or rating of the service."
 * (CMP-2 Second Revision working draft, 70_A2025_NEC_P02_SD_PrelimSR.pdf.)
 * The text says "plus the new load minus any removed load" after the 125%, so removed
 * loads are subtracted after the multiplier, as the engine does. Decision: new loads at
 * 100% of connected VA. Parts I, III and IV allow demand factors from those parts, but
 * not the Table 120.83 percentages (that table is Part IV's 120.83 method, not 120.87).
 * 100% is conservative; a future change could apply Part III/IV demand factors.
 */
export const MEASURED_NEW_LOAD_FACTOR = 1.0;

/**
 * NEC 2026 120.83: "The larger connected load of air-conditioning or space heating,
 * but not both, shall be used." It applies to existing and new loads together.
 * PC 1480 proposed adding "in accordance with 120.82(C)" (the optional method's
 * heating percentages); the committee rejected it, so heating and cooling stay at
 * their connected load and go through Table 120.83 like any other load.
 */
export const NONCOINCIDENT_CITATION = `${CODE_EDITION} 120.83`;

/**
 * Power control systems: a listed system's control setting may replace nameplate in
 * the load calc (NEC 2026 120.7, moved from 220.70). Requirements in Article 130
 * (was Article 750); EV load management in 625.42.
 */
export const LOAD_MANAGEMENT_CITATION = `${CODE_EDITION} 120.7, 625.42, Article 130`;
