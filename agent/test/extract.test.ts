import type { Content } from "@google/genai";
import { Extraction, type FileKind, type FileRef } from "@permitpike/contract";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test, type TestContext } from "node:test";
import { IncompleteExtractionError } from "../extract";
import type { Evidence, FieldReading } from "../extract/evidence";
import { extract } from "../src/extract";

const jobType = "heat_pump_panel";
const model = "gemini-test-model";

function fixture(name: string, kind: FileKind, host: string) {
  const bytes = readFileSync(new URL(`../extract/samples/${name}`, import.meta.url));
  const ref: FileRef = {
    id: name,
    kind,
    name,
    url: `https://${host}/permits/${name}`,
    contentType: "application/pdf",
    sizeBytes: bytes.length,
    uploadedAt: "2026-11-21T15:00:00.000Z",
  };
  return { ref, bytes };
}

const spec = fixture("hp_cedarterm_ct-h18.pdf", "spec_sheet", "fixture.public.blob.vercel-storage.com");
const worksheet = fixture("heat_pump_intake_worksheet.pdf", "load_calc", "fixture.blob.vercel-storage.com");
const documents = [spec, worksheet];
const files = documents.map(({ ref }) => ref);

const missing: FieldReading = { value: null, unit: null, confidence: 0, source: "not found" };

function reading(value: NonNullable<FieldReading["value"]>, source: string, unit: string | null = null): FieldReading {
  return { value, unit, confidence: 0.95, source };
}

const readings: Evidence = {
  serviceVoltage: reading(240, "Service voltage 240 V", "V"),
  existingServiceAmps: reading(150, "Existing service rating 150 A", "A"),
  existingPanelRatingAmps: reading(200, "Existing panel busbar rating 200 A", "A"),
  mainBreakerAmps: reading(150, "Main breaker rating 150 A", "A"),
  availableBreakerSpaces: reading(2, "Open breaker spaces 2"),
  panelWorkingClearanceIn: missing,
  "existingLoad.dwellingSqFt": reading(1700, "Dwelling area 1,700 sq ft", "sq ft"),
  "existingLoad.smallApplianceCircuits": reading(2, "Small appliance circuit count 2"),
  "existingLoad.hasLaundryCircuit": reading(true, "Laundry circuit present Yes"),
  "existingLoad.fixedAppliancesVA": reading(4500, "Total fixed appliance load 4,500 VA", "VA"),
  "existingLoad.existingHvacVA": reading(2300, "Existing HVAC remaining in service 2,300 VA", "VA"),
  "existingLoad.measuredPeakDemandKW": missing,
  "heatPump.manufacturer": reading("CedarTerm", "Manufacturer CedarTerm"),
  "heatPump.model": reading("CT-H18", "Outdoor unit model CT-H18"),
  "heatPump.coolingBTU": reading(18000, "Rated cooling capacity 18,000 BTU/h", "BTU/h"),
  "heatPump.heatingBTU": reading(20000, "Rated heating capacity 20,000 BTU/h", "BTU/h"),
  "heatPump.voltage": reading(230, "Unit supply voltage 230 V", "V"),
  "heatPump.mcaAmps": reading(15, "Minimum circuit ampacity (MCA) 15 A", "A"),
  "heatPump.mocpAmps": reading(25, "Maximum overcurrent protection (MOCP) 25 A", "A"),
  "heatPump.backupHeatKW": missing,
  proposedBreakerAmps: reading(20, "Proposed breaker 20 A", "A"),
  conductorAWG: missing,
  disconnectWithinSight: missing,
  gfciProtected: missing,
  outdoorUnitSetbackFt: missing,
  "panelUpgrade.proposedPanelRatingAmps": missing,
  "panelUpgrade.proposedServiceAmps": missing,
};

function mockGemini(context: TestContext, fields: Evidence) {
  for (const [key, value] of Object.entries({ GOOGLE_GENERATIVE_AI_API_KEY: "fake-gemini-key", GEMINI_MODEL: model })) {
    const original = process.env[key];
    process.env[key] = value;
    context.after(() => {
      if (original === undefined) delete process.env[key];
      else process.env[key] = original;
    });
  }
  return context.mock.method(globalThis, "fetch", async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ) => {
    const url = new URL(input instanceof Request ? input.url : input);
    const document = documents.find(({ ref }) => ref.url === url.href);
    if (document) {
      assert.equal(init?.redirect, "error");
      return new Response(new Uint8Array(document.bytes), { headers: { "content-type": document.ref.contentType } });
    }

    assert.equal(url.hostname, "generativelanguage.googleapis.com");
    assert.ok(url.pathname.endsWith(`/models/${model}:generateContent`));
    assert.equal(init?.method, "POST");
    assert.ok(typeof init?.body === "string");
    const request = JSON.parse(init.body) as { contents: Content[] };
    const parts = request.contents.flatMap(({ parts }) => parts ?? []);
    const sent = parts.flatMap(({ inlineData }) => inlineData ? [inlineData] : []);
    assert.deepEqual(sent, documents.map(({ ref, bytes }) => ({
      mimeType: ref.contentType,
      data: bytes.toString("base64"),
    })));

    const text = JSON.stringify({ fields, needsModelNumber: false });
    return Response.json({ candidates: [{ content: { role: "model", parts: [{ text }] } }] });
  });
}

test("uploaded spec and worksheet produce a contract-valid Gemini extraction together", async (context) => {
  const fetch = mockGemini(context, readings);
  const result = Extraction.parse(await extract(files, jobType));
  assert.equal(fetch.mock.callCount(), 3);
  assert.equal(result.model, model);
  assert.ok(result.fields.jobType === jobType);
  assert.equal(result.fields.existingLoad.dwellingSqFt, 1700);
  assert.equal(result.fields.existingLoad.hasLaundryCircuit, true);
  assert.equal(result.fields.heatPump.mcaAmps, 15);
  assert.equal(result.fields.proposedBreakerAmps, 20);
  assert.equal(result.fields.gfciProtected, null);
  assert.equal(result.fields.outdoorUnitSetbackFt, null);
  assert.equal(result.fieldConfidence["heatPump.mcaAmps"], 0.95);
  assert.ok(result.missingFields.includes("outdoorUnitSetbackFt"));
  assert.ok(!result.missingFields.includes("existingLoad.dwellingSqFt"));
});

test("Gemini cannot produce an application extraction without required evidence", async (context) => {
  const fetch = mockGemini(context, { ...readings, "existingLoad.dwellingSqFt": missing });
  await assert.rejects(extract(files, jobType), IncompleteExtractionError);
  assert.equal(fetch.mock.callCount(), 3);
});

test("an uncertain reading holds the application for manual review", async (context) => {
  mockGemini(context, {
    ...readings,
    panelWorkingClearanceIn: { ...reading(36, "Working clearance 36 in", "in"), confidence: 0.6 },
  });
  await assert.rejects(extract(files, jobType), IncompleteExtractionError);
});

test("the extractor rejects a lookalike Blob host before fetching it", async (context) => {
  const fetch = mockGemini(context, readings);
  const url = spec.ref.url.replace(".com/", ".com.example.org/");
  await assert.rejects(extract([{ ...spec.ref, url }], jobType), /public Vercel Blob permit upload URL/);
  assert.equal(fetch.mock.callCount(), 0);
});
