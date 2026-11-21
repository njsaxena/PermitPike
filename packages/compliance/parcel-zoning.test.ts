import assert from "node:assert/strict";
import { test } from "node:test";
import { lookupParcelZoning } from "./parcel-zoning";

const assessment = (id: string, zip: string) => ({
  attributes: { map_par_id: id, st_num: 300, st_num2: null, st_name: "WASHINGTON ST", city: "BOSTON", zip_code: zip },
});

test("an ambiguous address returns candidate parcels without querying zoning", async () => {
  let calls = 0;
  const fetchPublisher: typeof fetch = async () => {
    calls++;
    return Response.json({ features: [assessment("1401185000", "02121"), assessment("2205503000", "02135")] });
  };

  const result = await lookupParcelZoning({ street: "300 Washington Street" }, fetchPublisher);

  assert.equal(result.status, "ambiguous_address");
  assert.deepEqual(result.candidates?.map(({ parcelId }) => parcelId), ["1401185000", "2205503000"]);
  assert.equal(calls, 1);
});

test("the full parcel boundary is checked and both zones are reported", async () => {
  const rings = [[[1, 1], [1, 2], [2, 2], [2, 1], [1, 1]]];
  const fetchPublisher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname.includes("/Assessing/")) {
      assert.match(url.searchParams.get("where") ?? "", /zip_code = '02121'/u);
      return Response.json({ features: [assessment("1401185000", "02121"), assessment("1401185000", "02121")] });
    }
    if (url.pathname.includes("/Parcels/")) return Response.json({ features: [{ geometry: { rings } }] });
    assert.ok(init?.body instanceof URLSearchParams);
    assert.equal(init.method, "POST");
    assert.deepEqual(JSON.parse(init.body.get("geometry") ?? "").rings, rings);
    if (url.pathname.endsWith("/identify")) {
      return Response.json({ results: [{ layerId: 1, layerName: "Coastal Flood Resilience Overlay District" }] });
    }
    return Response.json({
      features: ["3F-5000", "2F-5000"].map((name) => ({
        attributes: { Zoning_District: "Dorchester Neighborhood", Zoning_Subdistrict: name, Article: "65", Map_Number: "5A-5E" },
      })),
    });
  };

  const result = await lookupParcelZoning({ street: "300 Washington Street", zip: "02121" }, fetchPublisher);

  assert.equal(result.status, "multiple_zones");
  assert.deepEqual(result.districts?.map(({ subdistrict }) => subdistrict), ["3F-5000", "2F-5000"]);
  assert.match(result.districts?.[0]?.tablesUrl ?? "", /nodeId=ART65TA$/u);
  assert.match(result.possibleOverlayIntersections?.[0]?.codeUrl ?? "", /nodeId=ART25A/u);
});

test("a failed overlay request does not look like a parcel with no overlays", async () => {
  const fetchPublisher: typeof fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    if (path.includes("/Assessing/")) return Response.json({ features: [assessment("1401185000", "02121")] });
    if (path.includes("/Parcels/")) {
      return Response.json({ features: [{ geometry: { rings: [[[1, 1], [1, 2], [2, 2], [1, 1]]] } }] });
    }
    if (path.endsWith("/identify")) return Response.json({ error: { code: 500 } });
    return Response.json({
      features: [{ attributes: { Zoning_District: "Dorchester Neighborhood", Zoning_Subdistrict: "3F-5000", Article: "65", Map_Number: "5A-5E" } }],
    });
  };

  const result = await lookupParcelZoning({ parcelId: "1401185000" }, fetchPublisher);

  assert.equal(result.status, "partial");
  assert.equal(result.districts?.length, 1);
  assert.equal(result.possibleOverlayIntersections, null);
});
