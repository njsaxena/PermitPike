import { Mastra } from "@mastra/core/mastra";
import { registerApiRoute } from "@mastra/core/server";
import { AGENT_SECRET_HEADER, AgentReviewRequest } from "@permitpike/contract";
import { permitReviewer } from "./agents/permit-reviewer";
import { reviewApplication } from "./workflows/review-application";

export const mastra = new Mastra({
  agents: { permitReviewer },
  workflows: { reviewApplication },
  server: {
    port: Number(process.env.PORT ?? 4111),
    apiRoutes: [
      // POST /review  body: AgentReviewRequest  ->  AgentReviewResponse
      registerApiRoute("/review", {
        method: "POST",
        handler: async (c) => {
          const secret = process.env.AGENT_SHARED_SECRET;
          if (!secret || c.req.header(AGENT_SECRET_HEADER) !== secret) {
            return c.json({ error: { code: "bad_request", message: "Missing or wrong shared secret." } }, 401);
          }
          const parsed = AgentReviewRequest.safeParse(await c.req.json());
          if (!parsed.success) {
            return c.json({ error: { code: "bad_request", message: "Invalid review request.", issues: parsed.error.issues } }, 400);
          }
          // TODO: run the reviewApplication workflow and return its AgentReviewResponse.
          return c.json({ error: { code: "not_implemented", message: "Review workflow not built yet." } }, 501);
        },
      }),
    ],
  },
});
