## Purpose

Defines a single secret-free inspection boundary that converts OpenBB-owned runtime metadata into user-facing Studio state without a parallel provider catalogue.

## ADDED Requirements

### Requirement: OpenBB remains the metadata source of truth
The Inspector SHALL derive providers, required credentials, Standard Models, provider fields, query fields, routes, and provider coverage from the selected runtime's OpenBB registries and command map. The renderer MUST NOT maintain a complete handwritten provider or dataset catalogue.

#### Scenario: Provider extension is added
- **WHEN** a provider is installed and discovered by OpenBB
- **THEN** the next inspection includes it without a renderer code change

#### Scenario: Provider adds a source-specific field
- **WHEN** OpenBB's registry reports an additional Provider Data field
- **THEN** inspection associates that field with the provider and Standard Model

### Requirement: Runtime execution is controlled
The Desktop SHALL execute a fixed bundled Inspector through a validated ODP-managed Python environment and MUST reject path traversal, shell fragments, and arbitrary script input.

#### Scenario: Valid managed runtime is selected
- **WHEN** the environment name contains only permitted identifier characters and its Python executable exists under the ODP installation
- **THEN** Desktop runs the fixed Inspector and parses its JSON result

#### Scenario: Malicious environment name is submitted
- **WHEN** an environment name contains path traversal or shell control characters
- **THEN** Desktop rejects it without starting a process

### Requirement: Inspection never crosses secret values into the renderer
The Inspector SHALL expose credential field names, required flags, secret flags, and configured booleans only. It MUST NOT serialize credential values into snapshots, errors, ordinary logs, or query history.

#### Scenario: Credential exists
- **WHEN** OpenBB user settings contain a credential value
- **THEN** the snapshot reports configured true and contains none of the value

### Requirement: Studio state aggregates existing Desktop lifecycle sources
Studio SHALL combine inspected OpenBB metadata with existing managed service, runtime, extension, and credential commands through a validated renderer contract and cached refresh lifecycle.

#### Scenario: Running OpenBB API selects a runtime
- **WHEN** a running managed OpenBB API service identifies its environment
- **THEN** Studio inspects that environment and uses its service URL for queries

#### Scenario: No suitable runtime exists
- **WHEN** neither a running OpenBB API runtime nor the managed openbb runtime exists
- **THEN** Studio shows an actionable error linked to Advanced Runtimes

