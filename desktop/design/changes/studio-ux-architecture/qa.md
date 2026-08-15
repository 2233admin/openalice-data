# QA

## Scope

OpenBB Studio functional UX implementation for the normal desktop shell,
Action Center, live source inventory, dedicated data source installation,
native catalog/query surfaces, and explicit local workspaces. No external
visual reference or pixel-fidelity claim applies; the existing
OpenAlice/OpenBB theme and `DESIGN.md` tokens are the design authority.

## Gates

- **Design foundation:** passed. `DESIGN.md` and `MOTION.md` are ready; motion
  posture is static and uses no decorative animation.
- **Visual/UX:** passed for the implemented scope. The shell keeps five
  normal user intents; Extensions and Diagnostics are direct support
  destinations; data source installation is a separate Provider workflow with
  an explicit handoff to the full native OpenBB installer; infrastructure is
  grouped under Advanced. Source cards use two direct actions, and page
  hierarchy uses existing theme tokens without gradients or dashboard chrome.
- **State coverage:** passed. Loading, runtime failure, stopped service,
  successful-empty inspection, stale/unavailable workspace members, credential
  required, partial Provider state, query success, malformed response, and
  redacted query failure paths are represented by tests or implementation
  branches.
- **Accessibility:** passed by code inspection. Semantic navigation, headings,
  labels, `aria-live`, status roles, table headers, password inputs, and
  recovery links are present. Automated axe coverage was not run.
- **Responsive behavior:** passed by implementation review. Source/catalog
  collections use overflow containers; cards and action groups wrap at narrow
  widths.
- **Motion:** passed. No new motion runtime or decorative transitions were
  introduced; static state changes remain usable with reduced motion.
- **Anti-slop:** manual contextual review passed. No generic gradient hero,
  excessive cards, fake metrics, or unrelated visual system was introduced.
  The optional anti-slop automation was not run.

## Verification evidence

- `npm run test -- --run`: 29 files passed, 197 tests passed, 1 skipped.
- `npm run lint`: passed.
- `npm run build`: passed (`tsc` and Vite production build).
- `openspec validate openbb-studio-user-workflows --type change --strict
  --json`: passed.
- `python -m py_compile` passed for the coverage metadata router and its
  contract test module.
- Targeted regression tests cover startup redirect cancellation during
  unmount, dedicated Data Sources and Workspaces parent `Outlet` layouts,
  child-route return, OpenBB API/MCP backend discovery and API-priority
  selection, one shared Home service-management surface, per-service start
  actions, complete OpenBB extension categories, installed Provider packages,
  the custom Provider handoff, and the direct `/backends` service-management
  handoff from Home.
- Browser automation was not run because the user explicitly requested no
  browser interaction; focused UI tests, full tests, lint, and production build
  passed instead.
- Tauri startup navigation regression was fixed: root installation-state
  routing and native menu navigation now stay in the client router instead of
  hard-reloading packaged client routes. The main macOS window no longer forces
  an opaque black native background when the webview has not painted.

## Limitations and risks

- Rust Studio tests remain blocked on this Windows host because
  `openssl-sys` cannot find an OpenSSL installation; set `OPENSSL_DIR`,
  `OPENSSL_INCLUDE_DIR`, and `OPENSSL_LIB_DIR` before rerunning
  `cargo test studio::tests`.
- The managed-OpenBB integration test was not run because
  `OPENBB_STUDIO_API_URL` was not configured.
- P1 mapping editor/comparison/apply/build integration remains a fail-closed
  contract boundary. P2 Dataset/Router/Provider generation is intentionally
  not implemented.
- The reconciliation checker reports non-applicable template warnings for a
  missing graybox capture and placeholder timestamps; this change has no
  external reference composition to reconcile.


## Claim

Functional implementation QA is **passed for the exercised scope**. Pixel
fidelity and managed-runtime/Rust execution are **unverified on this host**.
