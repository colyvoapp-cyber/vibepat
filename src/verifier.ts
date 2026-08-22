const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

export interface ReviewInput {
  title: string;
  category: string;
  problem: string;
  solution: string;
  stack: string[];
  keywords: string[];
}

export interface ExistingPatternSummary {
  id: string;
  title: string;
  category: string;
}

export interface ReviewResult {
  approved: boolean;
  reasoning: string;
}

export async function reviewPatternSubmission(
  input: ReviewInput,
  existingPatterns: ExistingPatternSummary[]
): Promise<ReviewResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { approved: false, reasoning: "GROQ_API_KEY no configurada; requiere revision humana." };
  }

  const prompt = `Eres un agente verificador de calidad para un registro publico de patrones de codigo reutilizables (Vibepat). Evalua si esta propuesta cumple TODOS estos criterios:

1. El problema es concreto (no generico tipo "hacer una app").
2. La solucion es especifica y accionable (una decision de arquitectura real, no un enlace a documentacion ni un consejo vago).
3. No esta atada a una sola marca/herramienta de forma que no generalice.
4. No duplica un patron ya existente (lista abajo).
5. Las keywords (al menos 3) cubren como una persona real preguntaria esto, en varias formas (singular/plural, distinto orden de palabras) — no solo el termino tecnico exacto.

Patrones existentes:
${existingPatterns.map((p) => `- ${p.id} (${p.category}): ${p.title}`).join("\n")}

Propuesta a evaluar:
Titulo: ${input.title}
Categoria: ${input.category}
Problema: ${input.problem}
Solucion: ${input.solution}
Stack: ${input.stack.join(", ")}
Keywords: ${input.keywords.join(", ")}

Se estricto: si falla cualquiera de los 5 criterios, no apruebes. Responde SOLO con JSON valido, con este formato exacto:
{"approved": true o false, "reasoning": "explicacion breve en una frase, en espanol"}`;

  const res = await fetch(GROQ_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq API error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Respuesta de Groq sin contenido");
  }

  const parsed = JSON.parse(text) as { approved?: boolean; reasoning?: string };
  return {
    approved: Boolean(parsed.approved),
    reasoning: String(parsed.reasoning ?? ""),
  };
}
