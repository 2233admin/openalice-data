# Page task matrix

Status: provisional; used for task walkthrough before implementation.

| Surface | User question | Primary action | Contextual entry points | Must not require |
|---|---|---|---|---|
| Home | What needs attention now? | Add Data Source or resolve the highest-priority issue | recent workspace, service readiness, unresolved mapping/credential/test issue | Provider, Fetcher, Router, Conda, port vocabulary |
| Workspaces | Which provider-native datasets do I want to treat as one working set? | Create/open workspace or add a member dataset | comparison, canonical fields, mappings, validation, workspace query | prewritten market taxonomy or automatic semantic merge |
| Data Sources | What did this source actually provide? | Add Data Source, inspect native dataset, map/attach | provider health, credentials, discovered fields, native query | assuming source category from provider name |
| Query | Can I retrieve and validate the data? | Run Query | native dataset or validated workspace; diagnostics can return to mapping/service repair | Swagger/Jupyter/API knowledge |
| Advanced | How do I repair or inspect the platform? | Start/Restart/Repair OpenBB or inspect internals | service, runtime, credentials, extensions, API/OpenAPI, logs | entering this area for ordinary add/query flows |

## Task-to-surface routing

- Add a source: Home/Data Sources -> Add Data Source flow -> native dataset discovery -> optionally attach to a workspace.
- Group two sources: Workspaces -> add both native datasets -> candidate mapping -> user confirmation -> sample comparison -> attach or block.
- Add a field: Workspaces or Data Sources -> field issue -> provider-specific field or workspace canonical field decision -> mapping validation.
- Query a source: Data Sources/Workspaces -> Query with context prefilled.
- Repair service: Home/Query inline action -> one-click Start/Restart/Repair; Advanced only for detail.
- Inspect OpenBB internals: Advanced; never required for the ordinary workflow.

## Validation questions

Each surface passes a task walkthrough only if its primary action is obvious, its current context is preserved, a failure exposes a next action, and the user can return to the originating workspace/dataset/field without reconstructing selections.
