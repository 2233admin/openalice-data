# OpenBB field mapping evidence

## Repository facts

- `openbb_platform/core/openbb_core/provider/standard_models/equity_historical.py` defines the canonical `EquityHistoricalData` fields (`date`, `open`, `high`, `low`, `close`, `volume`, `vwap`).
- Provider implementations inherit the standard query/data models and implement explicit `transform_data` logic. For example, `openbb_platform/providers/alpha_vantage/openbb_alpha_vantage/models/equity_historical.py` renames upstream fields such as `timestamp` to `date` and `adjusted close` to `adj_close` before validating the standard model.
- `openbb_platform/core/openbb_core/provider/registry_map.py` extracts fields declared by the OpenBB standard model as standard fields and fields declared outside that model as provider-specific extra fields. It does not prove semantic equivalence between two different provider-native field names.
- `openbb_platform/core/openbb_core/app/provider_interface.py` merges provider fields by field name. A provider field with a name absent from the OpenBB standard data model becomes an optional extra field; a differently named raw field is not automatically mapped to an existing canonical field.
- `openbb_platform/core/openbb_core/provider/abstract/fetcher.py` validates that the transformed result satisfies the provider's declared data model. Mapping therefore occurs in provider transformation code or an equivalent explicit mapping layer, not by the UI merely observing two similar columns.

## Product consequence

OpenBB Studio must not infer that two providers expose the same dataset merely because they are both labelled A-share, both expose a K-line-looking response, or happen to share field names. A workspace must be user-owned and explicit. A provider dataset can join a workspace only after an explicit mapping contract and a comparison/validation run establish compatible semantics.

The Studio mapping flow should:

1. sample the provider-native response;
2. capture field names, types, units, time granularity, adjustment semantics, entity/symbol meaning, and source documentation when available;
3. propose candidate mappings without claiming equivalence;
4. let the user accept, edit, or reject each mapping;
5. persist a versioned provider-dataset-to-workspace mapping;
6. run the same sample query across attached sources and compare canonical outputs with declared tolerances;
7. warn or block workspace attachment when semantics or values are materially incompatible.

A field shared by two providers is evidence for review, not sufficient proof for promotion to a workspace canonical field. Provider-specific fields remain available without changing the canonical contract.
