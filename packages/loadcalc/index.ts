/**
 * Shared load engine: does this home's electrical service have room for the new device(s)?
 *
 * Method: optional calculation for existing dwellings, NEC 2026 120.83, as adopted by
 * 527 CMR 12.00. Each rule pack turns its fields into NewLoad entries (addedLoad(fields) -> va);
 * this engine adds them to the existing load and compares the total to the service rating.
 *
 * Pure: no I/O, no clocks. Same input, same result.
 */
import { LoadCalcInput } from "@permitpike/contract";
import type {
  CheckResult,
  HvacMode,
  LoadCalcOutcome,
  LoadCalcResult,
  LoadCalcStep,
  NewLoad,
} from "@permitpike/contract";
import { DEFAULT_SETTINGS, TIGHT_THRESHOLD_CITATION, type LoadCalcSettings } from "./config";
import {
  ADOPTING_REGULATION,
  APPLIANCE_CITATION,
  CIRCUIT_LOAD_CITATION,
  EXISTING_REMAINDER_FACTOR,
  FIRST_TIER_FACTOR,
  FIRST_TIER_VA,
  GENERAL_LIGHTING_CITATION,
  GENERAL_LIGHTING_VA_PER_SQFT,
  LAUNDRY_CIRCUIT_VA,
  LOAD_MANAGEMENT_CITATION,
  METHOD_CITATION,
  MIN_CIRCUITS_CITATION,
  MIN_LAUNDRY_CIRCUITS,
  MIN_SMALL_APPLIANCE_CIRCUITS,
  NEW_LOAD_FACTORS,
  NONCOINCIDENT_CITATION,
  SMALL_APPLIANCE_CIRCUIT_VA,
  TABLE_CITATION,
} from "./constants";

export type { LoadCalcSettings } from "./config";

/** Thrown when the input can't produce a load calc. The message says what to add. */
export class LoadCalcInputError extends Error {
  override name = "LoadCalcInputError";
}

const CHECK_RULE_ID = "shared.service_capacity";
const CHECK_TITLE = "Service capacity after the new load";

/** A connected load before demand factors. */
interface Item {
  label: string;
  va: number;
  citation: string;
  /** Set for heating/cooling loads only. */
  hvacMode: HvacMode | null;
}

interface NewItem extends Item {
  load: NewLoad;
  factor: number;
  controllable: boolean;
}

export function calculateLoad(
  input: LoadCalcInput,
  settings: Partial<LoadCalcSettings> = {},
): LoadCalcResult {
  const cfg: LoadCalcSettings = { ...DEFAULT_SETTINGS, ...settings };

  if (input?.home?.squareFeet === null || input?.home?.squareFeet === undefined) {
    throw new LoadCalcInputError(
      "Square footage is missing. The NEC 2026 120.83 calculation starts from the dwelling's floor area " +
        "(2 VA per sq ft). Add home.squareFeet (living space, outside dimensions) and run the calc again.",
    );
  }
  const parsed = LoadCalcInput.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`);
    throw new LoadCalcInputError(`Load calc input is invalid. ${issues.join("; ")}`);
  }
  const { service, home, newLoads } = parsed.data;
  const squareFeet = home.squareFeet as number;
  const voltage = service.voltage ?? cfg.defaultServiceVoltage;
  const steps: LoadCalcStep[] = [];

  // 1. Existing connected load.
  const smallApplianceCircuits = home.smallApplianceCircuits ?? MIN_SMALL_APPLIANCE_CIRCUITS;
  const laundryCircuits = home.laundryCircuits ?? MIN_LAUNDRY_CIRCUITS;
  const existing: Item[] = [
    {
      label: `General lighting and receptacles: ${fmt(squareFeet)} sq ft × ${GENERAL_LIGHTING_VA_PER_SQFT} VA/sq ft`,
      va: squareFeet * GENERAL_LIGHTING_VA_PER_SQFT,
      citation: GENERAL_LIGHTING_CITATION,
      hvacMode: null,
    },
    {
      label: `Small-appliance circuits: ${smallApplianceCircuits} × ${fmt(SMALL_APPLIANCE_CIRCUIT_VA)} VA${
        home.smallApplianceCircuits === undefined ? " (code minimum, not stated)" : ""
      }`,
      va: smallApplianceCircuits * SMALL_APPLIANCE_CIRCUIT_VA,
      citation: home.smallApplianceCircuits === undefined ? `${CIRCUIT_LOAD_CITATION}; ${MIN_CIRCUITS_CITATION}` : CIRCUIT_LOAD_CITATION,
      hvacMode: null,
    },
    {
      label: `Laundry circuits: ${laundryCircuits} × ${fmt(LAUNDRY_CIRCUIT_VA)} VA${
        home.laundryCircuits === undefined ? " (code minimum, not stated)" : ""
      }`,
      va: laundryCircuits * LAUNDRY_CIRCUIT_VA,
      citation: home.laundryCircuits === undefined ? `${CIRCUIT_LOAD_CITATION}; ${MIN_CIRCUITS_CITATION}` : CIRCUIT_LOAD_CITATION,
      hvacMode: null,
    },
    ...home.existingAppliances.map((a): Item => {
      const va = a.watts ?? (a.amps as number) * (a.volts as number);
      const how = a.watts !== undefined ? "nameplate" : `${fmt(a.amps as number)} A × ${fmt(a.volts as number)} V`;
      return {
        label: `${a.name} (${how})`,
        va,
        citation: APPLIANCE_CITATION,
        hvacMode: a.isHeatingOrCooling ? (a.hvacMode ?? "both") : null,
      };
    }),
  ];

  // 2. Added connected load, with its Table 120.83 factor.
  const added: NewItem[] = newLoads.map((load) => ({
    label: `${load.name} (${load.source})`,
    va: load.va,
    citation: TABLE_CITATION,
    hvacMode: load.isHeatingOrCooling ? (load.hvacMode ?? "both") : null,
    load,
    factor: NEW_LOAD_FACTORS[load.kind],
    controllable: load.controllable ?? load.kind === "evse",
  }));

  // 3. Heating vs cooling: drop the smaller noncoincident side (existing and new together).
  const omitted = noncoincidentOmissions([...existing, ...added]);

  for (const item of existing) {
    steps.push(
      omitted.has(item)
        ? omittedStep(item)
        : { label: item.label, va: round(item.va), citation: item.citation },
    );
  }

  const keptExisting = existing.filter((i) => !omitted.has(i));
  const keptAdded = added.filter((i) => !omitted.has(i));
  const existingConnectedVA = sum(keptExisting.map((i) => i.va));
  steps.push({ label: "Existing connected load", va: round(existingConnectedVA), citation: METHOD_CITATION });

  // 4. Demand factors.
  const demand = applyDemand(existingConnectedVA, keptAdded);

  steps.push({
    label: `First ${fmt(FIRST_TIER_VA)} VA of existing load at ${pct(FIRST_TIER_FACTOR)}`,
    va: round(demand.existingFirstTierVA),
    citation: TABLE_CITATION,
  });
  steps.push({
    label: `Remainder of existing load: ${fmt(round(demand.existingRemainderConnectedVA))} VA × ${pct(EXISTING_REMAINDER_FACTOR)}`,
    va: round(demand.existingRemainderVA),
    citation: TABLE_CITATION,
  });
  const existingVA = demand.existingFirstTierVA + demand.existingRemainderVA;
  steps.push({ label: "Existing calculated load", va: round(existingVA), citation: METHOD_CITATION });

  for (const item of added) {
    if (omitted.has(item)) {
      steps.push(omittedStep(item));
      continue;
    }
    const share = demand.addedShares.get(item) as { atFullVA: number; calculatedVA: number };
    const rest = item.va - share.atFullVA;
    const label =
      share.atFullVA > 0
        ? `${item.label}: ${fmt(round(share.atFullVA))} VA at ${pct(FIRST_TIER_FACTOR)} (first ${fmt(FIRST_TIER_VA)} VA)` +
          (rest > 0 ? ` + ${fmt(round(rest))} VA × ${pct(item.factor)}` : "")
        : `${item.label}: ${fmt(round(item.va))} VA × ${pct(item.factor)}`;
    steps.push({ label, va: round(share.calculatedVA), citation: item.citation });
  }
  const addedVA = demand.addedVA;
  steps.push({ label: "Added calculated load", va: round(addedVA), citation: METHOD_CITATION });

  // 5. Compare to the service.
  const totalVA = existingVA + addedVA;
  const totalAmps = totalVA / voltage;
  const percent = (totalAmps / service.ratingAmps) * 100;
  steps.push({ label: "Total calculated load", va: round(totalVA), citation: METHOD_CITATION });
  steps.push({
    label: `${fmt(round(totalVA))} VA ÷ ${fmt(voltage)} V = ${fmt(round(totalAmps, 1))} A on a ${fmt(service.ratingAmps)} A service`,
    va: round(totalVA),
    citation: METHOD_CITATION,
  });

  const result = classify(percent, cfg.tightThresholdPercent);
  steps.push({
    label: `${fmt(round(percent, 1))}% of rating: ${resultLabel(result)} (tight above ${cfg.tightThresholdPercent}%)`,
    va: round(totalVA),
    citation: TIGHT_THRESHOLD_CITATION,
  });

  // 6. Could a load management device avoid the upgrade? Recompute with controllable loads capped at 0.
  const hasControllable = keptAdded.some((i) => i.controllable && i.va > 0);
  const managed = applyDemand(existingConnectedVA, keptAdded.filter((i) => !i.controllable));
  const managedAmps = (managed.existingFirstTierVA + managed.existingRemainderVA + managed.addedVA) / voltage;
  const loadManagementTip = result !== "fits" && hasControllable && managedAmps <= service.ratingAmps;

  return {
    existingVA: round(existingVA),
    addedVA: round(addedVA),
    totalCalculatedVA: round(totalVA),
    totalAmps: round(totalAmps, 1),
    serviceAmps: service.ratingAmps,
    percentOfRating: round(percent, 1),
    result,
    utilityLikely: result === "needs_upgrade",
    loadManagementTip,
    steps,
    check: buildCheck({
      result,
      totalAmps,
      percent,
      serviceAmps: service.ratingAmps,
      threshold: cfg.tightThresholdPercent,
      loadManagementTip,
      controllableNames: keptAdded.filter((i) => i.controllable && i.va > 0).map((i) => i.load.name),
      standardSizes: cfg.standardServiceSizesAmps,
    }),
  };
}

/**
 * NEC 2026 120.83: the larger connected load of air-conditioning or space heating,
 * not both. Compare heating-only vs cooling-only connected VA and omit the smaller side.
 * "both" loads (heat pumps) are on both sides, so they always count. Ties keep heating.
 */
function noncoincidentOmissions(items: Item[]): Set<Item> {
  const heating = items.filter((i) => i.hvacMode === "heating");
  const cooling = items.filter((i) => i.hvacMode === "cooling");
  if (heating.length === 0 || cooling.length === 0) return new Set();
  const smaller = sum(heating.map((i) => i.va)) >= sum(cooling.map((i) => i.va)) ? cooling : heating;
  return new Set(smaller);
}

function omittedStep(item: Item): LoadCalcStep {
  const side = item.hvacMode === "cooling" ? "cooling" : "heating";
  return {
    label: `${item.label}: ${fmt(round(item.va))} VA omitted (${side} is the smaller of noncoincident heating and cooling)`,
    va: 0,
    citation: NONCOINCIDENT_CITATION,
  };
}

/** NEC 2026 Table 120.83. See FIRST_TIER_ALLOCATION_NOTE for how leftover first-tier VA is shared. */
function applyDemand(existingConnectedVA: number, added: NewItem[]) {
  const existingFirstTierVA = Math.min(existingConnectedVA, FIRST_TIER_VA) * FIRST_TIER_FACTOR;
  const existingRemainderConnectedVA = Math.max(existingConnectedVA - FIRST_TIER_VA, 0);
  const existingRemainderVA = existingRemainderConnectedVA * EXISTING_REMAINDER_FACTOR;

  let leftoverTier = Math.max(FIRST_TIER_VA - existingConnectedVA, 0);
  const addedShares = new Map<NewItem, { atFullVA: number; calculatedVA: number }>();
  // Lowest factor first gets the leftover 100% tier: the most conservative order.
  const byFactor = [...added].sort((a, b) => a.factor - b.factor);
  for (const item of byFactor) {
    const atFullVA = Math.min(item.va, leftoverTier);
    leftoverTier -= atFullVA;
    addedShares.set(item, {
      atFullVA,
      calculatedVA: atFullVA * FIRST_TIER_FACTOR + (item.va - atFullVA) * item.factor,
    });
  }
  const addedVA = sum([...addedShares.values()].map((s) => s.calculatedVA));
  return { existingFirstTierVA, existingRemainderConnectedVA, existingRemainderVA, addedShares, addedVA };
}

function classify(percent: number, tightThresholdPercent: number): LoadCalcOutcome {
  if (percent > 100) return "needs_upgrade";
  if (percent > tightThresholdPercent) return "tight";
  return "fits";
}

function resultLabel(result: LoadCalcOutcome): string {
  return { fits: "fits", tight: "tight", needs_upgrade: "needs a service upgrade" }[result];
}

function buildCheck(args: {
  result: LoadCalcOutcome;
  totalAmps: number;
  percent: number;
  serviceAmps: number;
  threshold: number;
  loadManagementTip: boolean;
  controllableNames: string[];
  standardSizes: readonly number[];
}): CheckResult {
  const amps = fmt(round(args.totalAmps, 1));
  const percent = fmt(round(args.percent, 1));
  const base = { ruleId: CHECK_RULE_ID, title: CHECK_TITLE, citation: `${METHOD_CITATION} (${ADOPTING_REGULATION})` };
  const managed = args.controllableNames.join(" and ");
  const tip = args.loadManagementTip
    ? ` A listed power control system that caps ${managed} (${LOAD_MANAGEMENT_CITATION}) would keep the calculated load within the ${args.serviceAmps} A rating.`
    : "";

  if (args.result === "fits") {
    return {
      ...base,
      status: "pass",
      message: `Calculated load is ${amps} A, ${percent}% of the ${args.serviceAmps} A service.`,
      suggestedFix: null,
    };
  }
  if (args.result === "tight") {
    return {
      ...base,
      status: "warn",
      message:
        `Calculated load is ${amps} A, ${percent}% of the ${args.serviceAmps} A service. ` +
        `That is within the rating but above PermitPike's ${args.threshold}% planning threshold (not a code limit).`,
      suggestedFix: `Confirm the load inputs with the electrician; little headroom is left for future loads.${tip}`,
    };
  }
  const minAmps = Math.ceil(args.totalAmps);
  const nextSize = args.standardSizes.find((s) => s >= minAmps);
  const upgrade = nextSize
    ? `Upgrade the service to at least ${minAmps} A (next common size: ${nextSize} A) and coordinate with the utility.`
    : `Upgrade the service to at least ${minAmps} A and coordinate with the utility.`;
  return {
    ...base,
    status: "fail",
    message: `Calculated load is ${amps} A, ${percent}% of the ${args.serviceAmps} A service. The service is overloaded.`,
    suggestedFix: args.loadManagementTip ? `${tip.trim()} Otherwise: ${upgrade}` : upgrade,
  };
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function round(n: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function pct(factor: number): string {
  return `${Math.round(factor * 100)}%`;
}
