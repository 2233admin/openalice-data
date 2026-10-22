# UX decisions and acceptance

Status: Active current baseline.

## Accepted decisions

1. OAD is a humanized fork around the original ODP control plane.
2. Normal navigation is exactly 首页、数据源、环境与扩展。
3. Environment & Extensions owns environment selection, startup plans, service controls, extensions and the reused managed Conda flow.
4. Startup plan is environment-owned and stores only a unified reference list of services and launchable frontend extensions.
5. Home executes only the selected final list, reuses selected running services, preserves unselected services, tolerates partial failure and distinguishes new from reused services when stopping.
6. Data Sources is the only native source/API Key inventory; it keeps dense credential editing, built-ins at the bottom and flat workspace classification.
7. Workspace membership/order and existing automatic/batch routing behavior are preserved; removing organization never deletes native sources.
8. ODP commands remain authoritative for credentials, service lifecycle, environments, package operations, discovery, Notebook and logs.
9. Provider/Router are data-source capabilities, not duplicate extension rows; Notebook is an extension and not a Home service candidate.
10. Query, Advanced, Catalog, standalone frontend management, global Logs, second data core, credential bridge and frontend protocol are not requirements.

## Acceptance walkthroughs

- Home shows environment, environment plan, source/workspace and Start; it does not auto-start on open.
- “调整本次启动” exposes categorized service/frontend checkboxes without changing the saved plan.
- Start handles zero-service, service-only, frontend-only, reuse, partial failure, retry, contextual logs and safe stop-this-launch.
- Data Sources shows native/API Key rows and workspaces together; credential fields remain in the existing dense editor.
- Environment & Extensions has startup-plan, service and extension tabs and invokes existing Tauri/ODP commands.
- Legacy ODP URLs remain reachable but no longer appear as routine first-level navigation.
