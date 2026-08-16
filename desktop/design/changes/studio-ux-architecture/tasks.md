# Tasks: OpenAlice Data confirmed model

## Product model

- [x] Keep ODP authority for credentials, environments, services, extensions, Notebook and logs.
- [x] Restrict normal navigation to 首页 / 数据源 / 环境与扩展.
- [x] Keep workspaces as data-source-side flat composition/loadout relationships.
- [x] Add startup plan as the only new runtime-side concept.

## Home

- [x] Add environment → environment startup plan → data source/workspace selectors.
- [x] Keep default launcher compact with service/frontend count summary.
- [x] Add temporary categorized service/frontend selection without plan mutation.
- [x] Execute selected services first and open selected frontends afterward.
- [x] Reuse running selected services and leave unselected services untouched.
- [x] Record launch batch, partial failures, retry, contextual logs, stop-this-launch and stop-all behavior.
- [x] Persist last selection without auto-start on application open.
- [x] Migrate legacy Backend auto-start flags into environment default plans.

## Startup plans

- [x] Persist environment-owned plans with one unified service/frontend reference list.
- [x] Add compact add/edit/delete plan management with grouped multi-select.
- [x] Avoid copying command, port, env, working directory, data source or workspace.

## Data Sources

- [x] Keep one dense native data source/API Key inventory and embedded credential editor.
- [x] Keep built-in sources at the bottom and flat workspace classification.
- [x] Preserve workspace membership, order, automatic-switch and batch policies.
- [x] Point missing capability/service actions to the combined environment surface.

## Environment & Extensions

- [x] Add shared environment selector and Startup Plans / Services / Extensions tabs.
- [x] Reuse native service CRUD/lifecycle/log commands.
- [x] Reuse managed Conda environment creation/import/update/delete flow.
- [x] Show OpenBB standard components as one non-removable item.
- [x] Hide Provider, Router, openbb-core, dependencies and internal packages from normal extension rows.
- [x] Keep Notebook in extensions and out of Home service candidates.

## Verification

- [x] Add route behavior tests for the three-item navigation.
- [x] Add Home behavior tests for plan selection, temporary adjustments, reuse and partial failure.
- [x] Add startup plan store tests for persistence and auto-start migration.
- [ ] Run focused route/studio tests and typecheck/build.
- [ ] Review final diff without touching unrelated user changes.
