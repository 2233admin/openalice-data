# OpenBB Studio UX / IA draft

Status: provisional; awaiting user confirmation through the design-pipeline grill stage.

## Product thesis

OpenBB Studio is a user-facing data integration workbench, not a Provider status dashboard. The product helps a user install or discover a source, inspect its native datasets and fields, place compatible provider datasets into a user-named workspace, map them to workspace canonical fields, compare samples, and query only after compatibility is explicit.

The system must not infer that two datasets are the same merely because they are both labelled A-share, both look like K-line data, or share field names. A workspace is the user's composition boundary and the source of truth for grouping.

## Provisional top-level information architecture

Five intent-level entries:

1. Home — next action, unresolved blockers, recent workspaces, service readiness, add-source entry.
2. Workspaces — user-named compositions of provider datasets; canonical fields, mappings, comparison results, and workspace queries.
3. Data Sources — installed/discovered Provider inventory and native datasets/fields; add-source workflow; source health and credentials.
4. Query — query a native provider dataset or a validated workspace; results and diagnostics route back to mapping or service repair.
5. Advanced — OpenBB service, runtime, credentials, extension internals, API/OpenAPI, configuration, and logs.

Data Catalog is a support view reached from Data Sources, not a global taxonomy or
a separate intent-level page. Extensions is a direct support destination for
non-Provider extensions; Provider installation belongs only to Add Data Source.

## Workspace membership flow

```text
Create or open workspace
  -> Add a provider-native dataset
  -> inspect native fields and query semantics
  -> propose candidate mappings
  -> user accepts/edits/rejects mapping
  -> run same-sample comparison with declared tolerances
  -> attach as compatible workspace member or keep separate
```

Provider installation and workspace membership remain separate actions:

- Add Data Source installs/discovers a Provider and its native datasets.
- Add to Workspace asserts a compatibility relationship that must be mapped and validated.

## Mapping model

Keep three scopes distinct:

- Provider-native field: the upstream field as returned by the source.
- OpenBB standard field: an existing platform canonical field when an explicit provider implementation maps to it.
- Workspace canonical field: a user-confirmed field shared by the members of one workspace, potentially extending the OpenBB baseline without silently changing the global platform model.

A same-named field is only a candidate. Promotion requires semantic/type/unit/granularity evidence, sample comparison, and explicit confirmation. Provider-specific fields remain available without promotion.

## Compatibility gate

Before two provider datasets are used as one workspace dataset, compare at least:

- query dimensions and symbol/entity semantics;
- date/time granularity and timezone;
- adjustment semantics;
- units and numeric scale;
- canonical field presence and types;
- aligned sample rows and declared numeric tolerances.

A material mismatch blocks unified workspace attachment and explains the likely cause. The user may keep both members separate or revise the mapping; an unsafe silent merge is not allowed.

## OpenBB infrastructure exposure

Normal mode presents one user-facing OpenBB service with Start/Restart/Repair. REST, MCP, processes, ports, runtimes, package entry points, and raw logs stay in Advanced. A stopped or broken service produces an inline actionable recovery step rather than a forced trip to an Environment page.

## ADHD-friendly interaction posture

- one primary action per surface;
- one decision at a time in multi-step flows;
- no page requires Provider/Fetcher/Router/Runtime vocabulary to proceed;
- preserve workspace, dataset, provider, field, and query context across routes;
- every status includes a consequence and next action;
- compare sources in one table rather than serial page visits;
- default new fields to provider-specific scope;
- preview and explain effects before changing a workspace contract;
- make long-running install/apply/restart/verify jobs resumable;
- keep advanced details behind an explicit disclosure without hiding recovery.
