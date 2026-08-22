# Contribuir un patron

Un "patron" aqui es una solucion de arquitectura ya validada para un problema
concreto y recurrente en vibecoding (ej. chat en tiempo real, migracion de
prototipo a produccion, marketplace de dos lados) — no logica de negocio
propietaria, no la app completa de nadie.

## Como proponer uno

1. Haz fork de este repo.
2. Anade una entrada nueva al array `patterns` en `src/patterns.ts`, siguiendo
   la interfaz `Pattern` (mira las 3 existentes como ejemplo).
3. Corre `npm run validate` en local y confirma que pasa.
4. Abre un Pull Request usando la plantilla — el checklist ahi es el criterio
   de calidad real.

## Que pasa despues

- Un check automatico (GitHub Actions) valida que la estructura este completa
  (campos no vacios, keywords suficientes, sin ids duplicados). Esto es solo
  una validacion de forma, no de calidad.
- Revision humana antes de fusionar. Por ahora no hay un agente verificador
  automatico evaluando calidad — eso se anadira mas adelante si el volumen de
  contribuciones lo justifica; de momento el juicio de que un patron sea
  realmente util y generalizable lo hace una persona.
- Fusionar un PR no publica nada solo: el sitio en produccion
  (vibecode-patterns.vercel.app) se redespliega a mano despues de fusionar.
