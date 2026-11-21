import type { JobType } from "@permitpike/contract";
import { heatPumpPanelPack } from "./heat_pump_panel";
import type { RulePack } from "./types";

export * from "./types";
export { heatPumpPanelPack } from "./heat_pump_panel";

/**
 * Registry of packs by job type.
 * TODO: add ev_charger.ts and home_battery.ts using heat_pump_panel.ts as the template.
 */
export const PACKS: { [J in JobType]?: RulePack<J> } = {
  heat_pump_panel: heatPumpPanelPack,
};

export function getPack<J extends JobType>(jobType: J): RulePack<J> {
  const pack = PACKS[jobType];
  if (!pack) throw new Error(`No rule pack registered for job type "${jobType}"`);
  return pack as RulePack<J>;
}
