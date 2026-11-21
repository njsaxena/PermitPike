import type { JobType } from "@permitpike/contract";
import { evChargerPack } from "./ev_charger";
import { heatPumpPanelPack } from "./heat_pump_panel";
import { homeBatteryPack } from "./home_battery";
import type { RulePack } from "./types";

export * from "./types";
export { evChargerPack } from "./ev_charger";
export { heatPumpPanelPack } from "./heat_pump_panel";
export { homeBatteryPack } from "./home_battery";
export { decide, reviewFields, runLoadCalc, type Review } from "./load";

/** Registry of packs by job type. */
export const PACKS: { [J in JobType]: RulePack<J> } = {
  heat_pump_panel: heatPumpPanelPack,
  ev_charger: evChargerPack,
  home_battery: homeBatteryPack,
};

export function getPack<J extends JobType>(jobType: J): RulePack<J> {
  const pack = PACKS[jobType];
  if (!pack) throw new Error(`No rule pack registered for job type "${jobType}"`);
  return pack as RulePack<J>;
}
