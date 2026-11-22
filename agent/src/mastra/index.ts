import { timingSafeEqual } from "node:crypto";
import { Mastra } from "@mastra/core/mastra";
import { registerApiRoute } from "@mastra/core/server";
import { AGENT_SECRET_HEADER, AgentReviewRequest, AgentReviewResponse } from "@permitpike/contract";
import { permitReviewer } from "./agents/permit-reviewer";
import { reviewApplication } from "./workflows/review-application";

/** No recommendation is better than a guessed one: the official still gets the application. */
function reviewFailed(applicationId: string, version: number, reason: string) {
  // Ids and the reason only: no fields or file contents in logs.
  console.error(`[review] ${applicationId} v${version} could not finish: ${reason}`);
  return { error: { code: "internal" as const, message: `Review could not finish: ${reason}` } };
}

/** True only when the request carries the shared secret the web sends. */
function hasSecret(header: string | undefined): boolean {
  const secret = process.env.AGENT_SHARED_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

const UNAUTHORIZED = { error: { code: "bad_request", message: "Missing or wrong shared secret." } } as const;

export const mastra = new Mastra({
  agents: { permitReviewer },
  workflows: { reviewApplication },
  server: {
    port: Number(process.env.PORT ?? 4111),
    // Every route, including Mastra's built-in /api/* agent and workflow routes, needs the
    // shared secret. Otherwise anyone who finds the server could run the agent on our Gemini key.
    middleware: [
      {
        path: "/*",
        handler: async (c, next) => {
          if (!hasSecret(c.req.header(AGENT_SECRET_HEADER))) return c.json(UNAUTHORIZED, 401);
          await next();
        },
      },
    ],
    apiRoutes: [
      // POST /review  body: AgentReviewRequest  ->  AgentReviewResponse
      registerApiRoute("/review", {
        method: "POST",
        handler: async (c) => {
          if (!hasSecret(c.req.header(AGENT_SECRET_HEADER))) return c.json(UNAUTHORIZED, 401);
          const parsed = AgentReviewRequest.safeParse(await c.req.json());
          if (!parsed.success) {
            return c.json({ error: { code: "bad_request", message: "Invalid review request.", issues: parsed.error.issues } }, 400);
          }
          const { applicationId, version } = parsed.data;
          try {
            const run = await c.get("mastra").getWorkflow("reviewApplication").createRun();
            const out = await run.start({ inputData: parsed.data });
            if (out.status !== "success") {
              const reason = out.status === "failed" ? out.error.message : `workflow ${out.status}`;
              return c.json(reviewFailed(applicationId, version, reason), 500);
            }
            const response = AgentReviewResponse.safeParse(out.result);
            if (!response.success) return c.json(reviewFailed(applicationId, version, "workflow output failed validation"), 500);
            return c.json(response.data, 200);
          } catch (err) {
            return c.json(reviewFailed(applicationId, version, err instanceof Error ? err.message : String(err)), 500);
          }
        },
      }),
    ],
  },
});
