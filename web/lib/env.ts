/** Server-only env access. */
export function mocksEnabled(): boolean {
  return process.env.USE_MOCKS === "true";
}
