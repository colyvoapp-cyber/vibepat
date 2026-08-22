import { findBestPattern } from "../src/matcher.js";

// Endpoint simple para la caja "pregunta aqui" de la landing. Usa el mismo
// motor determinista que la tool MCP find_pattern — no hay ningun LLM aqui.
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";
  if (!query) {
    res.status(400).json({ error: "falta query" });
    return;
  }

  const { match, availableTitles } = findBestPattern(query);

  if (!match) {
    res.status(200).json({ found: false, availableTitles });
    return;
  }

  res.status(200).json({
    found: true,
    title: match.title,
    problem: match.problem,
    solution: match.solution,
    stack: match.stack,
  });
}

export const config = {
  runtime: "nodejs",
};
