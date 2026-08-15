## Purpose

Lets users understand, configure, test, and diagnose each OpenBB provider as a data source without needing Provider, Fetcher, or build-system knowledge.

## ADDED Requirements

### Requirement: Data Sources shows normalized provider state
The Data Sources inventory SHALL show provider identity, version, normalized status, capability count, credential status, last test time, and Open/Test actions using inspected runtime state.

#### Scenario: Provider requires a missing credential
- **WHEN** inspection reports one or more missing required credential fields
- **THEN** the provider status is Credential Required and its primary next action is Add credential

#### Scenario: Provider passed only some checks
- **WHEN** package/discovery succeeds but credential, endpoint, or sample-query checks do not all pass
- **THEN** the provider is not reported as fully Available

### Requirement: Provider detail exposes five user-facing sections
Provider detail SHALL provide Overview, Capabilities, Credentials, Health, and Advanced sections with inspected metadata and actions.

#### Scenario: User opens a capability
- **WHEN** a provider capability is listed
- **THEN** the user can test it or open it in Playground with provider and dataset preselected

### Requirement: Credential save preserves OpenBB settings semantics
Credential forms SHALL be generated from inspected credential metadata, SHALL mask sensitive values, SHALL preserve unrelated flat OpenBB credentials, and SHALL never display saved values.

#### Scenario: User replaces one provider credential
- **WHEN** the user saves a new value for one inspected credential field
- **THEN** the existing credential bridge updates that flat key while preserving all other keys

### Requirement: Save and test performs a real verification
After saving credentials, Studio SHALL run a representative provider capability or explicitly present a separate Run test query action. It MUST NOT claim a successful test based only on saving or discovery.

#### Scenario: Saved credential passes sample query
- **WHEN** credential save succeeds and the representative query succeeds
- **THEN** Studio records the successful check and offers the next usage action

#### Scenario: Saved credential fails sample query
- **WHEN** credential save succeeds but the representative query fails
- **THEN** Studio reports the actionable provider error without exposing secrets

### Requirement: Health reports independently observed checks
Health SHALL report Package installed, Provider discovered, Credentials valid, OpenBB build current, API endpoint available, and Sample query passed from independent observed evidence, with a next action for every failure.

#### Scenario: Only discovery is confirmed
- **WHEN** package and provider discovery are confirmed but no credential or query verification has run
- **THEN** only confirmed checks pass and all remaining checks stay pending or failed
