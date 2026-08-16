# Proposal: OpenAlice Data shell and ODP boundary

## Why

The fork currently exposes ODP control-plane routes without a clear human-facing boundary between OpenAlice tasks and original ODP functions.

## Problem

Users need a simple way to find and choose data sources, explicitly compose similar sources, and install missing Providers. The current design over-expanded the solution into Query, Advanced, Workspace, mapping, and compatibility concepts that are not required by the ODP baseline or the confirmed product direction.

## Proposed boundary

- OpenAlice surfaces: Home, Data Sources, Extensions.
- ODP surface: original Backends, Environments, API Keys, Jupyter, and Logs grouped under `ODP`.
- Native data sources remain directly usable.
- Composed data sources are optional persisted collections with explicit members and existing routing behavior.
- Query is an action delegated to existing ODP/OpenBB capabilities, not a new page or engine.

## Safety

OpenBB/ODP capabilities remain authoritative. This design does not create a second Provider registry, query engine, runtime manager, package manager, semantic mapping system, or Workspace product.
