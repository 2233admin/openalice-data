---
name: openalice-data-functional-ux
---

# OpenAlice Data functional UX foundation

## Product context

OpenAlice Data is the Chinese, humanized task shell around ODP Desktop. OpenBB Provider, credentials, managed runtimes, extension installation, service supervision, REST/MCP and logs remain system authority. OpenAlice organizes those capabilities without creating a second data core, query engine, credential bridge, frontend protocol or service state machine.

## Normal surfaces

1. **Home** — choose environment, that environment's startup plan, a native data source/workspace and Start. The compact default exposes only those three selectors, a service/frontend summary and Start. Temporary launch-item changes are explicit and do not overwrite the plan.
2. **Data Sources** — one dense native source/API Key inventory with flat workspace classification and existing routing/batch relationships.
3. **Environment & Extensions** — one environment context with Startup Plans, Services, Extensions and the reused managed Conda environment flow.

Backends, Environments, Extensions, API Keys, Jupyter, Logs and standalone frontend URLs remain migration-safe legacy routes, not normal navigation.

## Domain boundaries

A startup plan belongs to one environment and stores only a unified list of service/frontend references. It does not copy command, port, environment variables, working directory, data source or workspace. Start launches only final selected items: reuse selected running services, start the rest through ODP, then open selected frontends. A launch batch records newly started, reused and failed services; stopping the batch never stops reused services.

A data source is an ODP/OpenBB-native source or API Key source, not a Provider × Dataset/API capability row. API Key fields stay in the original dense component and expand only during editing. Built-in sources are listed last. A workspace is a flat, reusable source loadout; membership, order and existing automatic/batch policies remain explicit and do not delete native sources.

Extensions show only user-recognizable management units such as visualization frontends, Python Notebook and research/backtest tools. OpenBB standard runtime components are one non-removable item. Provider, Router, openbb-core, dependencies and internal packages stay hidden unless native diagnostics require them.

## Visual and interaction foundation

Retain OpenBB/API Keys controls, theme tokens, tables, dense rows and static motion. Use short Chinese labels, visible status plus an action, contextual native logs, semantic headings and keyboard order. Do not introduce decorative dashboard cards, duplicate explanations, snapshot-driven UI or style-specific test contracts.

## Reuse and non-goals

Reuse ODP Tauri commands for credentials, environment/package operations, services, extensions, Notebook and logs. Do not add Query, Data Catalog, frontend registry/custom URL form, mapping/canonical-field engine, generic Settings/Advanced shell, package marketplace, environment templates/cloning or arbitrary external Python environments.
