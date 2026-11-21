/**
 * Review pipeline: extract -> checks + load calc -> recommendation.
 * Input/output shapes come from the contract. The decision is made by the rule packs;
 * the permitReviewer model only writes the summary.
 */
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { AgentReviewRequest, AgentReviewResponse, CheckResult, Extraction, LoadCalcResult } from "@permitpike/contract";
import { z } from "zod";
import { extract } from "../../extract";
import { buildRecommendation } from "../../review/recommend";
import { usableExtraction } from "../../review/request";
import { runChecks } from "../../review/run-checks";
import { summarize } from "../../review/summary";
import { PERMIT_REVIEWER_MODEL_ID, permitReviewer } from "../agents/permit-reviewer";

const ExtractOutput = z.object({ request: AgentReviewRequest, extraction: Extraction });

const ChecksOutput = z.object({
  request: AgentReviewRequest,
  extraction: Extraction,
  checks: z.array(CheckResult),
  loadCalc: LoadCalcResult,
});

const extractStep = createStep({
  id: "extract",
  inputSchema: AgentReviewRequest,
  outputSchema: ExtractOutput,
  execute: async ({ inputData }) => {
    const extraction = usableExtraction(inputData) ?? (await extract(inputData.files, inputData.jobType));
    return { request: inputData, extraction: Extraction.parse(extraction) };
  },
});

const checksStep = createStep({
  id: "run-checks",
  inputSchema: ExtractOutput,
  outputSchema: ChecksOutput,
  execute: async ({ inputData }) => {
    const { checks, loadCalc } = runChecks(inputData.extraction);
    return { ...inputData, checks, loadCalc };
  },
});

const recommendStep = createStep({
  id: "recommend",
  inputSchema: ChecksOutput,
  outputSchema: AgentReviewResponse,
  execute: async ({ inputData }) => {
    const rec = buildRecommendation({
      version: inputData.request.version,
      extraction: inputData.extraction,
      checks: inputData.checks,
      loadCalc: inputData.loadCalc,
      createdAt: new Date().toISOString(),
    });
    const { summary, model } = await summarize(permitReviewer, rec, PERMIT_REVIEWER_MODEL_ID);
    // Only the summary (and the model label) come from the model.
    const recommendation = { ...rec, summary, model: model ? `${rec.model}+${model}` : rec.model };
    return AgentReviewResponse.parse({ extraction: inputData.extraction, recommendation });
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
