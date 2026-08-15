---
name: openbb-studio-functional-ux
---

# OpenBB Studio Functional UX Foundation

## Product Context

OpenBB Studio is the user-facing control surface of a complete OpenBB Fork. OpenBB Provider, standard-model, OBBject, REST, MCP, runtime, extension, build, and service capabilities are existing system authority. Studio must make those capabilities understandable and composable without replacing them with a parallel financial platform.

The primary user problem is not knowing whether a Provider is merely alive. It is safely bringing provider-native datasets into a user-named workspace, mapping fields, comparing samples, and querying only when compatibility is understood.

## Overview

1. **Home** — decide what needs attention and expose the next action.
2. **Workspaces** — user-named composition boundaries for provider datasets, canonical fields, mappings, and compatibility evidence.
3. **Data Sources** — OpenBB-native Provider inventory, native datasets, native fields, installation/discovery, credentials, and source health. Provider installation is a separate `/data-sources/add` flow.
4. **Query** — query a native dataset or a validated workspace with diagnostics that return to the source, mapping, or service repair action.
5. **Advanced** — service, runtime, credentials, extension internals, API/OpenAPI, configuration, and logs.

Extensions and Diagnostics are direct support destinations, not replacements for
the Data Sources workflow. `/extensions` preserves OpenBB's native installer
for Providers, PyPI, Conda, routers, and other extensions; `/data-sources/add`
offers the official Provider catalog as a shortcut, not as an exclusive list.

A data source is not automatically a workspace member. A market label, Provider name, matching field name, or similar response shape is only evidence for review. Workspace membership requires an explicit mapping contract and compatibility validation.

## Colors

Retain the existing OpenBB/OpenAlice theme tokens and status semantics during the functional UX phase. Do not introduce a new visual palette as part of information-architecture work.

- Primary text and surfaces: existing theme tokens.
- Accent: existing action accent for the single primary action on a surface.
- Warning: unresolved user action or compatibility review required.
- Error: blocked operation with a concrete recovery action.
- Success: verified installation, mapping, comparison, or query result.
- Status color must never be the only carrier of meaning; pair it with text and an action.

## Typography

Retain the existing project font stack and CJK fallback behavior. User-facing copy is plain Chinese where the product is localized, with the exact consequence or next action first. Technical OpenBB terms appear only when they help an advanced user inspect or repair the system.

- Use short headings that state the user's task.
- Keep one primary verb per surface.
- Write errors as consequence, cause when known, and next action.
- Never make Provider, Fetcher, Router, Runtime, or API terminology a prerequisite for the normal path.

## Layout

The shell exposes five top-level intents and preserves context across transitions.

### Home

Action Center with one dominant next action, unresolved actions ordered by consequence, recent workspaces, recent queries, and a compact OpenBB readiness control. A stopped or broken service is repaired inline with Start, Restart, or Repair; internal runtime details remain in Advanced.

### Workspaces

Default view is the user's named workspaces, not a hard-coded global market taxonomy. Each workspace shows member provider-native datasets, workspace canonical fields, provider-native fields, mapping status, comparison evidence, and the next unresolved action.

### Data Sources

Shows what OpenBB actually discovered or installed: Provider, native datasets, native fields, credentials, health, and installation/discovery status. Add Data Source is a resumable flow. The official Provider catalog is a shortcut; custom Provider installation remains available through the native `/extensions` installer. Adding a source and attaching a native dataset to a workspace are separate actions.

### Query

Accepts a native dataset or validated workspace as context. It preserves the source/workspace selection, shows result and diagnostics, and routes field conversion or service failures back to the responsible repair surface.

### Advanced

Contains OpenBB service, runtime, credentials, extensions, API/OpenAPI, configuration, and logs. These remain available but are not required to add a source, build a workspace, map fields, or run a normal query.

## Components

Behavioral contracts take priority over visual novelty.

- **Action Center item**: consequence, affected object, status, primary recovery action, optional details.
- **Workspace member table**: native dataset identity, mapping status, compatibility status, comparison evidence, and attach/remove action.
- **Field mapping editor**: Provider-native field, proposed OpenBB/workspace field, type/unit/granularity evidence, transform rule, accept/edit/reject controls, and preview.
- **Compatibility report**: compared query contract, sample rows, tolerances, mismatches, explanation, and safe next actions.
- **Add Data Source flow**: select/install from the official catalog or hand off to the native Provider installer, discover, apply, restart, verify, then optional workspace attachment.
- **Query diagnostics**: source, endpoint, duration, rows, warnings, validation failures, raw response link, and return-to-fix link.

Field scopes remain explicit:

```text
Provider-native field -> OpenBB standard field -> workspace canonical field
```

OpenBB's existing Provider inheritance, explicit `transform_data`, declared models, registry coverage, build, and tests remain the implementation contract for confirmed mappings.

## Do's and Don'ts

### Do

- Organize by user task and user-named workspace, not by an assumed universal market taxonomy.
- Keep native source identity visible before and after composition.
- Propose mappings with evidence; require explicit confirmation before promotion.
- Compare identical samples with declared tolerances before unified workspace use.
- Block material incompatibility by default and explain whether the likely issue is unit, time, symbol, adjustment, field, or source semantics.
- Preserve context when routing from a query failure to mapping or service repair.
- Give every state a consequence and a next action.
- Keep ordinary flows free of Python, Fetcher, Router, Conda, port, and build-command knowledge.

### Don't

- Do not infer that two datasets are equivalent because they are both A-share, K-line, or similarly named.
- Do not silently merge Provider-native fields or modify OpenBB Standard Models from a UI toggle.
- Do not treat a credential-success state as proof that a dataset is semantically compatible.
- Do not make Data Catalog a prewritten list of every possible market or asset class.
- Do not make Extensions, Backends, Environments, API Keys, or Field Mapping mandatory first-level concepts.
- Do not expose raw install/build logs as the normal progress experience.
- Do not create a parallel Provider framework, query API, runtime manager, or financial data model.
- Do not use large empty dashboard cards or status colors without text/action meaning.

## Source Decisions

- **Existing system authority**: adopted the complete OpenBB Fork and current Tauri/React shell; rejected rebuilding OpenBB capabilities.
- **User requirements**: adopted user-created workspaces, explicit composition, three field scopes, comparison-based safety, and one-click normal-mode service controls.
- **OpenBB implementation evidence**: adopted explicit Provider transformations and declared model contracts; rejected automatic semantic equivalence inferred by the registry.
- **Current design change**: `design/changes/studio-ux-architecture/` contains the requirements, grill decisions, OpenBB evidence, direction comparison, and page-task matrix.
- **Visual scope**: no new visual direction is selected in this phase; existing project tokens and components remain the baseline until a later visual pass.
