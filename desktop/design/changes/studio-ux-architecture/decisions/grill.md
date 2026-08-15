# UX design grill decisions

Status: user-confirmed for the current information-architecture round.

## Accepted product decisions

1. Keep five top-level entries: Home, Workspaces, Data Sources, Query, Advanced.
2. Workspaces are user-created and user-named. The system must not assume that two Provider datasets are the same because of a market label, Provider name, or superficial field similarity.
3. A Provider-native dataset joins a workspace only after an explicit user composition decision followed by mapping and compatibility validation.
4. Keep three field scopes distinct: Provider-native fields, OpenBB standard fields, and workspace canonical fields.
5. A field appearing in two Providers is evidence for review, not sufficient proof for promotion to a public/workspace canonical field.
6. Material sample/semantic incompatibility blocks unified workspace attachment by default and explains the likely cause. The user can revise the mapping or keep datasets separate.
7. OpenBB service/runtime/API/process details remain available in Advanced. Normal mode offers a unified OpenBB service with one-click Start/Restart/Repair.
8. Builder scope is layered: existing Provider onboarding and explicit field alignment first; genuinely new business datasets, Standard Models, Routers, and generated Provider code remain later-stage capabilities.
## Existing Fork boundary

The repository is a complete OpenBB Fork. OpenBB Provider, standard-model, OBBject, REST, MCP, runtime, extension, build, and service capabilities already exist and remain the implementation authority. Studio must orchestrate, expose, and add metadata/workspace contracts around those capabilities; it must not rebuild a parallel Provider framework, query API, runtime manager, or financial data model.

“Reference OpenBB mapping” therefore means reusing the existing Provider inheritance, explicit `transform_data`, declared model, registry coverage, build, and test contracts. Any Studio mapping artifact must eventually be applied through those existing contracts or a thin adapter that preserves them.

## Mapping decision

The mapping workflow must follow OpenBB's own implementation model rather than inventing a separate semantic runtime. OpenBB Provider implementations explicitly transform Provider-native responses into declared standard models; `RegistryMap` classifies fields declared by the standard model versus Provider extra fields, but does not infer semantic equivalence between differently named fields.

Therefore Studio should create a guided mapping artifact that is consumed by the existing OpenBB Provider/model/build path. It may propose candidates from schema and samples, but the persisted mapping must be explicit, reviewable, versioned, and testable. A confirmed mapping should ultimately produce or update the same kind of Provider transformation and declared model contract that OpenBB uses today. Studio must not silently merge two datasets in the UI while the underlying OpenBB model/transform remains inconsistent.

## User behavior invariant

The user should be able to move from a discovered native dataset to a named workspace, see why a candidate mapping is suggested, accept/edit/reject it, run the same sample query across members, and understand whether the members are safely usable as one workspace dataset. Every failure returns to a concrete mapping, source, query, or service action.
