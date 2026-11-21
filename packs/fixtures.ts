/** Baseline applications for tests: every rule passes unless a test overrides a field. */
import type { EvChargerFields, ExistingLoadInputs, HeatPumpPanelFields, HomeBatteryFields } from "@permitpike/contract";

const existingLoad: ExistingLoadInputs = {
  dwellingSqFt: 1800,
  smallApplianceCircuits: 2,
  hasLaundryCircuit: true,
  fixedAppliancesVA: 6000,
  existingHvacVA: 0,
  measuredPeakDemandKW: null,
};

const service = {
  serviceVoltage: 240,
  existingServiceAmps: 200,
  existingPanelRatingAmps: 200,
  mainBreakerAmps: 200,
  availableBreakerSpaces: 4,
  panelWorkingClearanceIn: 36,
  existingLoad,
};

export function heatPumpFields(overrides: Partial<HeatPumpPanelFields> = {}): HeatPumpPanelFields {
  return {
    jobType: "heat_pump_panel",
    ...service,
    heatPump: {
      manufacturer: "Example HVAC Co.",
      model: "EX-24H",
      coolingBTU: 24000,
      heatingBTU: 26000,
      voltage: 240,
      mcaAmps: 18,
      mocpAmps: 25,
    },
    proposedBreakerAmps: 25,
    conductorAWG: "10 AWG Cu",
    disconnectWithinSight: true,
    outdoorUnitSetbackFt: 8,
    panelUpgrade: null,
    ...overrides,
  };
}

export function evChargerFields(overrides: Partial<EvChargerFields> = {}): EvChargerFields {
  return {
    jobType: "ev_charger",
    ...service,
    charger: {
      manufacturer: "Example EV Co.",
      model: "Home 48",
      outputAmps: 40,
      voltage: 240,
      connection: "hardwired",
    },
    proposedBreakerAmps: 50,
    conductorAWG: "6 AWG Cu",
    installLocation: "garage",
    gfciProtected: null,
    outdoorRated: null,
    hasLoadManagement: false,
    setbackFt: null,
    ...overrides,
  };
}

export function homeBatteryFields(overrides: Partial<HomeBatteryFields> = {}): HomeBatteryFields {
  return {
    jobType: "home_battery",
    ...service,
    battery: {
      manufacturer: "Example Storage Co.",
      model: "Wall 13",
      capacityKWh: 13.5,
      continuousOutputW: 5000,
      ul9540Listed: true,
    },
    hasSolar: false,
    interconnection: "backup_only",
    backfeedBreakerAmps: null,
    installLocation: "garage",
    clearanceToOpeningsFt: 5,
    ...overrides,
  };
}
