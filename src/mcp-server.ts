import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { patterns } from "./patterns.generated.js";
import { submitPatternPR } from "./github-contribute.js";
import { findBestPattern } from "./matcher.js";
import { checkAndRecordRead, recordContribution } from "./ratio.js";

const clientIdSchema = z
  .string()
  .min(1)
  .describe(
    "Tu identificador (ej. tu usuario de GitHub, o cualquier id estable que uses siempre). Se usa para llevar tu ratio de consultas vs. contribuciones."
  );

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "vibepat",
    version: "0.1.0",
  });

  server.registerTool(
    "find_pattern",
    {
      title: "Buscar patron de codigo",
      description:
        "Busca un patron de codigo ya resuelto y validado (ej. chat en tiempo real, migracion de no-code a produccion) antes de generarlo desde cero. Sujeto a ratio: 1 consulta gratis, luego hace falta haber contribuido (submit_pattern) al menos tanto como se ha consultado.",
      inputSchema: {
        query: z.string().describe("Que se quiere construir, en lenguaje natural"),
        clientId: clientIdSchema,
      },
    },
    async ({ query, clientId }) => {
      const ratio = await checkAndRecordRead(clientId);

      if (!ratio.allowed) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Ratio agotado: has consultado ${ratio.reads} veces y contribuido ${ratio.contributions}. Para seguir consultando, primero propon un patron con submit_pattern (usando el mismo clientId "${clientId}") a partir de lo que resuelvas para tu usuario.`,
            },
          ],
          isError: true,
        };
      }

      const { match, availableTitles } = findBestPattern(query);

      if (!match) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No hay ningun patron curado todavia para "${query}". Patrones disponibles: ${availableTitles.join(", ")}.`,
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

  server.registerTool(
    "submit_pattern",
    {
      title: "Proponer un patron nuevo",
      description:
        "Propone un patron de codigo nuevo para el registro compartido (chat, migracion, marketplace, auth, etc.). Un agente verificador automatico lo revisa; si aprueba, se fusiona y publica solo. Si no, queda pendiente de revision humana.",
      inputSchema: {
        title: z.string().min(5).describe("Titulo corto del patron"),
        category: z
          .string()
          .min(3)
          .describe("Categoria corta, ej. realtime, migration, marketplace, auth, payments"),
        problem: z.string().min(20).describe("Que problema resuelve, en detalle, y por que suele fallar"),
        solution: z.string().min(20).describe("La solucion concreta y accionable (decision de arquitectura real)"),
        stack: z.array(z.string()).min(1).describe("Stack sugerido"),
        keywords: z
          .array(z.string())
          .min(3)
          .describe("Al menos 3 palabras clave en espanol que alguien usaria al preguntar"),
        clientId: clientIdSchema,
      },
    },
    async ({ title, category, problem, solution, stack, keywords, clientId }) => {
      try {
        const result = await submitPatternPR(
          { title, category, problem, solution, stack, keywords },
          patterns.map((p) => ({ id: p.id, title: p.title, category: p.category }))
        );

        if (result.merged) {
          await recordContribution(clientId);
        }

        const text = result.merged
          ? `Propuesta aprobada por el agente verificador y fusionada automaticamente: ${result.url}\nMotivo: ${result.reasoning}\n\nSe esta desplegando solo (Vercel esta conectado al repo). Tu ratio de contribuciones ya se actualizo.`
          : `Propuesta enviada, NO aprobada automaticamente por el agente verificador: ${result.url}\nMotivo: ${result.reasoning}\n\nQueda pendiente de revision humana. No cuenta para tu ratio hasta que se apruebe.`;
        return {
          content: [{ type: "text" as const, text }],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No se pudo enviar la propuesta: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  return server;
}
