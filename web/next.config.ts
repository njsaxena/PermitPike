import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Local dev reads the single .env at the repo root. On Vercel, env comes from the dashboard.
// forceReload: Next has already run loadEnvConfig for web/ and caches that first result,
// so without it this call returns the cached web/ env and never reads the root file.
loadEnvConfig(resolve(process.cwd(), ".."), process.env.NODE_ENV !== "production", undefined, true);

const nextConfig: NextConfig = {
  // Lets a build run beside a dev server without both writing to .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Workspace packages ship TypeScript source; let Next compile them.
  transpilePackages: [
    "@permitpike/contract",
    "@permitpike/db",
    "@permitpike/loadcalc",
    "@permitpike/packs",
  ],
};

export default nextConfig;
