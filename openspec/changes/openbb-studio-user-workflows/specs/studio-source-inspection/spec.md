## Purpose

Expose the live OpenBB runtime as understandable, validated Studio state so users can discover Providers and native datasets without maintaining a parallel catalog or learning OpenBB internals.

## ADDED Requirements

### Requirement: Live source inventory

The Studio MUST present Provider and native dataset inventory from the currently selected managed OpenBB environment. Each Provider MUST expose a stable identifier, display name, version when reported, normalized status, capability count, capability identifiers, and credential metadata without exposing secret values. Each dataset MUST expose its native identity, display name, category, OpenBB API path, Python path when reported, declared standard model, Provider coverage, query fields, and data fields when reported.

#### Scenario: Running OpenBB exposes current inventory
- **WHEN** the managed OpenBB service is running and its coverage/OpenAPI inspection succeeds
- **THEN** Studio shows the Providers and datasets reported by that service, including their current paths and field metadata
- **AND** Studio does not substitute a static list for the live response

#### Scenario: No Provider data is available
- **WHEN** inspection succeeds but OpenBB reports no Providers or datasets
- **THEN** Studio shows an explicit empty state
- **AND** the empty state distinguishes "no data reported" from "inspection failed"

### Requirement: Truthful normalized states

Studio MUST normalize source, credential, dataset, extension, and service facts into user-facing states: `not_installed`, `setup_required`, `credential_required`, `ready_to_test`, `available`, `partial`, `failed`, and `updating`. A state MUST be accompanied by explanatory text and, when recovery is possible, one concrete action. `available` MUST NOT be shown solely because a package name exists; it requires that the managed OpenBB runtime reports the capability as loaded and usable for inspection.

#### Scenario: Credential is missing
- **WHEN** a Provider is discovered but a required credential is not configured
- **THEN** the Provider is shown as `credential_required`
- **AND** Studio offers a credential action and a representative-query test action
- **AND** no secret value is rendered or persisted in the inventory response

#### Scenario: Service is stopped
- **WHEN** no managed OpenBB API service is running but a managed OpenBB runtime exists
- **THEN** Studio shows the service as stopped rather than fabricating Provider availability
- **AND** the primary recovery action is to start or repair the service

### Requirement: Actionable inspection failure

When runtime discovery, service inspection, OpenAPI retrieval, or coverage retrieval fails, Studio MUST preserve the failure category and provide a route to the responsible recovery surface. It MUST NOT invent Provider, dataset, capability, credential, or extension facts to make the page appear populated.

#### Scenario: Runtime is missing
- **WHEN** no managed OpenBB runtime can be found
- **THEN** Studio shows an actionable runtime-not-found state
- **AND** the action routes to Advanced runtime management
- **AND** the source and dataset lists are not populated with fabricated records

#### Scenario: OpenBB inspection endpoint fails
- **WHEN** the managed runtime exists but OpenAPI or coverage inspection returns an error or invalid payload
- **THEN** Studio shows an inspection-failed state with the service/runtime context
- **AND** the user can open Advanced diagnostics or retry inspection
- **AND** any previously cached inventory is clearly marked stale if it is shown

### Requirement: Advanced capability preservation

Studio MUST keep the existing service, runtime, credentials, extension, API/OpenAPI, configuration, and log controls reachable from Advanced. Moving these capabilities out of the primary navigation MUST NOT remove their ability to start, stop, repair, inspect, configure, or diagnose the underlying OpenBB environment.

#### Scenario: User needs low-level repair
- **WHEN** a normal-mode action cannot resolve a service, runtime, credential, or extension issue
- **THEN** the user can navigate from the affected action to the corresponding Advanced section
- **AND** the original entity and failure context remain available when returning to the normal flow
