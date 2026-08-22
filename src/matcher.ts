import { patterns, type Pattern } from "./patterns.generated.js";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export interface MatchResult {
  match: Pattern | null;
  availableTitles: string[];
}

export function findBestPattern(query: string): MatchResult {
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

  return {
    match: scored[0]?.pattern ?? null,
    availableTitles: patterns.map((p) => p.title),
  };
}
