# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Carnatic Analyzer (`artifacts/carnatic-analyzer`)
- **Type**: react-vite, frontend-only (no backend)
- **Preview path**: `/`
- **Pages**:
  - `/` — Raga Identifier: interactive swara pad that matches ragas in real time
  - `/ragas` — Raga Browser: searchable/filterable list of 50+ ragas with full detail
  - `/tala` — Tala Reference: all 7 Suladi Sapta Talas with interactive metronome
- **Data files**: `src/data/ragas.ts`, `src/data/talas.ts` (all knowledge embedded in frontend)
- **Theme**: Warm concert-hall tones (veena wood browns, amber), dark mode via next-themes
- **Dependencies**: framer-motion, next-themes, lucide-react, wouter, shadcn/ui

### API Server (`artifacts/api-server`)
- **Type**: Express 5 API
- **Preview path**: `/api`
- Currently provides only health check endpoint

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
