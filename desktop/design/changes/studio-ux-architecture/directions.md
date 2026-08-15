# Studio UX directions

## Direction A — Workspace-first composition (selected)

The user creates and names the workspace. Native Provider datasets remain separate until the user adds them and confirms an explicit mapping. The workspace owns canonical fields, compatibility evidence, and unified queries.

- Fit: directly matches the user's requirement that the system must not pre-classify or silently combine datasets.
- Strength: makes user intent explicit and provides a natural place for comparison, mapping, and validation.
- Risk: an empty workspace needs a strong first-run path and useful source/dataset discovery.
- Adopted evidence: user-confirmed workspace boundary; OpenBB's explicit Provider transformation/model contracts.
- Rejected assumption: global static taxonomy such as assuming all A-share K-lines are one dataset.

## Direction B — Source-first inventory

The user starts from installed/discovered Providers, inspects their native datasets, and then optionally composes workspaces.

- Fit: faithful to OpenBB's existing runtime and Provider inventory.
- Strength: installation and discovery are easy to explain.
- Risk: users still have to invent the semantic grouping later; the product can regress into a Provider management console.
- Use: retain as the Data Sources view, not the product's primary semantic model.

## Direction C — Task-inbox orchestration

The product starts from unresolved actions and routes the user through add, map, test, and repair tasks.

- Fit: good for ADHD-friendly recovery and first-run guidance.
- Strength: every state can expose a next action.
- Risk: without a durable workspace model, the inbox becomes a temporary checklist and cannot explain data composition.
- Use: retain as Home behavior, not the data model.

## Selected direction

Select Direction A as the product data model. Combine Direction B as the native inventory view and Direction C as the Home/action behavior. This is a composition, not an averaged visual style: Workspaces own user intent, Data Sources owns OpenBB-native facts, and Home routes unresolved work.
