import {
  reviewPatternSubmission,
  reviewPatternImprovement,
  type ExistingPatternSummary,
  type ImprovementProposal,
} from "./verifier.js";
import type { Pattern } from "./patterns.generated.js";

const GITHUB_API = "https://api.github.com";
const REPO = process.env.GITHUB_REPO ?? "colyvoapp-cyber/vibepat";
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

async function createBranch(branch: string): Promise<void> {
  const baseRef = (await gh(`/repos/${REPO}/git/ref/heads/${BASE_BRANCH}`)) as {
    object: { sha: string };
  };
  await gh(`/repos/${REPO}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseRef.object.sha }),
  });
}

async function putFile(
  path: string,
  branch: string,
  contentObj: unknown,
  message: string,
  sha?: string
): Promise<void> {
  const content = Buffer.from(JSON.stringify(contentObj, null, 2) + "\n", "utf8").toString("base64");
  await gh(`/repos/${REPO}/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({ message, content, branch, ...(sha ? { sha } : {}) }),
  });
}

async function openPR(branch: string, title: string, body: string): Promise<{ html_url: string; number: number }> {
  return (await gh(`/repos/${REPO}/pulls`, {
    method: "POST",
    body: JSON.stringify({ title, head: branch, base: BASE_BRANCH, body }),
  })) as { html_url: string; number: number };
}

async function mergeOrComment(
  prNumber: number,
  branch: string,
  review: { approved: boolean; reasoning: string }
): Promise<boolean> {
  if (review.approved) {
    await gh(`/repos/${REPO}/pulls/${prNumber}/merge`, {
      method: "PUT",
      body: JSON.stringify({ merge_method: "squash" }),
    });
    await gh(`/repos/${REPO}/git/refs/heads/${branch}`, { method: "DELETE" }).catch(() => {});
    return true;
  }
  await gh(`/repos/${REPO}/issues/${prNumber}/comments`, {
    method: "POST",
    body: JSON.stringify({
      body: `Agente verificador: NO aprobado automaticamente.\n\nMotivo: ${review.reasoning}\n\nQueda pendiente de revision humana.`,
    }),
  });
  return false;
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
  await createBranch(branch);

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

  await putFile(`patterns/${id}.json`, branch, patternData, `Propuesta de patron: ${input.title}`);

  const pr = await openPR(
    branch,
    `[Propuesta IA] ${input.title}`,
    [
      "Patron propuesto automaticamente por un agente de IA conectado via MCP (`submit_pattern`).",
      "",
      `**Categoria:** ${input.category}`,
      "",
      "Revisado por el agente verificador automatico antes de fusionar.",
    ].join("\n")
  );

  let merged = false;
  let reasoning = "";
  try {
    const review = await reviewPatternSubmission(input, existingPatterns);
    reasoning = review.reasoning;
    merged = await mergeOrComment(pr.number, branch, review);
  } catch (err) {
    reasoning = `No se pudo completar la revision automatica: ${
      err instanceof Error ? err.message : String(err)
    }`;
  }

  return { url: pr.html_url, id, merged, reasoning };
}

export async function improvePatternPR(
  existing: Pattern,
  proposal: ImprovementProposal
): Promise<{ url: string; merged: boolean; reasoning: string }> {
  const branch = `improve/${existing.id}-${Date.now().toString(36)}`;

  const fileInfo = (await gh(
    `/repos/${REPO}/contents/patterns/${existing.id}.json?ref=${BASE_BRANCH}`
  )) as { sha: string };

  await createBranch(branch);

  const updated: Pattern = {
    ...existing,
    keywords: proposal.additionalKeywords
      ? Array.from(new Set([...existing.keywords, ...proposal.additionalKeywords]))
      : existing.keywords,
    problem: proposal.revisedProblem ?? existing.problem,
    solution: proposal.revisedSolution ?? existing.solution,
    stack: proposal.revisedStack ?? existing.stack,
  };

  await putFile(
    `patterns/${existing.id}.json`,
    branch,
    updated,
    `Mejora de patron: ${existing.title}`,
    fileInfo.sha
  );

  const pr = await openPR(
    branch,
    `[Mejora IA] ${existing.title}`,
    [
      "Mejora de un patron existente, propuesta automaticamente por un agente de IA conectado via MCP (`improve_pattern`).",
      "",
      `**Justificacion:** ${proposal.justification}`,
      "",
      "Revisado por el agente verificador automatico antes de fusionar.",
    ].join("\n")
  );

  let merged = false;
  let reasoning = "";
  try {
    const review = await reviewPatternImprovement(existing, proposal);
    reasoning = review.reasoning;
    merged = await mergeOrComment(pr.number, branch, review);
  } catch (err) {
    reasoning = `No se pudo completar la revision automatica: ${
      err instanceof Error ? err.message : String(err)
    }`;
  }

  return { url: pr.html_url, merged, reasoning };
}
