## Context

See `proposal.md` for motivation. The repository already contains a partial Studio layer in `desktop/src/studio/` and `desktop/src/routes/`:

- `loadStudioState` selects a managed OpenBB backend/runtime, calls `inspect_studio_environment`, loads extensions, and validates a `StudioSnapshot` with Zod.
- `desktop/src-tauri/src/tauri_handlers/studio.rs` reads the managed OpenBB `/openapi.json`, `/api/v1/coverage/providers`, and `/api/v1/coverage/commands` endpoints. It currently derives Provider and dataset summaries, but data fields, Provider credential metadata, and action states are incomplete.
- Data Sources, Provider details, Data Catalog, Extensions, Home, and Playground already exist. Playground calls the current OpenBB REST endpoint directly and records redacted local activity.
- The root navigation still exposes infrastructure concepts (`Backends`, `Environments`, `API Keys`, and raw logs) as peers of normal user workflows, and the current shell treats Workspaces as a separate primary destination.
- OpenBB's Provider registry, `ProviderInterface`, credential map, Fetcher `transform_data`, declared standard models, REST/OpenAPI coverage, extension build, and service lifecycle remain the implementation authority. Studio must not create a second Provider framework, query engine, runtime manager, or financial data model.
- The requirements document makes field mapping P1 and new dataset/Router Builder P2. This change therefore defines the complete contract and interfaces, but implementation tasks must keep P0 source/query workflows separate from P1 mapping and leave P2 generation as an explicit boundary.

## Goals / Non-Goals

**Goals:**

- Establish a thin, versioned Studio domain model for live source inspection, user-named workspaces, native dataset membership, mapping evidence, compatibility gates, and query diagnostics.
- Make the normal desktop path task-oriented while retaining all current OpenBB infrastructure controls in Advanced.
- Ensure source facts are live and truthful, with explicit unknown/stale/error states instead of invented Provider data.
- Keep Provider-native identity and field scope visible through discovery, mapping, comparison, application, and query results.
- Make P0 behavior independently useful: discover live sources, configure credentials, run native queries, inspect results, and repair service/runtime issues.
- Define P1 mapping/apply seams that eventually produce or update the same OpenBB transformation/model/build contract used by the platform.
- Verify observable behavior with deterministic unit/UI tests and an opt-in managed OpenBB integration test.

**Non-Goals:**

- Do not rebuild OpenBB Provider registration, standard models, OBBject, REST, MCP, Fetcher, Router, runtime, process supervision, extension installer, or build system.
- Do not implement P2 arbitrary new Dataset/Router/Provider code generation in this change; reserve the interface and route boundary only.
- Do not infer semantic equivalence from market labels, Provider names, matching display names, or similar fields.
- Do not introduce a graph/node editor, marketplace, team Manifest sharing, PyPI/GitHub/local extension marketplace, or Monaco/xterm editor as a normal-path dependency.
- Do not store credentials in workspace records or expose raw secrets in query results, history, logs, or diagnostics.
- Do not add a visual restyle or animation runtime; retain the existing theme and static motion posture.

## Decisions

### 1. Treat OpenBB as the source of truth and Studio as orchestration

The Studio adapter will consume live OpenBB inspection and existing Tauri commands. The React layer will own user-facing state and workspace metadata only. Provider capability, model, credential requirements, API paths, extension status, and service state will be read from OpenBB or existing Desktop commands.

The inspector contract will be versioned and validated at the boundary. It will include explicit freshness and error metadata. If a source fact cannot be observed, the adapter returns `unknown`/`stale` or an actionable inspection error; it does not convert missing metadata into `available`.

### 2. Enrich the existing inspection path instead of creating a catalog service

Extend `inspect_studio_environment` (or a directly adjacent read-only Studio command) to return:

- service/runtime inspection context;
- Provider registry identity and credential names with configured booleans, never values;
- command coverage and OpenAPI request/response schemas;
- native and standard field metadata when declared by OpenBB;
- normalized source/dataset states and action candidates.

The credential names must come from the managed OpenBB `ProviderInterface.credentials` / registry map contract, while configured state comes from the existing user-credential path. Response fields must come from declared OpenAPI/model schemas where available. A missing schema remains missing; it is not guessed from a sample row.

### 3. Add a Studio-owned, versioned workspace store

Introduce a small TypeScript workspace store behind a single adapter. P0 uses the existing desktop persistence pattern (versioned JSON in local application storage) because workspace records contain no secrets and the repository already persists dashboard/activity state there. The store must support schema versioning and migration, and no component may write its own workspace JSON directly.

Core records:

```text
Workspace
  id, name, createdAt, updatedAt
  members: NativeDatasetRef[]
  mappings: MappingRecord[]
  comparison: CompatibilityReport | null
  appliedVersion: string | null

NativeDatasetRef
  providerId, datasetId, nativePath, attachedAt

MappingRecord
  sourceField, openbbField?, workspaceField
  type, unit, timeGranularity, transform?
  scope: common | provider
  evidence, status, version

CompatibilityReport
  queryContract, sample, fieldComparisons
  mismatches, tolerancePolicy, status, checkedAt
```

Credentials, tokens, headers, cookies, and raw API responses are excluded from these records.

### 4. Unify Workspace composition inside Data Sources

Data Sources is the single normal-mode source inventory. It shows Provider-native sources and composed Workspace sources in one selection model. A Workspace is a user-created composition boundary, not a separate top-level route or catalog category. Attaching a dataset stores the exact Provider/dataset identity and starts an unverified state. The same native dataset may be attached to multiple Workspaces. No attachment is inferred from labels or registry proximity.

The canonical normal-mode route structure is:

```text
/home
/data-sources              (Providers + native datasets + composed Workspaces)
/data-sources/providers/:providerId
/data-sources/workspaces/:workspaceId
/query                     (native dataset or verified Workspace)
/advanced                  (services, runtimes, credentials, extensions, API, logs)
```

The normal navigation exposes only four user intents: Home, Data Sources, Query, and Advanced. Provider and Workspace detail routes remain nested under Data Sources and do not create competing primary navigation. Infrastructure sections remain reachable through Advanced and preserve their current commands.

### 5. Make mapping three-scoped and evidence-first

A mapping UI and contract will always distinguish:

```text
Provider-native field -> OpenBB standard field -> workspace canonical field
```

A proposal is only a draft. Accept/edit/reject transitions are explicit. Field type, unit, time granularity, adjustment semantics, symbol semantics, and transform rules are first-class evidence. Provider-specific fields remain available as source fields and default to workspace-local/provider scope instead of silently changing an OpenBB Standard Model.

P1 apply is a distinct boundary. A confirmed mapping is not considered applied until the existing OpenBB transformation/model/build/restart/verification path reports success. If that path is not available for a particular mapping, Studio must expose the limitation and keep the record in draft/unsupported state rather than creating a frontend-only fake.

### 6. Gate unified queries on compatibility and applied version

Native queries continue to call the existing OpenBB API directly. A workspace comparison uses equivalent native query inputs and a bounded sample; it records field, type, unit, time, symbol, adjustment, missing-value, and tolerance evidence.

A workspace query is enabled only when:

```text
all required mappings confirmed
AND comparison status = compatible
AND appliedVersion matches the compared mapping version
AND source/service/credential checks are usable
```

Comparison is allowed to be blocked by service, credentials, invalid query, or Provider failure. Blocked is never compatible. A successful comparison without a successful OpenBB apply is still preview evidence, not a production workspace query permission.

### 7. Preserve query provenance and diagnostics

Extend the existing query result shape with a target union:

```text
NativeTarget(providerId, datasetId)
WorkspaceTarget(workspaceId, appliedVersion)
```

Every result or failure retains target identity, Provider/member provenance, submitted non-secret parameters, request path, runtime/service context, duration, row count, warnings, and raw-response availability. The existing redaction policy remains the boundary for headers, cookies, API keys, tokens, secrets, and passwords.

Failure categories map to a concrete route:

```text
runtime/service -> Advanced services or runtimes
credential      -> Provider credentials
source/provider -> Provider health/capability
query contract  -> Query fields/parameters
mapping         -> Workspace mapping/comparison
upstream        -> Provider diagnostics and retry
```

### 8. Keep P0, P1, and composition gates explicit

P0 implementation order:

1. Live source inspector and truthful state adapter.
2. Four-intent shell with Home action routing and Advanced preservation.
3. Unified Data Sources inventory with native sources, Provider credentials/health, Extensions, and native Query.
4. Query diagnostics, redaction, activity, and managed OpenBB verification.
5. Workspace persistence, multi-selection creation, naming, explicit native member attachment, drag/drop add, and in-place member management inside Data Sources.

P1 implementation order:

1. Three-scope mapping editor and draft lifecycle.
2. Bounded sample comparison and compatibility report.
3. Apply/verify adapter over existing OpenBB transformation/model/build contracts.
4. Workspace Query enablement only after versioned apply verification.

P2 Dataset/Router/Provider generation is not implemented; only the interface boundary and Advanced/P1 handoff are recorded.

### 9. Test at contract seams

- Zod/domain contract tests reject malformed inspector, workspace, mapping, and compatibility records.
- Studio client tests verify runtime selection, truthful stopped/error states, no invented source data, and actionable failure routes.
- UI tests cover four-intent navigation, unified native/Workspace source selection and composition, source details, credential save/test, native query, mapping gates, diagnostics, and Advanced handoff.
- Tauri handler tests cover OpenAPI/coverage parsing, Provider credential metadata redaction, unknown/stale handling, and error propagation.
- The opt-in managed OpenBB test runs a real native query and, when mapping support is available, a workspace verification query. It is skipped without `OPENBB_STUDIO_API_URL` and must not be used as the only proof for pure UI behavior.

## Risks / Trade-offs

- **Credential metadata availability**: current Studio inspection returns an empty credential field list. The adapter must read the existing OpenBB registry contract or return unknown; treating an empty list as "no credentials required" would be unsafe.
- **OpenAPI response schemas are uneven**: some endpoints may not declare complete data fields. The catalog must show missing metadata explicitly and defer semantic mapping rather than inventing fields.
- **P1 apply integration may require an existing OpenBB extension/build seam not yet exposed to Tauri**: keep apply state explicit and make the adapter fail closed until that seam is wired.
- **Local workspace persistence is single-device state**: this is appropriate for P0 and avoids a new backend, but team sharing, export, and cross-device synchronization remain out of scope.
- **Route migration can break deep links**: migrate the shell and tests together, and preserve explicit detail navigation where needed rather than leaving duplicate top-level concepts.
- **Live inspection cost**: OpenAPI and coverage inspection can be expensive. Use the existing TanStack Query cache and explicit stale timestamps; never hide a failed refresh behind fresh-looking data.
