import { patterns } from "../dist/patterns.js";

const errors = [];
const seenIds = new Set();

for (const p of patterns) {
  const ctx = `[${p.id ?? "?"}]`;

  if (!p.id) {
    errors.push(`${ctx} falta "id"`);
  } else if (seenIds.has(p.id)) {
    errors.push(`${ctx} id duplicado`);
  } else {
    seenIds.add(p.id);
  }

  for (const field of ["title", "problem", "solution"]) {
    const value = p[field];
    if (typeof value !== "string" || value.trim().length < 10) {
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
}

if (errors.length > 0) {
  console.error("Validacion de patrones fallo:\n" + errors.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}

console.log(`OK: ${patterns.length} patrones validos.`);
