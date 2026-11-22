import type { ExtractedFields } from "@permitpike/contract";

/**
 * Turns an application's extracted fields into labeled, grouped rows for reading.
 * Row keys are the same dot paths the extraction uses ("heatPump.mcaAmps"), so a
 * caller can flag the rows a check failed on.
 */

export interface FieldRow {
  /** Dot path into ExtractedFields. */
  key: string;
  label: string;
  /** Display value with its unit, e.g. "240 V". Null when the documents did not show it. */
  value: string | null;
}

export interface FieldGroup {
  title: string;
  rows: FieldRow[];
}

const n = (v: number) => v.toLocaleString("en-US");
const unit = (v: number | null, u: string) => (v === null ? null : `${n(v)} ${u}`);
const yesNo = (v: boolean | null) => (v === null ? null : v ? "Yes" : "No");
const words = (v: string) => v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const make = (manufacturer: string | null, model: string | null) =>
  [manufacturer, model].filter(Boolean).join(" ") || null;

export function fieldGroups(f: ExtractedFields): FieldGroup[] {
  const service: FieldGroup = {
    title: "Service and panel",
    rows: [
      { key: "serviceVoltage", label: "Service voltage", value: unit(f.serviceVoltage, "V") },
      { key: "existingServiceAmps", label: "Service rating", value: unit(f.existingServiceAmps, "A") },
      { key: "existingPanelRatingAmps", label: "Panel rating", value: unit(f.existingPanelRatingAmps, "A") },
      { key: "mainBreakerAmps", label: "Main breaker", value: unit(f.mainBreakerAmps, "A") },
      { key: "availableBreakerSpaces", label: "Open breaker spaces", value: n(f.availableBreakerSpaces) },
      { key: "panelWorkingClearanceIn", label: "Working clearance", value: unit(f.panelWorkingClearanceIn, "in") },
    ],
  };

  const l = f.existingLoad;
  const load: FieldGroup = {
    title: "Existing load",
    rows: [
      { key: "existingLoad.dwellingSqFt", label: "Living area", value: unit(l.dwellingSqFt, "sq ft") },
      { key: "existingLoad.smallApplianceCircuits", label: "Small-appliance circuits", value: l.smallApplianceCircuits === null ? null : n(l.smallApplianceCircuits) },
      { key: "existingLoad.hasLaundryCircuit", label: "Laundry circuit", value: yesNo(l.hasLaundryCircuit) },
      { key: "existingLoad.fixedAppliancesVA", label: "Fixed appliances", value: unit(l.fixedAppliancesVA, "VA") },
      { key: "existingLoad.existingHvacVA", label: "Existing heating and cooling", value: unit(l.existingHvacVA, "VA") },
      { key: "existingLoad.measuredPeakDemandKW", label: "Measured peak demand", value: unit(l.measuredPeakDemandKW, "kW") },
    ],
  };

  switch (f.jobType) {
    case "heat_pump_panel": {
      const hp = f.heatPump;
      return [
        {
          title: "Heat pump",
          rows: [
            { key: "heatPump.model", label: "Make and model", value: make(hp.manufacturer, hp.model) },
            { key: "heatPump.coolingBTU", label: "Cooling", value: unit(hp.coolingBTU, "BTU/h") },
            { key: "heatPump.heatingBTU", label: "Heating", value: unit(hp.heatingBTU, "BTU/h") },
            { key: "heatPump.voltage", label: "Voltage", value: unit(hp.voltage, "V") },
            { key: "heatPump.mcaAmps", label: "Minimum circuit ampacity", value: unit(hp.mcaAmps, "A") },
            { key: "heatPump.mocpAmps", label: "Maximum overcurrent protection", value: unit(hp.mocpAmps, "A") },
          ],
        },
        {
          title: "Installation",
          rows: [
            { key: "proposedBreakerAmps", label: "Proposed breaker", value: unit(f.proposedBreakerAmps, "A") },
            { key: "conductorAWG", label: "Conductor", value: f.conductorAWG && `${f.conductorAWG} AWG` },
            { key: "disconnectWithinSight", label: "Disconnect within sight", value: yesNo(f.disconnectWithinSight) },
            { key: "gfciProtected", label: "GFCI protected", value: yesNo(f.gfciProtected ?? null) },
            { key: "outdoorUnitSetbackFt", label: "Outdoor unit to property line", value: unit(f.outdoorUnitSetbackFt, "ft") },
            {
              key: "panelUpgrade",
              label: "Panel upgrade",
              value: f.panelUpgrade
                ? `${n(f.panelUpgrade.proposedPanelRatingAmps)} A panel, ${n(f.panelUpgrade.proposedServiceAmps)} A service`
                : "None",
            },
          ],
        },
        service,
        load,
      ];
    }
    case "ev_charger": {
      const c = f.charger;
      return [
        {
          title: "Charger",
          rows: [
            { key: "charger.model", label: "Make and model", value: make(c.manufacturer, c.model) },
            { key: "charger.outputAmps", label: "Continuous output", value: unit(c.outputAmps, "A") },
            { key: "charger.voltage", label: "Voltage", value: unit(c.voltage, "V") },
            { key: "charger.connection", label: "Connection", value: words(c.connection) },
          ],
        },
        {
          title: "Installation",
          rows: [
            { key: "proposedBreakerAmps", label: "Proposed breaker", value: unit(f.proposedBreakerAmps, "A") },
            { key: "conductorAWG", label: "Conductor", value: f.conductorAWG && `${f.conductorAWG} AWG` },
            { key: "installLocation", label: "Location", value: words(f.installLocation) },
            { key: "gfciProtected", label: "GFCI protected", value: yesNo(f.gfciProtected) },
            { key: "outdoorRated", label: "Outdoor rated", value: yesNo(f.outdoorRated) },
            { key: "hasLoadManagement", label: "Load management", value: yesNo(f.hasLoadManagement) },
            ...(f.installLocation === "pedestal"
              ? [{ key: "setbackFt", label: "Pedestal setback", value: unit(f.setbackFt, "ft") }]
              : []),
          ],
        },
        service,
        load,
      ];
    }
    case "home_battery": {
      const b = f.battery;
      return [
        {
          title: "Battery",
          rows: [
            { key: "battery.model", label: "Make and model", value: make(b.manufacturer, b.model) },
            { key: "battery.capacityKWh", label: "Capacity", value: unit(b.capacityKWh, "kWh") },
            { key: "battery.continuousOutputW", label: "Continuous output", value: unit(b.continuousOutputW, "W") },
            { key: "battery.ul9540Listed", label: "UL 9540 listed", value: yesNo(b.ul9540Listed) },
          ],
        },
        {
          title: "Installation",
          rows: [
            { key: "interconnection", label: "Interconnection", value: words(f.interconnection) },
            { key: "backfeedBreakerAmps", label: "Backfeed breaker", value: unit(f.backfeedBreakerAmps, "A") },
            { key: "hasSolar", label: "Solar on site", value: yesNo(f.hasSolar) },
            { key: "installLocation", label: "Location", value: words(f.installLocation) },
            { key: "clearanceToOpeningsFt", label: "Distance to doors and windows", value: unit(f.clearanceToOpeningsFt, "ft") },
          ],
        },
        service,
        load,
      ];
    }
  }
}
