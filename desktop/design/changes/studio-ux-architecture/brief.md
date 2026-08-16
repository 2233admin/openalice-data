# Brief: OpenAlice Data information architecture

## Status

Current product-design baseline for the confirmed three-surface model.

## Product boundary

OpenAlice Data is the Chinese, humanized fork of ODP Desktop. ODP remains authoritative for managed environments, services, credentials, extension installation, Provider execution, Notebook and logs. OpenAlice adds a task shell and one environment-owned startup-plan concept; it does not add a second data core, query engine, service state machine, credential bridge or frontend protocol.

## Primary surfaces

1. **首页** — choose environment, startup plan, data source/workspace and Start; adjust this launch only when requested.
2. **数据源** — one native/API Key inventory with dense credential editing and flat workspace classification.
3. **环境与扩展** — one environment context for startup plans, services, user-facing extensions and reused managed Conda operations.

Backends, Environments, Extensions, API Keys, Jupyter, Logs and standalone frontends remain migration-safe old URLs, not routine navigation. Query, Advanced and Data Catalog are not active products.

## Core workflow

```text
首页
  -> choose environment
  -> choose that environment's startup plan
  -> choose native data source/workspace
  -> optionally adjust service/frontend items for this launch
  -> Start: services first, then multiple frontends

数据源
  -> inspect/edit native API Key source
  -> classify or compose it in a flat workspace

环境与扩展
  -> select environment
  -> manage startup plans, ODP services and user-facing extensions
```

## Acceptance

- Three normal navigation links only.
- Startup plans reference existing services and launchable frontend extensions without copying configuration or data-source state.
- Start reuses selected running services, preserves unselected services, exposes partial failure/retry/logs and has safe stop-this-launch semantics.
- Data Sources remains the only API Key/source management surface.
- Original ODP routes and commands remain reachable and authoritative.
