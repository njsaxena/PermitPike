import type { JobType } from "@permitpike/contract";

/*
 * Clean-energy programs to look at while a permit is in review. Chosen from the job
 * type alone, never from the city's review, so the list is the same from the moment
 * of filing. Official program pages only, no dollar amounts: amounts and deadlines
 * change, and the program page is the source of truth. Links checked 2026-11-21.
 */

export type Program = {
  name: string;
  /** One line, no amounts. */
  line: string;
  /** The program's own page. */
  url: string;
};

const HEAT_PUMP: Program = {
  name: "Mass Save heat pump rebates",
  line: "Rebates for installing a qualifying heat pump, from the state's utility efficiency program.",
  url: "https://www.masssave.com/residential/rebates-offers-services/heating-and-cooling/heat-pumps",
};

const EV_MASS_SAVE: Program = {
  name: "Mass Save EV charging equipment",
  line: "Offers on qualifying home EV chargers and related equipment.",
  url: "https://www.masssave.com/residential/rebates-offers-services/battery-storage-and-evs/ev-charging-equipment",
};

const EV_EVERSOURCE: Program = {
  name: "Eversource EV home charging",
  line: "Eversource's home charging program for Massachusetts customers. Check whether it is open for this year.",
  url: "https://www.eversource.com/residential/save-money-energy/clean-energy-options/electric-vehicles/charging-stations",
};

const CONNECTED_SOLUTIONS: Program = {
  name: "ConnectedSolutions",
  line: "Payments for letting your utility draw on your home battery during peak demand.",
  url: "https://www.masssave.com/residential/rebates-offers-services/connectedsolutions",
};

const HOME_ENERGY_ASSESSMENT: Program = {
  name: "Mass Save home energy assessment",
  line: "A no-cost visit, virtual or in person, that finds where the home loses energy.",
  url: "https://www.masssave.com/residential/rebates-offers-services/home-energy-assessments",
};

const BY_JOB: Record<JobType, Program[]> = {
  heat_pump_panel: [HEAT_PUMP],
  ev_charger: [EV_MASS_SAVE, EV_EVERSOURCE],
  home_battery: [CONNECTED_SOLUTIONS],
};

export const ELIGIBILITY_NOTE = "Eligibility rules apply.";

/** The job's own programs first, then the assessment every job gets. */
export function programsFor(jobType: JobType): Program[] {
  return [...BY_JOB[jobType], HOME_ENERGY_ASSESSMENT];
}
