"""In-memory catalog shared by Python, REST, and MCP surfaces."""

from __future__ import annotations

import re
from collections.abc import Iterable

from openalice_data.models import DatasetDefinition


def _search_text(dataset: DatasetDefinition) -> str:
    field_text = " ".join(
        f"{field.name} {field.description} {field.description_zh}"
        for field in [*dataset.parameters, *dataset.fields]
    )
    return " ".join(
        (
            dataset.dataset_id,
            dataset.name,
            dataset.name_zh,
            dataset.market,
            dataset.asset_type,
            dataset.provider,
            dataset.description,
            dataset.description_zh,
            field_text,
        )
    ).lower()


def _normalize(value: str) -> str:
    return re.sub(r"\s+", "", value).lower()


class Catalog:
    """Read-only dataset discovery service."""

    def __init__(self, datasets: Iterable[DatasetDefinition]) -> None:
        definitions = list(datasets)
        self._datasets = {item.dataset_id: item for item in definitions}
        if len(self._datasets) != len(definitions):
            raise ValueError("dataset_id values must be unique")

    def search(self, query: str, *, limit: int = 20) -> list[DatasetDefinition]:
        """Search bilingual names, fields, markets, assets, and providers."""
        if limit < 1:
            raise ValueError("limit must be positive")
        tokens = [_normalize(token) for token in query.split() if token.strip()]
        if not tokens:
            return list(self._datasets.values())[:limit]
        return [
            dataset
            for dataset in self._datasets.values()
            if all(token in _normalize(_search_text(dataset)) for token in tokens)
        ][:limit]

    def describe(self, dataset_id: str) -> DatasetDefinition:
        """Return one complete catalog definition."""
        try:
            return self._datasets[dataset_id]
        except KeyError as exc:
            raise KeyError(f"unknown dataset_id: {dataset_id}") from exc

    def all(self) -> list[DatasetDefinition]:
        """Return catalog definitions in registration order."""
        return list(self._datasets.values())
