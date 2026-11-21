/**
 * Product settings for the load calc. None of these come from the electrical code.
 * Code-derived numbers live in constants.ts.
 */

export interface LoadCalcSettings {
  /**
   * Above this percent of the service rating, a load that is within code is
   * flagged "tight". A PermitPike planning threshold, NOT a code rule.
   */
  tightThresholdPercent: number;
  /** Used when the application doesn't state the service voltage. */
  defaultServiceVoltage: number;
  /** Common residential service sizes, for the "upgrade to at least" suggestion. */
  standardServiceSizesAmps: readonly number[];
}

export const DEFAULT_SETTINGS: LoadCalcSettings = {
  tightThresholdPercent: 80,
  defaultServiceVoltage: 240,
  standardServiceSizesAmps: [100, 125, 150, 200, 225, 300, 400],
};

/** Shown on the step that applies the threshold, so nobody mistakes it for code. */
export const TIGHT_THRESHOLD_CITATION = "PermitPike setting (not a code rule)";
