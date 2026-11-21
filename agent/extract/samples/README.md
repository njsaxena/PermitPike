# Extraction samples

The 15 fixtures are original, synthetic documents with hand-labeled answers. The brands, ratings, labels, and intake details are fictional and intended for extraction testing only. The panel images are simulated label crops. No one needed to open a panel or provide a personal photo.

| Files | Coverage |
| --- | --- |
| Four heat-pump submittals | Separate MCA and MOCP, a missing MOCP, tons-to-BTU/h conversion, and a two-model table with `ST-36` selected |
| Three EV charger sheets | Output current vs. required breaker, plug-in vs. hardwired, and true, false, and absent load-management values |
| Two battery sheets | Continuous output in watts or kilowatts, an accessory fuse, and device voltage without service voltage |
| Three panel label images | Main breaker, busbar and service ratings, service voltage, and an open-space count of zero |
| One heat-pump intake worksheet | Existing load, heat-pump ratings, and an explicit proposed breaker |
| Two bad inputs | Obscured values in a blurred, rotated label, and a shipment inventory submitted as an EV charger sheet |

`answers.json` lists the sample file, extraction job, whether the input is clean, any model selection, and the expected values by contract field path. Use `null` for a field deliberately absent from the document. Omitted fields are unscored. Units are canonical for the contract, including BTU/h for heat-pump capacity and watts for `battery.continuousOutputW`.

Representative manufacturer references for additional local testing include the [Mitsubishi Electric GL18 submittal](https://www.mitsubishitechinfo.ca/sites/default/files/SB_MSZ-GL18NA-U1_MUZ-GL18NAH-U1_202403.pdf), the [ChargePoint Home Flex data sheet](https://docs.chargepoint.com/ref-docs/content/pdfs/1/home/flex/flex-ds.pdf), and the [Tesla Powerwall 3 data sheet](https://energylibrary.tesla.com/docs/Public/EnergyStorage/Powerwall/3/Datasheet/en-us/Powerwall-3-Datasheet.pdf). The bundled fixtures contain original layouts and values.
