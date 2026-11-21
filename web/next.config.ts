import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Local dev reads the single .env at the repo root. On Vercel, env comes from the dashboard.
loadEnvConfig(resolve(process.cwd(), ".."));

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
