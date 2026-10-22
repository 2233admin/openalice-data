## Why
Status: Product proposal retained as scope context. Detailed active functional requirements are in `desktop/design/changes/studio-ux-architecture/requirements.md`; implementation remains frozen until that baseline is accepted.


OpenAlice is a complete OpenBB Fork, but the current desktop surface still exposes most of that capability as service, runtime, API-key, extension, and Provider inventory screens. Users need a safe path from an OpenBB-native dataset to a named workspace, explicit field mapping, compatibility evidence, and a reproducible query without learning OpenBB internals first.

This change adds the user-facing Studio orchestration layer now because the underlying Provider registry, OpenAPI coverage, standard models, query API, Tauri process/runtime controls, credentials, extension installation, and build mechanisms already exist. Rebuilding any of those would duplicate OpenBB and create a second source of truth.

## What Changes

- Replace the normal-mode desktop information architecture with four user intents: Home, Data Sources, Query, and Advanced. Treat a user-named Workspace as a composed source inside Data Sources, not as a separate top-level page.
- Add persistent user-named Studio workspaces as explicit compositions created from two or more selected Provider-native datasets, without exposing a separate Workspaces navigation surface.
- Add contract, UI, and managed-OpenBB integration tests for source inspection, unified source selection and composition, mapping gates, query diagnostics, and service/runtime failure recovery.
- Keep the existing OpenBB/Tauri capability layer as the authority for Provider discovery, dataset coverage, credentials, extension installation, service lifecycle, build/apply, REST/OpenAPI, MCP, and query execution.
- Add a field-mapping workflow with three visible scopes: Provider-native field, OpenBB standard field, and workspace canonical field.
- Add mapping preview, sample comparison, compatibility evidence, and an explicit apply boundary before a mapping can be used for a unified workspace query.
- Ensure an applied mapping is routed through the existing OpenBB Provider/model/transform/build contract instead of becoming a frontend-only conversion layer.
- Make the Data Sources and Data Catalog views derive from live OpenBB inspection data, including truthful service, Provider, credential, dataset, capability, and extension states.
- Extend Query so it can run an exact native dataset or a composition through a source-backed member, while gating shared-canonical execution on compatibility/apply verification; preserve diagnostics, raw response, warnings, request inputs, and a concrete recovery route.
- Keep credentials and advanced runtime/process/log controls available, but remove them as prerequisites from the normal user path.

## Capabilities

### New Capabilities

- `studio-shell`: Four-intent normal navigation, target-launcher Home, frontend selection, and context-preserving Advanced repair.
- `studio-workspaces`: Persistent user-named Workspace sources inside Data Sources, explicit native dataset membership, field mappings, sample comparison, compatibility gates, and apply verification.
- `studio-query-diagnostics`: Native and workspace query execution with reproducible inputs, result metadata, warnings, raw response, and actionable diagnostics.

### Modified Capabilities

- None. The repository has no existing OpenSpec capability specs; this change defines the new Studio contracts around existing OpenBB capabilities without modifying OpenBB's Provider or query contracts.

## Impact

- **Desktop React/TanStack Router**: normal navigation, Home, unified Data Sources and Workspace-source composition, Data Catalog, Provider details, Query, and Advanced integration.
- **Studio adapter**: richer validated contracts and state loading over existing Tauri commands and OpenBB API coverage endpoints.
- **Tauri**: only thin Studio metadata/inspection/apply orchestration is added; existing runtime, process, extension, credential, and service commands remain authoritative.
- **Persistence**: Studio workspace metadata is local application state; Provider credentials remain in the existing credential path and are never duplicated into workspace records.
- **OpenBB compatibility**: confirmed mappings must ultimately use the existing Provider transformation, declared model, registry, build, and test contracts.
- **Verification**: frontend unit/UI tests plus an opt-in managed OpenBB integration test; no new financial data model or parallel query engine.
