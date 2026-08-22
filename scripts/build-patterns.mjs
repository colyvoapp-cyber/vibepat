import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const patternsDir = path.join(__dirname, "..", "patterns");
const outFile = path.join(__dirname, "..", "src", "patterns.generated.ts");

const files = readdirSync(patternsDir)
  .filter((f) => f.endsWith(".json"))
  .sort();

const errors = [];
const seenIds = new Set();
const patterns = [];

for (const file of files) {
  const raw = readFileSync(path.join(patternsDir, file), "utf8");
  let p;
  try {
    p = JSON.parse(raw);
  } catch (e) {
    errors.push(`${file}: JSON invalido (${e.message})`);
    continue;
  }
  const ctx = `${file} [${p.id ?? "?"}]`;

  if (!p.id) {
    errors.push(`${ctx} falta "id"`);
  } else if (seenIds.has(p.id)) {
    errors.push(`${ctx} id duplicado`);
  } else {
    seenIds.add(p.id);
  }

  if (p.id && path.basename(file, ".json") !== p.id) {
    errors.push(
      `${ctx} el nombre de archivo debe coincidir con "id" (${path.basename(file, ".json")} vs ${p.id})`
    );
  }

  for (const field of ["title", "problem", "solution"]) {
    if (typeof p[field] !== "string" || p[field].trim().length < 10) {
      errors.push(`${ctx} "${field}" vacio o demasiado corto`);
    }
  }
  if (typeof p.category !== "string" || p.category.trim().length < 3) {
    errors.push(`${ctx} "category" vacio o demasiado corto`);
  }
  if (!Array.isArray(p.keywords) || p.keywords.length < 3) {
    errors.push(`${ctx} necesita al menos 3 keywords en espanol`);
  }
  if (!Array.isArray(p.stack) || p.stack.length === 0) {
    errors.push(`${ctx} falta "stack" sugerido`);
  }

  patterns.push({ ...p, source: p.source ?? "contribucion" });
}

if (errors.length > 0) {
  console.error("Validacion de patrones fallo:\n" + errors.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}

const header = `// GENERADO desde patterns/*.json por scripts/build-patterns.mjs — no editar a mano.\n`;
const iface = [
  "export interface Pattern {",
  "  id: string;",
  "  title: string;",
  "  category: string;",
  "  keywords: string[];",
  "  problem: string;",
  "  solution: string;",
  "  stack: string[];",
  "  source: string;",
  "}",
  "",
  "",
].join("\n");
const body = `export const patterns: Pattern[] = ${JSON.stringify(patterns, null, 2)};\n`;

writeFileSync(outFile, header + iface + body);
console.log(`OK: ${patterns.length} patrones generados en src/patterns.generated.ts`);
