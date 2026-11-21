import test from "node:test";
import assert from "node:assert/strict";
import { searchArchive } from "./server/archive-search";

const highStreet = {
  permitnumber: "A993149", permittypedescr: "Amendment to a Long Form", worktype: "OTHER",
  description: "Other", comments: "Replace electrical panel. Call 617-555-0100 or test@example.org.",
  address: "99 High ST", zip: "02110", issued_date: "2019-08-29T17:23:15", status: "Closed", parcel_id: "304390000",
};
const stateStreet = {
  permitnumber: "A1000569", permittypedescr: "Amendment to a Long Form", worktype: "INTEXT",
  description: "Interior/Exterior Work", address: "181-183 State ST", zip: "02109",
  issued_date: "2021-01-28T16:29:26", status: "Closed", parcel_id: "303120000",
};

function fakeFetch(records: unknown[], check: (sql: string) => void = () => {}): typeof fetch {
  return async (input, options) => {
    const url = new URL(input instanceof Request ? input.url : input);
    assert.equal(url.origin, "https://data.boston.gov");
    assert.equal(url.pathname, "/api/3/action/datastore_search_sql");
    assert.equal(options?.redirect, "manual");
    const sql = url.searchParams.get("sql");
    assert.ok(sql);
    check(sql);
    return Response.json({ success: true, result: { records } });
  };
}

const noFetch = () => assert.fail("Expected search to be resolved without the data API");

test("permits preserve source descriptions and explicitly report missing exact IDs", async () => {
  const result = await searchArchive("A993149 and ALT123456", { fetcher: fakeFetch([stateStreet, highStreet]) });
  assert.equal(result.status, "results");
  assert.deepEqual(result.records.map(({ permitNumber }) => permitNumber), ["A993149"]);
  assert.deepEqual(result.scanPermitNumbers, ["ALT123456"]);
  const record = result.records[0];
  assert.ok(record);
  assert.equal(record.description, "Other");
  assert.equal(record.details, "Replace electrical panel. Call [phone removed] or [email removed].");
  assert.equal(record.parcelId, "304390000");
  assert.deepEqual(JSON.parse(new URL(record.sourceUrl).searchParams.get("filters") ?? ""), { permitnumber: "A993149" });
});

test("exact IDs override comparison context and use the query order", async () => {
  const result = await searchArchive("Compare A1000569, A993149", {
    recordContext: ["E1916768"], fetcher: fakeFetch([highStreet, stateStreet]),
  });
  assert.equal(result.status, "results");
  assert.deepEqual(result.records.map(({ permitNumber }) => permitNumber), ["A1000569", "A993149"]);
  assert.match(result.answer, /to compare/u);
});

test("year and status refinements preserve an earlier neighborhood topic", async () => {
  const result = await searchArchive("Only 2024", {
    history: [
      { role: "user", content: "EV chargers in Dorchester" },
      { role: "assistant", content: "Here are some matches." },
      { role: "user", content: "What about closed permits only?" },
    ],
    fetcher: fakeFetch([{ ...highStreet, issued_date: "2024-09-09T10:00:00" }], (sql) => {
      assert.match(sql, /lower\(city\) IN \('dorchester', 'dorchester center'\)/u);
      assert.match(sql, /strpos\(lower\(comments\), 'ev charger'\)/u);
      assert.match(sql, /issued_date >= '2024-01-01' AND issued_date < '2025-01-01'/u);
      assert.match(sql, /lower\(status\) = 'closed'/u);
    }),
  });
  assert.equal(result.status, "results");
  assert.match(result.answer, /from 2024/u);
});

test("multiple addresses search independently and normalize street suffixes", async () => {
  const observed: string[] = [];
  const response = await searchArchive("Find permits at 99 High Street and 181-183 State Street", {
    fetcher: async (input, options) => {
      const sql = new URL(input instanceof Request ? input.url : input).searchParams.get("sql");
      assert.ok(sql);
      observed.push(sql);
      const record = sql.includes(" 99 high st ") ? highStreet : stateStreet;
      return fakeFetch([record])(input, options);
    },
  });
  assert.deepEqual(response.records.map(({ permitNumber }) => permitNumber), ["A993149", "A1000569"]);
  assert.equal(observed.length, 2);
  assert.match(observed[0] ?? "", /99 high st .*99 high street/u);
  assert.match(observed[1] ?? "", /181-183 state st .*181-183 state street/u);
  assert.ok(observed.every((sql) => sql.endsWith("LIMIT 5")));
});

test("address literals escape apostrophes and do not treat street numbers as years", async () => {
  const result = await searchArchive("2020 O'Brien Road", {
    fetcher: fakeFetch([], (sql) => {
      assert.match(sql, /2020 o''brien rd/u);
      assert.doesNotMatch(sql, /issued_date >=/u);
    }),
  });
  assert.equal(result.status, "not_found");
});

test("explicit historical permit numbers can reach scan lookup even without an issued record", async () => {
  const result = await searchArchive("Look up permit number 120477", { fetcher: fakeFetch([]) });
  assert.equal(result.status, "not_found");
  assert.deepEqual(result.scanPermitNumbers, ["120477"]);
});

test("vague requests clarify while guidance requests return actual official file links", async () => {
  const vague = await searchArchive("I'm not sure what to look up", { fetcher: noFetch });
  assert.equal(vague.status, "clarify");
  const guide = await searchArchive("Show Boston EV charger installation guides", { fetcher: noFetch });
  assert.equal(guide.status, "results");
  assert.equal(guide.records.length, 0);
  assert.ok(guide.documents.some(({ url, fileType }) => url.endsWith("CB2024-03.pdf") && fileType === "PDF"));
});

test("upstream errors are distinct from an empty search", async () => {
  const result = await searchArchive("A993149", { fetcher: async () => new Response("maintenance", { status: 503 }) });
  assert.equal(result.status, "unavailable");
  assert.deepEqual(result.scanPermitNumbers, ["A993149"]);
});
