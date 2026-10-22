# OpenSpec Compatibility

The repository-level OpenSpec root is `../openspec/` relative to `desktop/`. The active existing change `../openspec/changes/openbb-studio-p0/` is the product contract for the already implemented Studio/runtime connection layer.

This design change is deliberately kept at `desktop/design/changes/openalice-desktop-brand-refresh/` because its id and scope are a follow-up whole-desktop visual/brand change, not a rewrite of `openbb-studio-p0`. It links rather than duplicates the OpenSpec acceptance criteria:

- Existing proposal: `../../../openspec/changes/openbb-studio-p0/proposal.md`
- Existing architecture/design: `../../../openspec/changes/openbb-studio-p0/design.md`
- Existing tasks: `../../../openspec/changes/openbb-studio-p0/tasks.md`
- Existing spec deltas: `../../../openspec/changes/openbb-studio-p0/specs/`

Compatibility rules:

- OpenSpec remains authoritative for runtime inspection, real ProviderInterface discovery, credentials and query execution.
- This change owns brand hierarchy, Chinese-first information architecture, screen-space UI, motion, accessibility and visual QA.
- No requirement in this change may hide, simulate or delete an OpenSpec-defined real connection path.
- Before implementation, either create the matching repository OpenSpec follow-up `openalice-desktop-brand-refresh`, or link this artifact folder from an approved successor change. Do not add branding tasks to the completed P0 scope without an explicit proposal update.
