import type { IncomingMessage, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./mcp-server.js";

// Sin estado: cada request crea su propio server+transport (encaja con funciones
// serverless, no requiere sesion ni conexion persistente entre llamadas).
export async function handleMcpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  body: unknown
): Promise<void> {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => {
    transport.close();
    server.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}
