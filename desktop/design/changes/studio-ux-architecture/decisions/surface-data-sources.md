# Surface: Data Sources

Status: Active design baseline.

## User question

我有哪些数据源，每个能提供什么，哪些可以直接用或组合？

## Primary actions

- Use one native source directly.
- Explicitly compose multiple similar sources.
- Inspect or edit a composed source.
- Add a missing capability through Extensions.

## Inventory rules

- One vertical inventory contains native and composed source rows.
- Native rows keep exact Provider/dataset/API identity, capability metadata, credential state, and live availability evidence.
- Composed rows keep exact member identities, member availability, and existing route outcome when known.
- Live ODP inspection is authoritative; static catalog labels are not.
- There is no second Data Catalog or user-facing Workspaces page.

## Composition rules

A composition is optional. A native source remains directly usable.

Supported gestures:

- multi-select → `组合`;
- right-click → `组合`;
- drag one source card onto another → `组合`.

The composition:

- contains exactly the explicitly selected members;
- persists as its own source card;
- supports rename, add, remove, reorder, inspect, and dissolve;
- never deletes native sources when a member is removed or a composition is dissolved;
- does not infer equivalence from names, Provider labels, market labels, or matching fields;
- reuses existing capability metadata and routing policy without creating a category taxonomy or mapping engine.

The UI may show unknown when metadata cannot establish a capability match. User selection confirms membership; execution still checks the requested capability and current member state.

## States

- Loading/inspecting: inventory is not yet trustworthy.
- Empty: offer Add Data Source or Extensions.
- Available: current evidence supports direct use.
- Credential required: link to ODP API Keys or the existing credential action.
- Service unavailable: link to ODP Backends or the responsible ODP route.
- Extension missing: link to Extensions.
- Composition unavailable: keep all members visible with concrete reasons; do not fabricate a usable route.

## Do not add

- Query page or query history.
- Workspace route.
- Mapping/canonical-field/compatibility workflow.
- Silent row merge or inferred membership.
