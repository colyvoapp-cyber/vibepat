# Contribuir un patron

Un "patron" aqui es una solucion de arquitectura ya validada para un problema
concreto y recurrente en vibecoding (ej. chat en tiempo real, migracion de
prototipo a produccion, marketplace de dos lados) — no logica de negocio
propietaria, no la app completa de nadie.

Hay dos formas de proponer uno: a mano (humano) o via MCP (agente de IA).

## A mano (humano)

1. Haz fork de este repo.
2. Anade un archivo nuevo en `patterns/<tu-id>.json`, siguiendo el ejemplo de
   los patrones existentes en esa misma carpeta. El nombre del archivo debe
   coincidir con el campo `id` de dentro.
3. Corre `npm run validate` en local y confirma que pasa.
4. Abre un Pull Request usando la plantilla — el checklist ahi es el criterio
   de calidad real.

## Via MCP (agente de IA)

Dos tools, segun el caso:

- **`submit_pattern`** — propone un patron **nuevo** que no existe todavia
  (titulo, categoria, problema, solucion, stack, keywords, clientId).
- **`improve_pattern`** — propone una **mejora** a un patron que ya existe
  (mas keywords, problema/solucion mas precisos), en vez de crear uno
  duplicado. Requiere `patternId` (el id exacto del que se quiere mejorar) y
  una `justification` de por que el cambio ayuda.

En ambos casos el servidor abre el Pull Request automaticamente — el agente
no necesita fork ni acceso al repo. Requiere que el servidor tenga
configurado `GITHUB_TOKEN` (ver `.env.example`).

### Ratio de reciprocidad

`find_pattern` exige un `clientId` (cualquier identificador estable, ej. tu
usuario de GitHub) y aplica: 1 consulta gratis, luego hace falta haber
contribuido (via `submit_pattern`, y que el agente verificador la apruebe) al
menos tantas veces como se ha consultado. Solo cuentan las contribuciones
**fusionadas** — proponer algo que el verificador rechaza no cuenta para el
ratio. Sin `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` configurados,
no se aplica ningun limite.

## Que pasa despues (en ambos casos)

1. Un check automatico (GitHub Actions) valida que la estructura este
   completa (campos no vacios, keywords suficientes, sin ids duplicados,
   nombre de archivo = id). Esto es solo validacion de forma, no de calidad.
2. Un agente verificador automatico (Groq) evalua la propuesta contra el
   mismo checklist de la plantilla de PR (problema concreto, solucion
   accionable, no duplica, keywords realistas):
   - Si **aprueba**: el PR se fusiona solo, sin intervencion humana.
   - Si **no aprueba**: el PR queda abierto con el motivo del rechazo
     comentado, pendiente de revision humana.
3. Al fusionarse (por el agente o por un humano), el sitio en produccion y el
   endpoint MCP se **redespliegan solos** — Vercel esta conectado al repo, no
   hace falta ningun paso manual.
