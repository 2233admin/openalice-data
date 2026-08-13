## 1. Runtime Inspector and contract

- [x] 1.1 Implement a bundled Python Inspector that serializes providers, credentials metadata, Standard Models, query/data fields, routes, and coverage from OpenBB registries.
- [x] 1.2 Add secret-exclusion and provider/field contract tests, including a smoke test against a real managed OpenBB runtime.
- [x] 1.3 Add a fixed Tauri inspection command that validates managed environment names, runs off the main thread, parses JSON, and rejects traversal or shell input.
- [x] 1.4 Define a strict Zod renderer contract and aggregate Inspector, service, runtime, and extension state through TanStack Query.

## 2. Studio shell and preserved controls

- [x] 2.1 Route installed users to Home and replace normal primary navigation with the six Studio destinations while preserving setup/log utility behavior.
- [x] 2.2 Implement Home with one Add Data Source action, actionable issues, live status, connected sources, and recent successful queries.
- [x] 2.3 Implement Advanced mapping for Services, Runtimes, Credentials, Configuration, Extensions Internals, and Logs using original ODP controls.

## 3. Data source management

- [x] 3.1 Implement searchable Data Sources inventory with normalized status, version, capability count, credential state, last test, Open, and Test actions.
- [x] 3.2 Implement provider detail Overview, Capabilities, Credentials, Health, and Advanced sections.
- [x] 3.3 Implement Registry-driven masked credential updates that preserve the existing flat OpenBB credentials structure and never return saved values.
- [x] 3.4 Implement representative Save-and-Test behavior and persist independently observed health checks, last test time, and actionable failures.

## 4. Data Catalog and Playground

- [x] 4.1 Implement a business-category Data Catalog showing paths, Standard Model, provider coverage, common fields, provider fields, and last success.
- [x] 4.2 Implement deep-linked dataset/provider selection and common plus provider-specific QueryParams forms with type, required, description, and choice handling.
- [x] 4.3 Run queries only through the active managed OpenBB API and show actionable stopped-service and redacted provider errors.
- [x] 4.4 Implement sortable, filterable, virtualized results plus lazy chart, raw response, accurate Python/REST usage, and diagnostics.

## 5. Extensions and lifecycle reuse

- [x] 5.1 Implement Extensions inventory with package/type/version/status/capabilities/compatibility/update metadata where available.
- [x] 5.2 Reuse the existing controlled runtime installer and express install, discovery, apply, restart, and verification stages without exposing raw package commands as the primary UI.

## 6. Verification and safety

- [x] 6.1 Add renderer unit/component tests for navigation, Home, inventories, provider credentials, Playground forms/results, error states, and secret redaction.
- [x] 6.2 Add Rust tests for Inspector execution boundaries and Python tests for registry serialization and secret exclusion.
- [ ] 6.3 Add an automated real-provider core-flow integration or Desktop E2E test covering discovery through returned rows and Usage.
- [x] 6.4 Run the complete renderer tests, lint, production build, Python Inspector tests, Rust tests, diff checks, and dependency audit.

## 7. Documentation and dependency record

- [x] 7.1 Document the Studio architecture, runtime data flow, development/verification commands, limitations, and P1 continuation seam.
- [x] 7.2 Record every added dependency, version, license, purpose, bundle strategy, and unresolved audit finding.
