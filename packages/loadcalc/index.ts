/**
 * Shared load calculation engine (STUB).
 *
 * Every rule pack contributes addedLoad(fields) in VA. This engine adds it to the
 * existing dwelling load and compares the total to the service rating.
 *
 * TODO(loadcalc owner):
 * - Verify demand factors against NEC 2023 220.83 (Massachusetts adopts NEC with
 *   527 CMR 12 amendments) before the demo.
 * - Decide whether EVSE added load takes the 40% demand factor under 220.83(A)
 *   or stays at 100%. It stays at 100% here (conservative).
 */
import type { ExistingLoadInputs, LoadCalcResult, ServiceFields } from "@permitpike/contract";

const GENERAL_LIGHTING_VA_PER_SQFT = 3;
const SMALL_APPLIANCE_CIRCUIT_VA = 1500;
const LAUNDRY_CIRCUIT_VA = 1500;
const FIRST_TIER_VA = 8000;
const REMAINDER_DEMAND_FACTOR = 0.4;
const MEASURED_PEAK_MULTIPLIER = 1.25;

/** Existing dwelling load in VA, after demand factors. */
export function existingLoadVA(inputs: ExistingLoadInputs): {
  method: LoadCalcResult["method"];
  va: number;
} {
  // NEC 220.87: 12 months of measured peak demand at 125%.
  if (inputs.measuredPeakDemandKW !== null) {
    return { method: "nec_220_87", va: inputs.measuredPeakDemandKW * 1000 * MEASURED_PEAK_MULTIPLIER };
  }

  // NEC 220.83: first 8 kVA of "all other load" at 100%, remainder at 40%.
  // Existing HVAC that stays in service is added at 100%.
  const otherLoadVA =
    inputs.dwellingSqFt * GENERAL_LIGHTING_VA_PER_SQFT +
    inputs.smallApplianceCircuits * SMALL_APPLIANCE_CIRCUIT_VA +
    (inputs.hasLaundryCircuit ? LAUNDRY_CIRCUIT_VA : 0) +
    inputs.fixedAppliancesVA;

  const firstTier = Math.min(otherLoadVA, FIRST_TIER_VA);
  const remainder = Math.max(otherLoadVA - FIRST_TIER_VA, 0) * REMAINDER_DEMAND_FACTOR;
  return { method: "nec_220_83", va: firstTier + remainder + inputs.existingHvacVA };
}

/**
 * existingLoad + addedLoad vs service rating.
 * serviceRatingAmps defaults to the existing service; pass the proposed rating
 * for panel/service upgrades.
 */
export function runLoadCalc(
  service: ServiceFields,
  addedLoadVA: number,
  serviceRatingAmps: number = service.existingServiceAmps,
): LoadCalcResult {
  const existing = existingLoadVA(service.existingLoad);
  const totalLoadVA = existing.va + addedLoadVA;
  const totalAmps = totalLoadVA / service.serviceVoltage;

  return {
    method: existing.method,
    existingLoadVA: round(existing.va),
    addedLoadVA: round(addedLoadVA),
    totalLoadVA: round(totalLoadVA),
    totalAmps: round(totalAmps, 1),
    serviceRatingAmps,
    utilization: round(totalAmps / serviceRatingAmps, 3),
    headroomAmps: round(serviceRatingAmps - totalAmps, 1),
    passes: totalAmps <= serviceRatingAmps,
  };
}

function round(n: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
