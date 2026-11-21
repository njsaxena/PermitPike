import { TRACKING_CODE_ALPHABET, TrackingCode } from "@permitpike/contract";

/**
 * A fresh tracking code, e.g. "PP-7K3Q-9M2X", from the platform's cryptographic random
 * source. The alphabet has 32 symbols, so `byte & 31` picks one without bias.
 */
export function newTrackingCode(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => TRACKING_CODE_ALPHABET[b & 31]);
  return `PP-${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

/**
 * Reads what someone typed: any case, spaces or missing dashes, with or without "PP".
 * Returns null when it can't be a code, so lookups never reach the database.
 */
export function normalizeTrackingCode(input: string): string | null {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = raw.length === 10 && raw.startsWith("PP") ? raw.slice(2) : raw;
  if (body.length !== 8) return null;
  const code = `PP-${body.slice(0, 4)}-${body.slice(4)}`;
  return TrackingCode.safeParse(code).success ? code : null;
}
