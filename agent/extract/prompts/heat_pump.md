# Heat pump and panel

Read the outdoor unit's manufacturer, model, rated voltage, and rated cooling and heating capacities.

- MCA means Minimum Circuit Ampacity. Read the value labeled MCA or Minimum Circuit Ampacity into `heatPump.mcaAmps`.
- MOCP means Maximum Overcurrent Protection. Read the value labeled MOCP, MOP, or Maximum Fuse/Breaker into `heatPump.mocpAmps`. A proposed installation breaker belongs under `proposedBreakerAmps` only when explicitly specified for this installation.
- Keep values tied to the same outdoor model and rating row. If there are several models and the rating differs, a model number is needed before that field can be extracted. Do not substitute an indoor unit or a value at a different operating condition.
- Read `heatPump.backupHeatKW` only for an explicitly specified electric resistance backup heater or heat strip.
- Read panel, service, site, and existing load fields only if the document explicitly states them. An equipment voltage is not the house service voltage.
