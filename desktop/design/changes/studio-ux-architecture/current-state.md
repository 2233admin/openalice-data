# OpenAlice Data current capability audit

Date: 2026-08-16
Status: Working-tree evidence and implementation handoff.

## ODP baseline

ODP Desktop remains the authority for managed Backends and OpenBB REST/MCP processes, Conda/Python environments, local API keys, environment-scoped extension installation, Jupyter lifecycle and process logs. OpenAlice must call these Tauri commands rather than copy their state machines.

## Current product surfaces

| Area | Working-tree implementation | Product role |
|---|---|---|
| Home | `routes/home.tsx` | Environment → startup plan → source/workspace → Start; temporary item selection and batch controls |
| Data Sources | `routes/data-sources.index.tsx`, `studio/SourceInventoryTable.tsx`, embedded `api-keys.tsx` | One native source/API Key inventory plus flat workspace classification |
| Environment & Extensions | `routes/environment-extensions.tsx` | Environment selector with startup plan, service, extension and legacy environment tabs |
| Startup plans | `studio/startup-plan-store.ts` | New environment-scoped unified service/frontend reference list |
| Legacy routes | Backends, Environments, Extensions, API Keys, Frontends, Logs | Migration-safe deep links only |

## Reuse boundary

Keep OpenBB Provider registry, command coverage, standard models, REST/OpenAPI, MCP, credentials, managed runtime, service supervision, package operations, extension installer, Jupyter and process-log windows authoritative. Keep existing OpenBB API Keys components, table primitives, theme tokens and static motion posture.

## Explicit non-goals

Do not add a Query page or query engine, provider capability matrix as a data source, Data Catalog or second workspace product, semantic mapping/canonical fields/compatibility engine, frontend registry or custom frontend URL form, generic Settings/Advanced shell, package marketplace, duplicate service state machine, or browser-based verification.
