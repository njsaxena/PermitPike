import { BatteryCharging, Fan, PlugZap, type LucideIcon } from "lucide-react";
import type { JobType } from "@permitpike/contract";

/** One icon per kind of job, everywhere it is shown (filing, the permit heading). */
export const JOB_ICON: Record<JobType, LucideIcon> = {
  heat_pump_panel: Fan,
  ev_charger: PlugZap,
  home_battery: BatteryCharging,
};
