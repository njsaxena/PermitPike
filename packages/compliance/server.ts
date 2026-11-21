// Mastra MCP 1.x supports the initialize handshake used by stdio clients.
import { MCPServer } from "@mastra/mcp";
import { complianceTools } from "./tools";

const server = new MCPServer({
  id: "permitpike-compliance",
  name: "PermitPike Compliance",
  version: "1.0.0",
  tools: complianceTools,
});

await server.startStdio();
