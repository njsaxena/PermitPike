/**
 * Review pipeline (STUB): extract -> checks + load calc -> recommendation.
 * Input/output shapes come from the contract.
 */
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { AgentReviewRequest, AgentReviewResponse, CheckResult, Extraction, LoadCalcResult } from "@permitpike/contract";
import { z } from "zod";

const ChecksOutput = z.object({
  request: AgentReviewRequest,
  extraction: Extraction,
  checks: z.array(CheckResult),
  loadCalc: LoadCalcResult,
});

const extractStep = createStep({
  id: "extract",
  inputSchema: AgentReviewRequest,
  outputSchema: z.object({ request: AgentReviewRequest, extraction: Extraction }),
  execute: async ({ inputData }) => {
    if (inputData.extraction) return { request: inputData, extraction: inputData.extraction };
    // TODO: send inputData.files to Gemini with getPack(jobType).extraction.schema + hints.
    throw new Error("extract step not implemented");
  },
});

const checksStep = createStep({
  id: "run-checks",
  inputSchema: z.object({ request: AgentReviewRequest, extraction: Extraction }),
  outputSchema: ChecksOutput,
  execute: async () => {
    // TODO: getPack(jobType).rules.map(r => r.check(fields)) + runLoadCalc(fields, pack.addedLoad(fields), pack.serviceRatingAmps(fields)).
    throw new Error("run-checks step not implemented");
  },
});

const recommendStep = createStep({
  id: "recommend",
  inputSchema: ChecksOutput,
  outputSchema: AgentReviewResponse,
  execute: async () => {
    // TODO: decision from checks (any fail -> return_for_fixes, warn/utility flag -> approve_with_conditions),
    // confidence from extraction.fieldConfidence, summary from the permitReviewer agent.
    throw new Error("recommend step not implemented");
  },
});

export const reviewApplication = createWorkflow({
  id: "review-application",
  inputSchema: AgentReviewRequest,
  outputSchema: AgentReviewResponse,
})
  .then(extractStep)
  .then(checksStep)
  .then(recommendStep)
  .commit();
