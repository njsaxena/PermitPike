/**
 * pnpm --filter @permitpike/web cache:parcels
 * Looks up the demo addresses with the live city lookup and writes the results to
 * lib/parcel/demo-parcels.json, so the map loads on stage even without network.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Parcel } from "@permitpike/contract";
import { resolveParcel } from "../lib/parcel/resolve";
import { MOCK_APPLICATIONS } from "../mocks/applications";

async function main() {
  const parcels: Parcel[] = [];
  for (const { application: a } of MOCK_APPLICATIONS) {
    const r = await resolveParcel({ address: a.address.street, zip: a.address.zip }, 20_000);
    if (r.result !== "found") throw new Error(`${a.address.street} ${a.address.zip}: ${r.result}`);
    console.log(`${a.address.street} ${a.address.zip} -> ${r.parcel.parcelId} ${r.parcel.districts[0]?.subdistrict ?? ""}`);
    parcels.push(r.parcel);
  }
  const out = resolve(import.meta.dirname, "../lib/parcel/demo-parcels.json");
  writeFileSync(out, `${JSON.stringify(parcels, null, 2)}\n`);
  console.log(`wrote ${parcels.length} parcels to ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
