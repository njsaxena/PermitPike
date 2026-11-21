/** Turns the shared service fields into load calc input. No pack imports, so packs can use it. */
import type { ExistingAppliance, LoadCalcInput, NewLoad, ServiceFields } from "@permitpike/contract";

/** The existing home as the contract's ExistingLoadInputs describes it. */
export function existingAppliancesFor(fields: ServiceFields): ExistingAppliance[] {
  const { fixedAppliancesVA, existingHvacVA } = fields.existingLoad;
  const out: ExistingAppliance[] = [];
  if (fixedAppliancesVA > 0) out.push({ name: "Fixed appliances", watts: fixedAppliancesVA, isHeatingOrCooling: false });
  if (existingHvacVA > 0) out.push({ name: "Existing heating/cooling", watts: existingHvacVA, isHeatingOrCooling: true, hvacMode: "both" });
  return out;
}

/**
 * Load calc input for the service the home will have when the job is done. A measured
 * 12-month peak (existingLoad.measuredPeakDemandKW) switches loadcalc to NEC 2026 120.87.
 */
export function loadCalcInputFor(fields: ServiceFields, ratingAmps: number, newLoads: NewLoad[]): LoadCalcInput {
  const peakKW = fields.existingLoad.measuredPeakDemandKW;
  return {
    service: { ratingAmps, voltage: fields.serviceVoltage },
    home: {
      squareFeet: fields.existingLoad.dwellingSqFt,
      smallApplianceCircuits: fields.existingLoad.smallApplianceCircuits,
      laundryCircuits: fields.existingLoad.hasLaundryCircuit ? 1 : 0,
      existingAppliances: existingAppliancesFor(fields),
      ...(peakKW !== null ? { measuredDemand: { peakKW, source: "utility_12_months" as const } } : {}),
    },
    newLoads,
  };
}
