import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { patterns } from "./patterns.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "vibecode-patterns",
    version: "0.1.0",
  });

  server.registerTool(
    "find_pattern",
    {
      title: "Buscar patron de codigo",
      description:
        "Busca un patron de codigo ya resuelto y validado (ej. chat en tiempo real, migracion de no-code a produccion) antes de generarlo desde cero.",
      inputSchema: {
        query: z.string().describe("Que se quiere construir, en lenguaje natural"),
      },
    },
    async ({ query }) => {
      const normalize = (s: string) =>
        s
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "");

      const q = normalize(query);

      const scored = patterns
        .map((p) => {
          let score = 0;
          if (q.includes(normalize(p.category))) score += 2;
          for (const kw of p.keywords) {
            if (q.includes(normalize(kw))) score += kw.includes(" ") ? 3 : 1;
          }
          return { pattern: p, score };
        })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score);

      const match = scored[0]?.pattern;

      if (!match) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No hay ningun patron curado todavia para "${query}". Patrones disponibles: ${patterns
                .map((p) => p.title)
                .join(", ")}.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: [
              `# ${match.title}`,
              ``,
              `**Problema:** ${match.problem}`,
              ``,
              `**Solucion:** ${match.solution}`,
              ``,
              `**Stack sugerido:** ${match.stack.join(", ")}`,
            ].join("\n"),
          },
        ],
      };
    }
  );

  return server;
}
