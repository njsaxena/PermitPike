// Keep the prompts in the agent bundle so deployed extraction does not need asset files.
export const prompts = {
  ev_charger: `# EV charger

Read the manufacturer, model, maximum continuous output current, rated voltage, and explicitly stated connection method. A plug-in connection maps to \`receptacle\`. Keep output current and the required installation breaker distinct. If the installation breaker value is explicitly given for the target configuration, record it as \`proposedBreakerAmps\`. Report load management only if the document states whether it is present or enabled for the application. If a datasheet offers alternative voltages, wiring options, or configurations with different ratings, do not choose among them.
`,
  heat_pump: `# Heat pump and panel

Read the outdoor unit's manufacturer, model, rated voltage, and rated cooling and heating capacities.

- MCA means Minimum Circuit Ampacity. Read the value labeled MCA or Minimum Circuit Ampacity into \`heatPump.mcaAmps\`.
- MOCP means Maximum Overcurrent Protection. Read the value labeled MOCP, MOP, or Maximum Fuse/Breaker into \`heatPump.mocpAmps\`. A proposed installation breaker belongs under \`proposedBreakerAmps\` only when explicitly specified for this installation.
- Keep values tied to the same outdoor model and rating row. If there are several models and the rating differs, a model number is needed before that field can be extracted. Do not substitute an indoor unit or a value at a different operating condition.
- Read \`heatPump.backupHeatKW\` only for an explicitly specified electric resistance backup heater or heat strip.
- Read panel, service, site, and existing load fields only if the document explicitly states them. An equipment voltage is not the house service voltage.
`,
  home_battery: `# Home battery

Read the manufacturer, model, energy capacity, and continuous power output. Energy capacity in kWh is separate from power in W or kW. Never substitute peak or surge output for continuous power. Read \`backfeedBreakerAmps\` only for a stated backfeed breaker rating. Read solar pairing, interconnection, installation location, and clearances only if they are documented for the actual installation. A generic compatibility list does not confirm what was installed.
`,
  panel: `# Panel label or service/load worksheet

Read the existing main breaker rating, panel bus rating, service voltage, and available breaker spaces where shown. A maximum bus rating does not identify the installed main breaker or service rating. The number of spaces the panel can contain is not the number of available spaces. Read existing load or proposed service ratings only from explicitly labeled values on the worksheet or plan. A label may identify compatible replacements without identifying installed equipment.
`,
} as const;
