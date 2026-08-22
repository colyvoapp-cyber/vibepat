import { reviewPatternSubmission, type ExistingPatternSummary } from "./verifier.js";

const GITHUB_API = "https://api.github.com";
const REPO = process.env.GITHUB_REPO ?? "colyvoapp-cyber/vibecode-patterns";
const BASE_BRANCH = process.env.GITHUB_BASE_BRANCH ?? "master";

function slugify(input: string): string {
  const full = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");

  if (full.length <= 60) return full || `pattern-${Date.now()}`;

  // Corta por palabras completas en vez de a mitad de palabra.
  const truncated = full.slice(0, 60);
  const lastDash = truncated.lastIndexOf("-");
  const clean = lastDash > 20 ? truncated.slice(0, lastDash) : truncated;
  return clean.replace(/-+$/, "") || `pattern-${Date.now()}`;
}

async function gh(path: string, init?: RequestInit) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("Contribucion no disponible: falta configurar GITHUB_TOKEN en el servidor.");
  }
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${path} -> ${res.status}: ${body}`);
  }
  return res.json();
}

export interface PatternSubmission {
  title: string;
  category: string;
  problem: string;
  solution: string;
  stack: string[];
  keywords: string[];
}

export async function submitPatternPR(
  input: PatternSubmission,
  existingPatterns: ExistingPatternSummary[]
): Promise<{ url: string; id: string; merged: boolean; reasoning: string }> {
  let id = slugify(input.title);
  if (existingPatterns.some((p) => p.id === id)) {
    id = `${id}-${Date.now().toString(36)}`;
  }

  const branch = `contribute/${id}`;

  const baseRef = (await gh(`/repos/${REPO}/git/ref/heads/${BASE_BRANCH}`)) as {
    object: { sha: string };
  };
  const baseSha = baseRef.object.sha;

  await gh(`/repos/${REPO}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
  });

  const patternData = {
    id,
    title: input.title,
    category: input.category,
    keywords: input.keywords,
    problem: input.problem,
    solution: input.solution,
    stack: input.stack,
    source: "agente-ia",
  };

  const content = Buffer.from(JSON.stringify(patternData, null, 2) + "\n", "utf8").toString("base64");

  await gh(`/repos/${REPO}/contents/patterns/${id}.json`, {
    method: "PUT",
    body: JSON.stringify({
      message: `Propuesta de patron: ${input.title}`,
      content,
      branch,
    }),
  });

  const pr = (await gh(`/repos/${REPO}/pulls`, {
    method: "POST",
    body: JSON.stringify({
      title: `[Propuesta IA] ${input.title}`,
      head: branch,
      base: BASE_BRANCH,
      body: [
        "Patron propuesto automaticamente por un agente de IA conectado via MCP (`submit_pattern`).",
        "",
        `**Categoria:** ${input.category}`,
        "",
        "Revisado por el agente verificador automatico antes de fusionar.",
      ].join("\n"),
    }),
  })) as { html_url: string; number: number };

  let merged = false;
  let reasoning = "";

  try {
    const review = await reviewPatternSubmission(input, existingPatterns);
    reasoning = review.reasoning;

    if (review.approved) {
      await gh(`/repos/${REPO}/pulls/${pr.number}/merge`, {
        method: "PUT",
        body: JSON.stringify({ merge_method: "squash" }),
      });
      await gh(`/repos/${REPO}/git/refs/heads/${branch}`, { method: "DELETE" }).catch(() => {});
      merged = true;
    } else {
      await gh(`/repos/${REPO}/issues/${pr.number}/comments`, {
        method: "POST",
        body: JSON.stringify({
          body: `Agente verificador: NO aprobado automaticamente.\n\nMotivo: ${review.reasoning}\n\nQueda pendiente de revision humana.`,
        }),
      });
    }
  } catch (err) {
    reasoning = `No se pudo completar la revision automatica: ${
      err instanceof Error ? err.message : String(err)
    }`;
  }

  return { url: pr.html_url, id, merged, reasoning };
}
