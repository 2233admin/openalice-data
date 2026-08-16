## Purpose

Give users a durable, named Workspace source inside the unified Data Sources surface for composing multiple OpenBB-native datasets while keeping source identity, field semantics, compatibility evidence, and application state explicit and reviewable.

## ADDED Requirements

### Requirement: User-named Workspace composition

Studio MUST allow a user to create, rename, open, and remove a Workspace composition from the unified Data Sources surface. Creating a Workspace MUST require two or more explicitly selected native dataset members. A Workspace MUST have a stable identifier, a user-provided name, and a list of explicitly attached native dataset members. Workspace metadata MUST NOT contain Provider credentials or secret values. A single selected dataset MUST remain a native source rather than being converted into a Workspace.

#### Scenario: Create a Workspace from multiple sources
- **WHEN** the user selects two or more native datasets in Data Sources, provides a non-empty Workspace name, and confirms Create Workspace
- **THEN** Studio persists the Workspace and opens its composed-source detail within Data Sources
- **AND** the Workspace contains exactly the selected Provider/dataset identities
- **AND** no unselected Provider or dataset is silently added

#### Scenario: Single source remains native
- **WHEN** the user selects only one native dataset
- **THEN** Studio keeps the selection as a native source
- **AND** Studio does not create a Workspace or imply composition

#### Scenario: Rename a Workspace
- **WHEN** the user changes a Workspace name
- **THEN** later navigation and query history use the new name
- **AND** the Workspace identifier and its members, mappings, and evidence remain unchanged

#### Scenario: Remove a Workspace
- **WHEN** the user explicitly removes a Workspace
- **THEN** Studio removes the Workspace metadata and its local comparison evidence
- **AND** the underlying Provider, native dataset, credentials, extension, and OpenBB configuration remain unchanged

### Requirement: Explicit native dataset membership

A Workspace MUST preserve the Provider-native identity of every member, including Provider identifier, native dataset identifier, source paths when available, and the time it was attached. Workspace membership MUST be managed from the unified Data Sources surface through explicit selection, drag/drop, or Add Data Source actions. A Provider dataset MUST NOT become a Workspace member because of a market label, matching display name, matching field name, or similar response shape.

#### Scenario: Attach a native dataset
- **WHEN** the user adds a discovered Provider-native dataset to a selected Workspace in Data Sources and confirms Attach
- **THEN** Studio adds that exact Provider/dataset identity to the selected Workspace
- **AND** the member starts in an unverified mapping state
- **AND** the same native dataset remains queryable from Data Sources and Query

#### Scenario: Candidate datasets look similar
- **WHEN** two Providers expose similarly named datasets or fields
- **THEN** Studio may show them as mapping candidates with evidence
- **BUT** Studio MUST NOT attach, merge, or mark them compatible without explicit user confirmation
### Requirement: Distinct composition query modes

A Workspace MUST distinguish source-backed member queries from shared-canonical queries. A source-backed query MAY execute through one explicitly selected usable member without a verified shared mapping. A shared-canonical query MUST remain blocked until mapping, bounded comparison, OpenBB-compatible apply/verify, and version checks pass.

#### Scenario: Source-backed member query remains available
- **WHEN** a Workspace has at least one usable native member but mapping is draft, blocked, or incompatible
- **THEN** Studio allows the user to select that member and run a source-backed query
- **AND** the result identifies the actual Provider/dataset member
- **AND** Studio does not label the result as a shared canonical Workspace result

#### Scenario: Shared canonical query remains gated
- **WHEN** a Workspace mapping or comparison is not applied and verified for the current version
- **THEN** Studio blocks only the shared-canonical query mode
- **AND** provides mapping, comparison, apply, or repair actions

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
