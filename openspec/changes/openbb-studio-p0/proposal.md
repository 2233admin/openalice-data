## Why
Status: SUPERSEDED by `desktop/design/changes/studio-ux-architecture/requirements.md` and `openspec/changes/openbb-studio-user-workflows/proposal.md`. Retained as historical P0 context; Action Center/blocker-first Home requirements are not active.


The existing ODP Desktop exposes services, Python runtimes, and global credentials before the data-source workflow users actually need. OpenBB Studio P0 must add a human-facing connect, configure, test, and query layer while keeping OpenBB Platform and the existing Desktop runtime controls as the only platform core.

## What Changes

- Replace the normal first-run destination and primary navigation with Home, Data Sources, Data Catalog, Playground, Extensions, and Advanced.
- Add a secret-free runtime Inspector that derives providers, credentials, models, fields, routes, and coverage from OpenBB-owned registries instead of a renderer-maintained catalogue.
- Add user-facing provider inventory and detail workflows, including credential configuration and actionable health/test states.
- Add a business-oriented dataset catalogue and a schema-driven Playground capable of running real OpenBB API queries and presenting table, chart, raw, usage, and diagnostic views.
- Reuse the existing ODP service, runtime, credential, extension installation, and logging commands under Advanced; do not replace those subsystems.
- Add automated contract, component, integration-boundary, redaction, and build checks plus a third-party license record.
- Keep Provider Builder, new Standard Model/Router generation, extension marketplace, and dashboard/widget workspace outside P0.

## Capabilities

### New Capabilities

- `studio-shell`: User-facing application navigation, action center, system status, Extensions inventory, and Advanced access to preserved ODP controls.
- `runtime-inspection`: Secret-free discovery of OpenBB providers, credential requirements, models, fields, routes, coverage, extensions, services, and runtimes.
- `data-source-management`: Provider inventory, provider detail, credentials, capabilities, health checks, test actions, and actionable failure states.
- `data-catalog-playground`: Business-oriented dataset discovery and schema-driven real-query debugging with data, chart, usage, and diagnostics output.

### Modified Capabilities

None. This repository had no existing OpenSpec capability specifications before this change.

## Impact

- Affected code: `desktop/src`, `desktop/src-tauri`, generated TanStack routes, Desktop tests, and Desktop documentation.
- Existing ODP routes and Tauri commands remain authoritative and available.
- The renderer receives credential names and configured booleans only; credential values remain behind the existing Tauri credentials bridge.
- Added dependencies are TanStack Query/Table/Virtual and ECharts, all under MIT or Apache-2.0 licenses.
- The current working-tree implementation predates these artifacts and is treated as implementation-in-progress until verified against the resulting specs and tasks.
