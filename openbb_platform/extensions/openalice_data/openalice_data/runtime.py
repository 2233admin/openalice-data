"""Construct the default Hub without loading credentials or writing data."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from openalice_data.catalog import Catalog
from openalice_data.hub import DataHub
from openalice_data.manifest import load_builtin_catalog
from openalice_data.models import AccessMode, DatasetDefinition
from openalice_data.query import (
    DatasetSource,
    DuckDBDatasetSource,
    ParquetDatasetSource,
    QueryService,
)


def _resolve_path(base: Path, value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else (base / path).resolve()


def _runtime_sources(
    definitions: list[DatasetDefinition], config_path: Path
) -> tuple[list[DatasetDefinition], dict[str, DatasetSource]]:
    payload: dict[str, Any] = json.loads(config_path.read_text(encoding="utf-8"))
    specs = payload.get("datasets", {})
    by_id = {definition.dataset_id: definition for definition in definitions}
    sources: dict[str, DatasetSource] = {}
    base = config_path.parent

    for dataset_id, spec in specs.items():
        if dataset_id not in by_id:
            raise KeyError(f"runtime source has unknown dataset_id: {dataset_id}")
        definition = by_id[dataset_id]
        if definition.access_mode is not AccessMode.DATASET_QUERY:
            raise ValueError(f"runtime source is not allowed for {dataset_id}")
        kind = spec.get("type")
        versions = spec.get("versions", {})
        if not versions:
            raise ValueError(f"runtime source has no versions: {dataset_id}")
        if kind == "parquet":
            source: DatasetSource = ParquetDatasetSource(
                {
                    version: _resolve_path(base, value)
                    for version, value in versions.items()
                }
            )
        elif kind == "duckdb":
            source = DuckDBDatasetSource(
                {
                    version: (
                        _resolve_path(base, value["database"]),
                        value["relation"],
                    )
                    for version, value in versions.items()
                }
            )
        else:
            raise ValueError(f"unsupported runtime source type: {kind}")
        sources[dataset_id] = source
        by_id[dataset_id] = definition.model_copy(
            update={"versions": list(versions)}
        )

    updated = [by_id[definition.dataset_id] for definition in definitions]
    return updated, sources


def build_default_hub(config_path: str | Path | None = None) -> DataHub:
    """Build the packaged catalog plus optional read-only runtime sources.

    The environment variable contains only a path to a local JSON file. Provider
    secrets remain in their normal OpenBB/local settings and are never parsed here.
    """
    catalog = load_builtin_catalog()
    path_value = config_path or os.getenv("OPENALICE_DATA_SOURCES")
    if path_value:
        definitions, sources = _runtime_sources(
            catalog.all(), Path(path_value).expanduser().resolve()
        )
        catalog = Catalog(definitions)
    else:
        sources = {}
    return DataHub(catalog, QueryService(catalog, sources))
