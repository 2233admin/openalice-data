# Studio P0 third-party dependencies

These packages were added for Studio P0. Versions are locked in
`package-lock.json`.

| Package | Version | License | Purpose |
|---|---:|---|---|
| `@tanstack/react-query` | 5.101.4 | MIT | Runtime snapshot caching, refresh, and invalidation |
| `@tanstack/react-table` | 8.21.3 | MIT | Dataset and query-result table models |
| `@tanstack/react-virtual` | 3.14.9 | MIT | Virtualized large query-result rows |
| `echarts` | 6.1.0 | Apache-2.0 | Lazy-loaded, tree-shaken time-series chart |

TanStack Query/Table/Virtual are included in the main vendor chunks because
they serve core Studio screens. ECharts registers only the line-chart modules
used by Studio and is loaded through a separate lazy chunk.

Existing `@openbb/ui-pro`, React Hook Form, Zod, TanStack Router, Tailwind, and
Tauri dependencies continue to be reused.

`npm audit` currently reports five vulnerabilities in the pre-existing toolchain
dependency graph (PostCSS, Seroval, JS-YAML, NanoID, and brace-expansion). None
is introduced by the four packages above. They should be upgraded in a separate
dependency-maintenance change with the full Desktop test matrix.
