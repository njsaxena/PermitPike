/**
 * Joins a service base URL and a route, keeping any path on the base.
 * `new URL("/review", "https://host/agent")` would drop `/agent`; this keeps it:
 * serviceUrl("https://host/agent", "review") -> https://host/agent/review
 */
export function serviceUrl(base: string, route: string): URL {
  const root = base.trim().replace(/\/+$/, "");
  return new URL(`${root}/${route.replace(/^\/+/, "")}`);
}
