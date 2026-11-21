/**
 * Conductor ampacities for the branch circuit checks.
 *
 * NEC Table 310.16, 30 °C ambient, not more than three current-carrying conductors.
 * 527 CMR 12.00 does not amend Table 310.16; it only revises the Table 310.15(C)(1)
 * adjustment factors (confirmed with get_compliance_source on "ma-electrical-code").
 * VERIFY: values below are the NEC 2023 table; the NEC 2026 base text is not in the
 * compliance catalog. No ambient or bundling adjustment is applied.
 */

export type ConductorMaterial = "cu" | "al";
export type TerminationRating = 60 | 75;

export interface Conductor {
  /** AWG size as printed, e.g. "8" or "1/0". */
  size: string;
  material: ConductorMaterial;
}

/** Smallest to largest. */
const SIZES = ["14", "12", "10", "8", "6", "4", "3", "2", "1", "1/0", "2/0", "3/0", "4/0"] as const;

const AMPACITY: Record<ConductorMaterial, Record<TerminationRating, Partial<Record<string, number>>>> = {
  cu: {
    60: { "14": 15, "12": 20, "10": 30, "8": 40, "6": 55, "4": 70, "3": 85, "2": 95, "1": 110, "1/0": 125, "2/0": 145, "3/0": 165, "4/0": 195 },
    75: { "14": 20, "12": 25, "10": 35, "8": 50, "6": 65, "4": 85, "3": 100, "2": 115, "1": 130, "1/0": 150, "2/0": 175, "3/0": 200, "4/0": 230 },
  },
  al: {
    60: { "12": 15, "10": 25, "8": 35, "6": 40, "4": 55, "3": 65, "2": 75, "1": 85, "1/0": 100, "2/0": 115, "3/0": 130, "4/0": 150 },
    75: { "12": 20, "10": 30, "8": 40, "6": 50, "4": 65, "3": 75, "2": 90, "1": 100, "1/0": 120, "2/0": 135, "3/0": 155, "4/0": 180 },
  },
};

/**
 * Reads sizes like "8 AWG", "#10 Cu", "10/2 NM-B", "6 AWG THHN", "2/0 AL". Copper unless it says aluminum.
 * Returns null when the size isn't in the table.
 */
export function parseConductor(text: string): Conductor | null {
  // Cable notation "10/2 w/g" names the conductor size first; "1/0" and "2/0" are sizes.
  const t = text.trim().toLowerCase().replace(/\b(\d{1,2})\/[234]\b/, "$1 ");
  const match = t.match(/(?:^|[^\d/])#?\s*(\d\/0|\d{1,2})(?=\s|$|[^\d/])/);
  if (!match) return null;
  const size = match[1] as string;
  const material: ConductorMaterial = /\b(al|alum|aluminum|aluminium)\b/.test(t) ? "al" : "cu";
  if (AMPACITY[material][75][size] === undefined) return null;
  return { size, material };
}

export function conductorAmpacity(c: Conductor, rating: TerminationRating): number {
  return AMPACITY[c.material][rating][c.size] ?? 0;
}

/** Smallest AWG size whose ampacity at `rating` is at least `amps`, or null if none in the table. */
export function smallestConductorFor(amps: number, material: ConductorMaterial, rating: TerminationRating): string | null {
  return SIZES.find((s) => (AMPACITY[material][rating][s] ?? 0) >= amps) ?? null;
}
