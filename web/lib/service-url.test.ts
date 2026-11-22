import { test } from "node:test";
import assert from "node:assert/strict";
import { serviceUrl } from "./service-url";

test("serviceUrl appends the route to a bare host", () => {
  assert.equal(serviceUrl("http://173.199.123.95:4111", "review").href, "http://173.199.123.95:4111/review");
});

test("serviceUrl keeps a path prefix on the base", () => {
  assert.equal(serviceUrl("https://agent.example.com/agent", "/review").href, "https://agent.example.com/agent/review");
  assert.equal(serviceUrl("https://agent.example.com/agent/", "review").href, "https://agent.example.com/agent/review");
});

test("serviceUrl ignores stray whitespace from pasted settings", () => {
  assert.equal(serviceUrl("  https://agent.example.com \n", "score").href, "https://agent.example.com/score");
});
