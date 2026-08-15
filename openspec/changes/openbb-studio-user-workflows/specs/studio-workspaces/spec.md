## Purpose

Give users a durable, named boundary for composing OpenBB-native datasets while keeping source identity, field semantics, compatibility evidence, and application state explicit and reviewable.

## ADDED Requirements

### Requirement: User-named workspace lifecycle

Studio MUST allow a user to create, rename, open, and remove a workspace. A workspace MUST have a stable identifier, a user-provided name, and a list of explicitly attached native dataset members. Workspace metadata MUST NOT contain Provider credentials or secret values.

#### Scenario: Create an empty workspace
- **WHEN** the user provides a non-empty workspace name
- **THEN** Studio persists the workspace and opens its empty state
- **AND** the empty state asks the user to attach a native dataset
- **AND** no Provider or dataset is silently added

#### Scenario: Rename a workspace
- **WHEN** the user changes a workspace name
- **THEN** later navigation and query history use the new name
- **AND** the workspace identifier and its members, mappings, and evidence remain unchanged

#### Scenario: Remove a workspace
- **WHEN** the user explicitly removes a workspace
- **THEN** Studio removes the workspace metadata and its local comparison evidence
- **AND** the underlying Provider, native dataset, credentials, extension, and OpenBB configuration remain unchanged

### Requirement: Explicit native dataset membership

A workspace MUST preserve the Provider-native identity of every member, including Provider identifier, native dataset identifier, source paths when available, and the time it was attached. A Provider dataset MUST NOT become a workspace member because of a market label, matching display name, matching field name, or similar response shape.

#### Scenario: Attach a native dataset
- **WHEN** the user selects a discovered Provider-native dataset and confirms Attach
- **THEN** Studio adds that exact Provider/dataset identity to the selected workspace
- **AND** the member starts in an unverified mapping state
- **AND** the same native dataset remains queryable from Data Sources and Query

#### Scenario: Candidate datasets look similar
- **WHEN** two Providers expose similarly named datasets or fields
- **THEN** Studio may show them as mapping candidates with evidence
- **BUT** Studio MUST NOT attach, merge, or mark them compatible without explicit user confirmation

### Requirement: Three-scope field mapping

Studio MUST represent mapping through three distinguishable scopes: Provider-native field, OpenBB standard field, and workspace canonical field. A mapping record MUST retain source field identity, target identity, type/unit/time-granularity information when known, any transform rule, evidence or explanation, and draft/application status. Provider-specific fields MUST remain visible and MUST NOT be silently discarded as common fields.

#### Scenario: Review a proposed mapping
- **WHEN** Studio proposes a field mapping from samples or declared schema
- **THEN** the user can see the source field, target field, types, units, time semantics, and reason for the proposal
- **AND** the user can accept, edit, or reject the proposal
- **AND** rejection leaves the source field available for an explicit alternative mapping

#### Scenario: Mapping is edited
- **WHEN** the user changes a target field, type, unit, granularity, or transform
- **THEN** the mapping is marked as a draft requiring revalidation
- **AND** the workspace cannot treat the edited mapping as verified until comparison succeeds again

### Requirement: Sample-based compatibility gate

Before a workspace can run a unified query, Studio MUST compare the selected members using an equivalent query contract and a bounded sample. The comparison MUST report at least query inputs, returned rows, mapped fields, missing fields, type/unit/time mismatches, tolerance or comparison policy, and a compatibility result. Compatibility MUST be explicit; similar field names alone are insufficient.

#### Scenario: Members are compatible
- **WHEN** all required mappings are confirmed and the same sample query returns data that satisfies the declared comparison policy
- **THEN** Studio marks the member set as compatible
- **AND** shows the evidence timestamp and query inputs
- **AND** enables the next apply/verify action

#### Scenario: Members are incompatible
- **WHEN** the sample reveals missing fields, unit mismatch, time-granularity mismatch, symbol semantics mismatch, adjustment mismatch, or values outside tolerance
- **THEN** Studio marks the affected mapping or member set incompatible
- **AND** explains the mismatch in user terms
- **AND** disables unified workspace querying until the user edits the mapping, removes the member, or explicitly creates a separate workspace

#### Scenario: Comparison cannot run
- **WHEN** the service is stopped, credentials are missing, the query is invalid, or the Provider returns an error
- **THEN** Studio marks the comparison blocked rather than compatible
- **AND** routes the user to the responsible service, credential, source, or query action

### Requirement: OpenBB-compatible apply boundary

A confirmed workspace mapping MUST have a distinct apply/verify state. Applying a mapping MUST ultimately use the existing OpenBB Provider transformation, declared model, registry, build, and service verification contracts. A frontend-only conversion MUST NOT be reported as an applied OpenBB mapping.

#### Scenario: Apply succeeds
- **WHEN** the user applies a validated mapping and the existing OpenBB build/reload/restart path completes successfully
- **THEN** Studio records the applied mapping version and verification result
- **AND** a subsequent query observes the applied OpenBB-compatible output
- **AND** the workspace becomes eligible for unified querying

#### Scenario: Apply fails
- **WHEN** the OpenBB transform/model/build/restart/verification path fails
- **THEN** Studio keeps the last known applied mapping intact
- **AND** marks the new mapping as apply-failed with the underlying recovery action
- **AND** prevents the failed draft from enabling unified querying

### Requirement: Workspace state survives refresh

Workspace names, membership, mapping drafts, applied versions, comparison evidence, and compatibility status MUST survive a normal desktop reload. Refreshing workspace metadata MUST re-inspect the underlying OpenBB source state and MUST clearly mark source facts or comparison evidence stale when the runtime or Provider state has changed.

#### Scenario: OpenBB state changes after reload
- **WHEN** a workspace is reopened after its Provider is uninstalled, credentials change, or the service is unavailable
- **THEN** Studio keeps the workspace and its member identities
- **AND** marks affected members or evidence unavailable/stale
- **AND** does not silently delete mappings or claim that the workspace is still queryable
