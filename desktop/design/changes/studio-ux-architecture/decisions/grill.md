# UX design grill decisions

Status: Active current baseline.

1. OpenAlice is a humanized ODP fork, not a replacement platform.
2. Normal surfaces are exactly 首页、数据源、环境与扩展。
3. Environment & Extensions combines startup plans, services, extensions and the reused managed-environment flow.
4. Startup plan is the only new runtime-side concept: environment-owned, multi-service/multi-frontend, reference-only.
5. Home chooses environment, plan and data source/workspace, then executes only the final explicit launch items.
6. Existing running selected services are reused; unselected services are untouched; partial failure does not stop other items.
7. Data Sources keeps native ODP/OpenBB/API Key identity and the dense API Keys component; workspaces remain flat composition/loadout relationships.
8. Provider and Router are data-source capabilities, not extension rows; Notebook is a user-facing extension and not a Home service candidate.
9. ODP remains authoritative for credentials, process lifecycle, environment/package operations, discovery, Notebook and logs.
10. Legacy Backends, Environments, Extensions, API Keys, Frontends, Jupyter and Logs URLs remain only for migration safety.
11. No Query engine, Catalog product, second data core, service state machine, credential bridge, frontend URL registry, template/clone environment, external Python environment or generic Settings/Advanced surface.
