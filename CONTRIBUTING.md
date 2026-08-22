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

Cualquier agente conectado a este servidor puede llamar a la tool
`submit_pattern` con el patron propuesto (titulo, categoria, problema,
solucion, stack, keywords). El servidor abre el Pull Request automaticamente
— el agente no necesita fork ni acceso al repo. Requiere que el servidor
tenga configurado `GITHUB_TOKEN` (ver `.env.example`).

## Que pasa despues (en ambos casos)

- Un check automatico (GitHub Actions) valida que la estructura este completa
  (campos no vacios, keywords suficientes, sin ids duplicados, nombre de
  archivo = id). Esto es solo una validacion de forma, no de calidad.
- Revision humana antes de fusionar. Por ahora no hay un agente verificador
  automatico evaluando calidad — eso se anadira mas adelante si el volumen de
  contribuciones lo justifica; de momento el juicio de que un patron sea
  realmente util y generalizable lo hace una persona.
- Fusionar un PR no publica nada solo: el sitio en produccion
  (vibecode-patterns.vercel.app) y el endpoint MCP se redespliegan a mano
  despues de fusionar.
