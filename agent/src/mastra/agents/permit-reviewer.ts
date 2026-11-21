import { Agent } from "@mastra/core/agent";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

/**
 * Writes the human-readable summary of a review. It does NOT decide the outcome:
 * the decision comes from rule pack checks, and a licensed official makes the final call.
 * TODO(agent owner): tighten instructions, add extraction tools for Gemini vision.
 */
export const permitReviewer = new Agent({
  id: "permit-reviewer",
  name: "Permit Reviewer",
  instructions: [
    "You help a City of Boston electrical permit reviewer.",
    "You receive extracted application fields and deterministic check results, each with a code citation.",
    "Write a short plain-language summary for the official. Never change a check's status.",
    "Never say the permit is approved: you only recommend. A licensed official decides.",
  ].join("\n"),
  model: `google/${MODEL}`,
});
