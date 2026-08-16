## Purpose

Define the active normal-mode shell for OpenAlice Data: a launcher-oriented Home, unified Data Sources, evidence-oriented Query, and context-preserving Advanced repair boundary. This specification supersedes the historical Action Center shell under `openbb-studio-p0`.

## ADDED Requirements

### Requirement: Four intent-level normal surfaces

The Desktop MUST expose exactly four normal-mode intents: Home, Data Sources, Query, and Advanced. Native datasets and composition sources MUST be handled inside Data Sources; Workspace MUST NOT become a competing top-level normal-mode destination. Data Catalog, Extensions, diagnostics, and legacy ODP screens remain support surfaces.

#### Scenario: Installed Desktop starts
- **WHEN** the installed Desktop enters normal mode
- **THEN** it opens Home
- **AND** the primary navigation exposes Home, Data Sources, Query, and Advanced
- **AND** it does not expose Backends, Environments, API Keys, or Workspaces as peer normal intents

#### Scenario: Support surface is opened
- **WHEN** the user opens Data Catalog, Extensions, diagnostics, or a legacy ODP route
- **THEN** the selected normal intent remains the owning surface
- **AND** returning to normal mode preserves the relevant source/query/repair context

### Requirement: Home is a target launcher

Home MUST let the user select one native source or one composition source, select an available frontend surface, and start the selected target. Home MUST NOT classify service, runtime, credential, mapping, or compatibility blockers as the user's global next task.

#### Scenario: Target is ready
- **WHEN** the user selects one native or composition target and one supported frontend
- **THEN** Home exposes one explicit Start action
- **AND** the target identity remains attached to the next Query/frontend surface

#### Scenario: No target exists
- **WHEN** no native or composition target is available
- **THEN** Home exposes one Choose Data action to unified Data Sources
- **AND** it does not replace the empty state with a service-maintenance task

#### Scenario: Selected target cannot start
- **WHEN** service, credential, source, mapping, or compatibility evidence blocks the selected target
- **THEN** Home preserves the target and selection
- **AND** shows the concrete consequence and one contextual recovery action
- **AND** the user can return to the same target after repair

### Requirement: Advanced is a repair and inspection boundary

Advanced MUST group Services, Runtimes, Credentials, Extensions, API/OpenAPI, Configuration, and Logs into section-specific repair/inspection tasks while reusing existing Tauri/OpenBB operations. Advanced MUST NOT be required for ordinary source selection or native query execution.

#### Scenario: User enters Advanced from a failed task
- **WHEN** a normal surface routes a failure to Advanced
- **THEN** Advanced opens the named responsible section
- **AND** shows the affected target, consequence, current evidence, and section-specific operation
- **AND** preserves a return handoff to the originating Home, Data Sources, composition, or Query context

#### Scenario: Repair succeeds
- **WHEN** the underlying Tauri/OpenBB operation succeeds
- **THEN** Advanced refreshes the live Studio inspection state
- **AND** returns to the originating task with refreshed evidence
- **AND** does not claim a stronger source/query state from the button click alone

#### Scenario: Repair fails
- **WHEN** the underlying operation fails
- **THEN** Advanced shows the failure category and redacted evidence
- **AND** provides retry/logs/next repair options appropriate to that section
- **AND** preserves the original target and context for a later retry
