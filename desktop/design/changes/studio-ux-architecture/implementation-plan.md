# OpenAlice Data implementation order and verification

## Status

This is the implementation order for the confirmed three-surface model. Existing ODP commands and pages remain authoritative.

## Dependency graph

```text
CONTEXT.md
  -> three-link navigation
  -> startup plan persistence/migration
  -> Home execution and launch batch
  -> Environment & Extensions tabs
  -> Data Sources wording/entry cleanup
  -> focused route/studio verification
```

## Foundation

- Keep `/home`, `/data-sources` and `/environment-extensions` as the only normal navigation links.
- Keep old Backends, Environments, Extensions, API Keys, Frontends, Jupyter and Logs URLs reachable only as migration-safe paths.
- Expose all managed services and runtimes from the existing ODP state loader; do not create a second service state machine.

## Startup plans

- Store `{ environment, name, items[] }`, where each item is a service or launchable frontend reference.
- Validate and migrate persisted data at the boundary.
- Convert legacy Backend auto-start flags into one default plan per environment and disable those flags through `update_backend_service`.
- Never copy command, port, env, working directory, data source or workspace into a plan.

## Home

- Select environment, environment-owned plan and source/workspace.
- Keep default view compact; temporary categorized item changes are opt-in and non-persistent to the plan.
- Execute services first, reuse selected running services, open all selected frontends afterward, retain partial failure.
- Track new/reused/failed batch entries; support retry, contextual logs, stop this batch, stop one service and stop all.
- Restore last selection without auto-running at application startup.

## Environment & Extensions

- Shared environment selector and tabs for Startup Plans, Services and Extensions; retain a tab that reuses original managed environment creation/import/update/delete.
- Service tab invokes existing create/update/delete/start/stop/log commands and never exposes legacy auto-start as normal UI.
- Extension tab shows only recognizable management units, merges OpenBB standard components into one non-removable item, and delegates installation/update/removal to native commands.
- Notebook stays within extensions and outside Home service candidates.

## Data Sources

- Keep the dense API Keys editor embedded in the only source inventory.
- Preserve built-in ordering, exact source identity, workspace membership, route order and batch policy.
- Point service/extension repair actions at Environment & Extensions; do not add Query, Catalog or a second workspace product.

## Verification

- Route behavior tests: exactly three navigation links and legacy deep-link active mapping.
- Home behavior tests: selectors, plan summary, temporary adjustments, service start, frontend opening, reuse, partial failure and persistence.
- Store tests: unified references, no copied config, update/delete and auto-start migration.
- Studio client tests: all backend exposure and contextual error routes.
- Run focused Vitest and `npm exec tsc -- --noEmit`; explicitly skip formatter, linter, full suite and browser QA.
