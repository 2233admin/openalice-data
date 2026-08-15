## Why

OpenAlice is a complete OpenBB Fork, but the current desktop surface still exposes most of that capability as service, runtime, API-key, extension, and Provider inventory screens. Users need a safe path from an OpenBB-native dataset to a named workspace, explicit field mapping, compatibility evidence, and a reproducible query without learning OpenBB internals first.

This change adds the user-facing Studio orchestration layer now because the underlying Provider registry, OpenAPI coverage, standard models, query API, Tauri process/runtime controls, credentials, extension installation, and build mechanisms already exist. Rebuilding any of those would duplicate OpenBB and create a second source of truth.

## What Changes

- Replace the normal-mode desktop information architecture with five user intents: Home, Workspaces, Data Sources, Query, and Advanced.
- Keep the existing OpenBB/Tauri capability layer as the authority for Provider discovery, dataset coverage, credentials, extension installation, service lifecycle, build/apply, REST/OpenAPI, MCP, and query execution.
- Add persistent user-named Studio workspaces whose members are explicit Provider-native datasets, not inferred from market labels or similar names.
- Add a field-mapping workflow with three visible scopes: Provider-native field, OpenBB standard field, and workspace canonical field.
- Add mapping preview, sample comparison, compatibility evidence, and an explicit apply boundary before a mapping can be used for a unified workspace query.
- Ensure an applied mapping is routed through the existing OpenBB Provider/model/transform/build contract instead of becoming a frontend-only conversion layer.
- Make the Data Sources and Data Catalog views derive from live OpenBB inspection data, including truthful service, Provider, credential, dataset, capability, and extension states.
- Extend Query so it can run either a native OpenBB dataset or a compatibility-verified workspace and preserve diagnostics, raw response, warnings, request inputs, and a concrete recovery route.
- Keep credentials and advanced runtime/process/log controls available, but remove them as prerequisites from the normal user path.
- Add contract, UI, and managed-OpenBB integration tests for source inspection, workspace transitions, mapping gates, query diagnostics, and service/runtime failure recovery.

## Capabilities

### New Capabilities

- `studio-source-inspection`: Live OpenBB Provider, dataset, field, credential, extension, service, and action state exposed through a validated Studio snapshot.
- `studio-workspaces`: Persistent user-named workspaces, explicit native dataset membership, field mappings, sample comparison, compatibility gates, and apply verification.
- `studio-query-diagnostics`: Native and workspace query execution with reproducible inputs, result metadata, warnings, raw response, and actionable diagnostics.

### Modified Capabilities

- None. The repository has no existing OpenSpec capability specs; this change defines the new Studio contracts around existing OpenBB capabilities without modifying OpenBB's Provider or query contracts.

## Impact

- **Desktop React/TanStack Router**: normal navigation, Home, Data Sources, Data Catalog, Provider details, Query, and Advanced integration.
- **Studio adapter**: richer validated contracts and state loading over existing Tauri commands and OpenBB API coverage endpoints.
- **Tauri**: only thin Studio metadata/inspection/apply orchestration is added; existing runtime, process, extension, credential, and service commands remain authoritative.
- **Persistence**: Studio workspace metadata is local application state; Provider credentials remain in the existing credential path and are never duplicated into workspace records.
- **OpenBB compatibility**: confirmed mappings must ultimately use the existing Provider transformation, declared model, registry, build, and test contracts.
- **Verification**: frontend unit/UI tests plus an opt-in managed OpenBB integration test; no new financial data model or parallel query engine.
