## Purpose
Status: SUPERSEDED. Historical shell acceptance only; active Home/Query/Advanced requirements are in `desktop/design/changes/studio-ux-architecture/requirements.md`.


Provides a user-facing Desktop shell that leads with data-source actions while preserving all original ODP operational controls for advanced use.

## ADDED Requirements

### Requirement: Studio is the normal installed-user entry point
The Desktop SHALL route an installed user to Home and SHALL expose Home, Data Sources, Data Catalog, Playground, Extensions, and Advanced as the primary navigation.

#### Scenario: Installed Desktop starts
- **WHEN** Desktop confirms that ODP installation is complete
- **THEN** the user is taken to Home rather than Runtimes, Backends, or Credentials

#### Scenario: Setup and log utility windows open
- **WHEN** the user is in setup, installation progress, uninstall, or a dedicated log window
- **THEN** Studio primary navigation is hidden and the original utility workflow remains usable

### Requirement: Home presents actionable live state
Home SHALL show one primary Add Data Source action, actionable issues, connected sources, recent successful queries, and understandable service/source/dataset/issue status derived from live Desktop state.

#### Scenario: A required credential is missing
- **WHEN** runtime inspection reports an unconfigured required provider credential
- **THEN** Home shows an Add credential action linked to that provider

#### Scenario: OpenBB API is stopped
- **WHEN** no managed OpenBB API service is running
- **THEN** Home shows the service as stopped and provides a Start service or Open services action

### Requirement: Existing ODP controls remain available under Advanced
Advanced SHALL provide access to Services, Runtimes, Credentials, Configuration, Extensions Internals, and Logs without replacing their existing Tauri behavior.

#### Scenario: User opens an advanced section
- **WHEN** the user selects an Advanced operational section
- **THEN** Desktop opens the preserved corresponding ODP control

### Requirement: Extensions inventory uses the selected runtime
Extensions SHALL show installed package name, type, version, status, capabilities, compatibility, and update availability where reported, and SHALL reuse the existing controlled installation workflow.

#### Scenario: Runtime contains provider packages
- **WHEN** the active runtime reports installed OpenBB provider packages
- **THEN** Extensions shows them and links management actions to the existing runtime installer
