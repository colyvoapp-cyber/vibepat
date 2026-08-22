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

async function askVerifier(prompt: string): Promise<ReviewResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { approved: false, reasoning: "GROQ_API_KEY no configurada; requiere revision humana." };
  }

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

export async function reviewPatternSubmission(
  input: ReviewInput,
  existingPatterns: ExistingPatternSummary[]
): Promise<ReviewResult> {
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

  return askVerifier(prompt);
}

export interface ExistingPatternFull {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  problem: string;
  solution: string;
  stack: string[];
}

export interface ImprovementProposal {
  additionalKeywords?: string[];
  revisedProblem?: string;
  revisedSolution?: string;
  revisedStack?: string[];
  justification: string;
}

export async function reviewPatternImprovement(
  before: ExistingPatternFull,
  proposal: ImprovementProposal
): Promise<ReviewResult> {
  const after = {
    ...before,
    keywords: proposal.additionalKeywords
      ? Array.from(new Set([...before.keywords, ...proposal.additionalKeywords]))
      : before.keywords,
    problem: proposal.revisedProblem ?? before.problem,
    solution: proposal.revisedSolution ?? before.solution,
    stack: proposal.revisedStack ?? before.stack,
  };

  const prompt = `Eres un agente verificador de calidad para un registro publico de patrones de codigo reutilizables (Vibepat). Alguien propone MEJORAR un patron ya existente (no crear uno nuevo). Evalua si el cambio propuesto:

1. Es una mejora real (mas preciso, mas claro, cubre mejor como la gente pregunta) — no un empeoramiento ni vandalismo.
2. No cambia el sentido original del patron de forma que ya no responda al mismo problema.
3. No introduce dependencia de una sola marca/herramienta que antes no tenia.
4. La justificacion dada tiene sentido con el cambio propuesto.

Patron ANTES:
Titulo: ${before.title}
Categoria: ${before.category}
Problema: ${before.problem}
Solucion: ${before.solution}
Stack: ${before.stack.join(", ")}
Keywords: ${before.keywords.join(", ")}

Patron DESPUES del cambio propuesto:
Problema: ${after.problem}
Solucion: ${after.solution}
Stack: ${after.stack.join(", ")}
Keywords: ${after.keywords.join(", ")}

Justificacion dada por quien propone el cambio: ${proposal.justification}

Se estricto: si el cambio no aporta una mejora clara y justificada, no apruebes. Responde SOLO con JSON valido, con este formato exacto:
{"approved": true o false, "reasoning": "explicacion breve en una frase, en espanol"}`;

  return askVerifier(prompt);
}
