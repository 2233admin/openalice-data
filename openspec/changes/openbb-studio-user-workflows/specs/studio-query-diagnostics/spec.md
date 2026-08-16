## Purpose

Let users run reproducible queries against either an OpenBB-native dataset or a compatibility-verified workspace, then understand results and failures without losing the source, mapping, or service context that explains them.

## ADDED Requirements

### Requirement: Native and composition query targets

Query MUST accept either an explicit Provider-native dataset or an explicit composition source. The selected target kind, identity, Provider/member provenance, query parameters, and gate state MUST remain visible while the query is edited and executed.

#### Scenario: Run a native dataset query
- **WHEN** the user selects a discovered native dataset, Provider, and valid parameters
- **THEN** Studio calls the existing OpenBB query API for that exact Provider/dataset
- **AND** shows returned rows, submitted inputs, duration, warnings, and the raw response view
- **AND** the native query does not require a composition

#### Scenario: Run a source-backed composition query
- **WHEN** the user selects a composition with at least one usable member and chooses that member or a configured fallback
- **THEN** Studio runs the existing query API through that exact member
- **AND** identifies the actual member/provider in the result and activity evidence
- **AND** does not claim that the member set has shared canonical semantics

#### Scenario: Run a shared-canonical composition query
- **WHEN** the user selects a composition whose required mappings are applied, compatibility status is verified, evidence is fresh, and the applied version matches the comparison version
- **THEN** Studio runs the shared-canonical query through the existing OpenBB-compatible query path
- **AND** keeps member/source provenance and mapping version visible in the result

#### Scenario: Composition is not queryable in the requested mode
- **WHEN** the selected composition has no usable member, or shared-canonical mapping is unverified, incompatible, blocked, or apply-failed
- **THEN** Studio prevents only the affected execution mode
- **AND** explains the blocking state
- **AND** provides a direct route to mapping, comparison, source, credential, or service repair

### Requirement: Reproducible query evidence

Every completed query MUST retain enough non-secret evidence to reproduce or diagnose it: target kind and identity, Provider when applicable, submitted parameters, request path, completion time, duration, returned row count, warnings, and the raw response or a clearly stated raw-response-unavailable reason. Query evidence MUST identify the OpenBB service/runtime context when available.

#### Scenario: Successful query has evidence
- **WHEN** an OpenBB query returns a successful response
- **THEN** Studio shows the result rows and row count
- **AND** shows the submitted parameters and request path
- **AND** makes raw response, usage inputs, and diagnostics available without exposing credentials

#### Scenario: Response contains warnings
- **WHEN** the OpenBB response includes warnings
- **THEN** Studio shows warnings alongside the result
- **AND** warnings do not get silently discarded from query history or diagnostics

### Requirement: Safe diagnostics and redaction

Query diagnostics MUST classify failures into user-actionable categories when evidence allows: service/runtime, credential, source/provider, request validation, mapping/compatibility, or upstream response. Diagnostic text and stored activity MUST redact authorization headers, cookies, API keys, tokens, secrets, and passwords. Raw response display MUST preserve useful non-secret payloads and identify redacted content when redaction occurred.

#### Scenario: Service is unavailable
- **WHEN** the query cannot connect to the managed OpenBB API
- **THEN** Studio identifies the service/runtime category
- **AND** offers Start, Restart, Repair, or Advanced diagnostics as appropriate
- **AND** preserves the selected target and parameters for retry

#### Scenario: Provider rejects a request
- **WHEN** OpenBB returns a non-success response with a provider or validation detail
- **THEN** Studio shows the status and redacted detail
- **AND** links back to the relevant dataset fields, credentials, or source health action when known
- **AND** does not replace the error with a generic success or empty-result state

#### Scenario: Sensitive value appears in a response or error
- **WHEN** a response, header, or exception contains a recognized credential or secret pattern
- **THEN** Studio redacts the sensitive value in diagnostics, activity, raw display, and copied usage evidence
- **AND** the user can still see the non-secret request/result context

### Requirement: Query history and recovery context

Studio MUST record recent successful and failed query activity with the selected native dataset or workspace identity, Provider/member context, time, duration when known, row count when known, and failure message/category when failed. Selecting a history entry MUST return the user to a query context that can be retried or repaired.

#### Scenario: Failed query is revisited
- **WHEN** the user opens a failed query from Home or Query history
- **THEN** Studio restores the source/workspace and submitted parameters where safe
- **AND** shows the diagnostic and recovery action
- **AND** the user can retry after fixing the responsible condition

#### Scenario: Native and workspace history coexist
- **WHEN** the user has queried both native datasets and workspaces
- **THEN** history distinguishes the two target kinds and preserves source provenance
- **AND** no workspace history is represented as a generic Provider query
