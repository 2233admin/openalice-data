## Purpose

Lets users discover OpenBB datasets by financial meaning and run real provider queries through generated forms with inspectable results and diagnostics.

## ADDED Requirements

### Requirement: Catalog represents OpenBB dataset semantics and coverage
Data Catalog SHALL group datasets by business category and show description, Python path, REST path, Standard Model, available providers, common query/data fields, provider-specific fields, and last successful query when known.

#### Scenario: Dataset has multiple providers
- **WHEN** the command map reports several providers for one Standard Model route
- **THEN** the dataset exposes each source and its provider-specific fields without treating those fields as a new dataset

### Requirement: Playground form is schema driven
Playground SHALL allow dataset and provider selection and SHALL generate common and provider-specific query controls from inspected QueryParams metadata, including required state, descriptions, types, and supported choices.

#### Scenario: Provider has extra query fields
- **WHEN** the selected provider reports QueryParams beyond common fields
- **THEN** those fields appear only for that provider and are sent using their OpenBB names

#### Scenario: Deep-linked query opens
- **WHEN** Playground receives dataset and provider query parameters
- **THEN** both selections are applied if that coverage exists

### Requirement: Playground runs the real managed OpenBB API route
Playground SHALL use the running managed OpenBB API URL and inspected API path, and SHALL never invent a fallback provider when runtime metadata is unavailable.

#### Scenario: Service is running
- **WHEN** the user submits valid generated parameters
- **THEN** Playground sends the real request and reports duration, endpoint, provider, row count, warnings, and validation errors

#### Scenario: Service is stopped
- **WHEN** the user attempts a query without a running managed API service
- **THEN** Playground blocks the request and provides an actionable Services link

### Requirement: Results support data, chart, raw, usage, and diagnostics views
Playground SHALL present sortable/filterable/virtualized tabular results, a suitable chart for supported time series, raw OpenBB output, accurate Python/REST usage, and diagnostics.

#### Scenario: Large tabular response returns
- **WHEN** a query returns more rows than fit in the viewport
- **THEN** the result remains usable through virtualization, sorting, and filtering

#### Scenario: Usage view opens
- **WHEN** the user opens Usage after a successful query
- **THEN** Python and REST examples include the selected provider and submitted parameters

### Requirement: Query errors are actionable and redacted
Errors SHALL translate source and validation failures into user-facing explanations and MUST redact Authorization, Cookie, API key, token, secret, and password values from visible diagnostics and history.

#### Scenario: Provider error contains a token
- **WHEN** an error response includes an authorization or token value
- **THEN** the visible message replaces the value with a redaction marker and offers logs or corrective action

### Requirement: A real-provider core flow is automatically verified
The test suite SHALL cover at least one installed Provider through discovery, optional credential handling, dataset selection, real query execution, result display, and usage generation in an integration or desktop E2E environment.

#### Scenario: P0 core flow runs in verification environment
- **WHEN** the configured provider and managed API service are available
- **THEN** the automated flow completes without terminal interaction and verifies real returned rows
