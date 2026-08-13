## Context

See `proposal.md` for motivation. ODP Desktop already owns Conda environments, provider extension installation, credentials, backend services, process logs, setup, and Tauri lifecycle behavior. The change crosses Python runtime introspection, Rust/Tauri process boundaries, React routing/state, sensitive credentials, data-dense results, and generated routes. The working tree contains a partial implementation created before these artifacts and must be verified rather than presumed complete.

## Goals / Non-Goals

**Goals:**

- Preserve ODP operational modules as the only implementation of environments, services, credentials, extensions, and logs.
- Establish one typed, secret-free Inspector boundary sourced from OpenBB registries.
- Keep route pages thin and composed around shared query/actions/result components.
- Use maintained libraries for server-state caching, form state, tables, virtualization, validation, and charts.
- Support rollback by keeping original routes intact and limiting new integration points.

**Non-Goals:**

- A second financial model, provider registry, environment manager, service manager, or package installer.
- Provider Builder, Router Builder, extension marketplace, widget dashboard, or node canvas.
- Replacing the OpenBB API with direct provider HTTP calls from the renderer.

## Decisions

### Decision: Inspect OpenBB registries inside the selected managed Python runtime

The bundled Inspector imports `ProviderInterface`, `RegistryMap`, `CommandMap`, and `UserSettings`, then emits a JSON-safe contract. This preserves OpenBB as the source of truth and automatically follows installed extensions. Parsing OpenAPI solely in React was rejected because it cannot authoritatively expose credentials, installed packages, provider model deltas, or lifecycle state and would duplicate mapping rules.

### Decision: Expose one fixed Tauri inspection command

Rust resolves a validated environment name under the ODP installation and executes only the bundled Inspector. Arbitrary command strings and arbitrary script paths are rejected. Reusing the existing generic `execute_in_environment` renderer command was rejected because Studio inspection does not require user-supplied shell capability.

### Decision: Keep credential values behind the existing bridge

Inspector output carries names and configured booleans only. Credential updates use the existing flat OpenBB settings representation and preserve unrelated keys. Stronghold is not introduced in P0 because OpenBB itself must read `user_settings.json`; a second secret store would require a lifecycle injection bridge and migration policy.

### Decision: Aggregate lifecycle state with existing Tauri commands

The renderer combines the Inspector result with `list_backend_services`, `list_conda_environments`, and `get_environment_extensions`, validates the result with Zod, and caches/refetches with TanStack Query. Pages consume this shared state rather than reading files or guessing status.

### Decision: Reuse mature UI/data libraries

Existing `@openbb/ui-pro`, React Hook Form, Zod, TanStack Router, and Tailwind remain in place. TanStack Query/Table/Virtual and ECharts are added for caching, table state, virtualization, and charts. ECharts is registered by module and lazy-loaded. Custom component code is restricted to product-specific composition and transport adapters.

### Decision: Preserve original routes and demote them through navigation

The primary shell changes for installed normal use, but setup, progress, uninstall, and dedicated log windows retain their behavior. Advanced links to original ODP pages. This minimizes rollback risk and avoids duplicating mature infrastructure flows.

### Decision: Record observed health separately from inferred readiness

Package discovery, credentials, build currency, endpoint reachability, and sample query are distinct checks. A provider becomes Available only from observed successful evidence; discovery alone can at most produce Ready to Test. Persisted last-test and recent-query records belong to a small Studio state store, not to provider metadata inference.

## Risks / Trade-offs

- [Registry construction can be slow] → Run inspection off the Tauri main thread, cache with bounded staleness, and refresh after lifecycle mutations.
- [OpenBB internal object shapes can evolve] → Keep Python serialization isolated, validate the renderer boundary strictly, and test against real installed runtime smoke fixtures.
- [Existing backend names are user-editable] → Identify managed OpenBB API services using multiple signals and allow explicit runtime/service selection in Advanced if ambiguity remains.
- [Credentials must remain compatible with OpenBB files] → Reuse the existing bridge, preserve flat keys, redact errors, and add negative security tests.
- [Chart library affects bundle size] → Lazy-load a tree-shaken chart module only when Chart is selected.
- [The pre-artifact implementation may not match this design] → Run OpenSpec verification before marking tasks complete, and leave uncovered tasks pending.

## Migration Plan

1. Add the Inspector and contract behind new commands/routes while preserving existing ODP pages.
2. Change installed-user entry and primary navigation after contract tests pass.
3. Add Studio pages incrementally, reusing original mutations and logs.
4. Run Python, Rust, renderer, production-build, and desktop E2E verification.
5. Roll back by restoring the original root navigation and index destination; original operational routes require no data migration.
