---
schema: design-pipeline.motion-foundation.v0.1
name: OpenBB Studio functional motion language
posture: static
primitiveRegistry: design-pipeline.motion-primitives.v1
---

# OpenBB Studio Functional Motion Foundation

## Motion Thesis

Motion is not a product feature in this phase. The interface communicates state through stable layout, text, progress, and explicit actions. Do not use animation to hide loading, create urgency, or add decoration to an operational data tool.

## Motion Principles

- Prefer immediate state changes and stable geometry.
- Long-running Add Data Source and OpenBB service jobs expose named stages and a determinate status when available; they do not rely on a spinner alone.
- Never move or hide the primary action while the user is deciding.
- Preserve focus and scroll position when a status updates.
- A state transition must remain understandable with animation disabled.

## Motion Vocabulary

- No moving primitives are selected for the static posture.
- Permitted behavior is semantic state replacement, disclosure expansion, and focus movement owned by the browser and accessible controls.

## Procedural Motion

No procedural motion, random motion, parallax, looping ornament, or motion-driven data visualization is permitted in this phase.

## Runtime Policy

Use existing React/Tauri rendering and browser-native state updates. Do not add an animation runtime. Any future non-trivial transition must be specified in a change-level motion artifact, preserve interruption and cleanup, and provide an equivalent reduced-motion path.

## Reduced Motion

The baseline is already motion-safe. Substitute/fallback: render every progress stage, mapping result, comparison mismatch, query diagnostic, and service recovery state as immediate text, stable status, and actionable controls with no animated transition. A future animated implementation must retain the same immediate semantic state and disable non-essential movement under `prefers-reduced-motion: reduce`.

## Source Decisions

- Authored from the requirements-driven UX change `design/changes/studio-ux-architecture/`.
- Adopted a static posture because the current scope is task comprehension, field mapping, compatibility validation, and failure recovery rather than visual polish.
- Rejected decorative motion and animation-library dependencies.
