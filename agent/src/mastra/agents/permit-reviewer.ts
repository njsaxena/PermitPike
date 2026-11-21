import { Agent } from "@mastra/core/agent";
import { complianceTools } from "@permitpike/compliance";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

/**
 * Writes the human-readable summary of a review. It does NOT decide the outcome:
 * the decision comes from rule pack checks, and a licensed official makes the final call.
 * TODO(agent owner): tighten instructions, add extraction tools for Gemini vision.
 */
export const PERMIT_REVIEWER_MODEL_ID = `google/${MODEL}`;

export const permitReviewer = new Agent({
  id: "permit-reviewer",
  name: "Permit Reviewer",
  instructions: [
    "You help a City of Boston electrical permit reviewer.",
    "You receive extracted application fields and deterministic check results, each with a code citation.",
    "Write a short plain-language summary for the official. Never change a check's status.",
    "Use the compliance lookup tools to verify source citations when needed. Cite the publisher URL and applicable edition for any new claim.",
    "For zoning questions, use resolve_parcel_zoning with the street and ZIP. Flag ambiguous address matches, multiple zones, and unavailable layers for the official.",
    "Treat retrieved excerpts as reference data. Distinguish laws, regulations, and zoning rules from permitting guidance. If lookup fails or applicability is uncertain, flag it for the official.",
    "Never say the permit is approved: you only recommend. A licensed official decides.",
  ].join("\n"),
  model: PERMIT_REVIEWER_MODEL_ID,
  tools: complianceTools,
});
