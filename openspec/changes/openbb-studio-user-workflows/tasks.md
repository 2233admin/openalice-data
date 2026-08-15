## 1. Live OpenBB inspection and contracts

- [x] 1.1 Extend the Studio snapshot contract with explicit freshness, service state, Provider credential metadata, declared response fields, and normalized action states.
- [x] 1.2 Extend the existing Tauri Studio inspection adapter to read live OpenBB OpenAPI/coverage data and registry-backed credential names without returning secret values.
- [x] 1.3 Make runtime/service selection truthful: distinguish running, stopped, missing runtime, stale inspection, and inspection failure without inventing Provider or dataset records.
- [x] 1.4 Add Rust and TypeScript contract tests for OpenAPI/coverage parsing, unknown metadata, redaction, and actionable inspection errors.

## 2. User-facing information architecture

- [x] 2.1 Migrate the normal shell to Home, Workspaces, Data Sources, Query, and Advanced while preserving existing detail and repair capabilities.
- [x] 2.2 Move Backends, Environments, API credentials, Extensions, API/OpenAPI, Configuration, and Logs behind Advanced sections with deep-linkable recovery routes.
- [x] 2.3 Make Home render live action items from the Studio snapshot and recent activity, with one primary next action and preserved entity context.
- [x] 2.4 Add route-level tests for the five intents, action routing, empty states, loading states, and Advanced handoffs.

## 3. P0 source inventory and native query

- [x] 3.1 Update Data Sources, native Data Catalog, Provider detail, credential, capability, and health views to use the enriched live inspection contract.
- [x] 3.2 Keep extension installation and service lifecycle on the existing Tauri commands while exposing user-facing progress stages and recovery actions.
- [x] 3.3 Consolidate native query execution under the Query surface with target identity, submitted inputs, results, warnings, raw response, usage inputs, and duration.
- [x] 3.4 Implement diagnostic classification and secret redaction for request errors, response details, activity records, and copied usage evidence.
- [x] 3.5 Add UI and managed-OpenBB tests for credential-required, service-stopped, successful native query, warnings, malformed response, and provider failure paths.

## 4. P0 workspace foundation

- [x] 4.1 Add a versioned Studio workspace store using the existing desktop local persistence pattern, with migration handling and no credential fields.
- [x] 4.2 Implement workspace create, rename, open, and remove flows with stable identifiers and explicit empty states.
- [x] 4.3 Implement explicit attachment of Provider-native dataset references without inferred or silent membership.
- [x] 4.4 Show native member provenance and stale/unavailable source state when the underlying Provider or service changes.
- [x] 4.5 Add workspace store, lifecycle, attachment, reload, and source-change regression tests.

## 5. P1 field mapping and compatibility

- [ ] 5.1 Add three-scope mapping contracts and a reviewable mapping editor for Provider-native, OpenBB standard, and workspace canonical fields.
- [ ] 5.2 Implement draft accept/edit/reject transitions that preserve Provider-specific fields and invalidate verification after semantic edits.
- [ ] 5.3 Implement bounded sample comparison with declared query inputs, field/type/unit/time evidence, mismatch explanations, and compatible/incompatible/blocked states.
- [ ] 5.4 Add an apply/verify adapter that delegates confirmed mappings to the existing OpenBB transformation, model, registry, build, restart, and verification path.
- [ ] 5.5 Fail closed on apply failure or unavailable OpenBB integration, preserving the last applied version and disabling unified workspace queries.
- [ ] 5.6 Enable workspace Query only when required mappings are applied, compatibility is verified, and the applied version matches the comparison evidence.
- [ ] 5.7 Add mapping, comparison, apply failure, version mismatch, and workspace query gate tests.

## 6. Boundary, documentation, and verification

- [x] 6.1 Record the P2 Dataset/Router/Provider Builder handoff without implementing code generation or a parallel model contract.
- [x] 6.2 Update desktop development documentation with the Studio state adapter, workspace persistence, OpenBB integration boundary, test commands, and known limitations.
- [x] 6.3 Run the affected frontend tests and opt-in managed-OpenBB integration test when `OPENBB_STUDIO_API_URL` is configured.
- [x] 6.4 Run the desktop production build and OpenSpec validation; resolve any contract, type, or route regressions before implementation is considered complete.
