"""Read-only dataset query engine with a strict PIT contract."""

from __future__ import annotations

import re
from collections.abc import Mapping
from pathlib import Path
from typing import Any, Protocol

from openalice_data.catalog import Catalog
from openalice_data.models import (
    AccessMode,
    DatasetDefinition,
    DatasetQuery,
    QueryMetadata,
    QueryPage,
)


class PITContractError(ValueError):
    """Raised when a PIT query could leak future information."""


class DatasetSource(Protocol):
    """Minimal source contract consumed by the query service."""

    def schema_names(self, version: str) -> set[str]:
        """Return physical column names for a fixed version."""
        ...

    def read_page(
        self,
        *,
        version: str,
        filters: Mapping[str, Any],
        as_of_field: str | None,
        as_of: Any,
        offset: int,
        limit: int,
    ) -> tuple[list[dict[str, Any]], bool]:
        """Return a bounded row page and whether another page exists."""
        ...


    def artifact_uri(self, dataset_id: str, version: str) -> str:
        """Return a non-file URI callers can use to reference the dataset."""
        ...


class ParquetDatasetSource:
    """Versioned local Parquet source; files are never mutated."""

    def __init__(self, versions: Mapping[str, str | Path]) -> None:
        self._versions = {version: Path(path) for version, path in versions.items()}

    def _path(self, version: str) -> Path:
        try:
            return self._versions[version]
        except KeyError as exc:
            raise KeyError(f"unknown dataset version: {version}") from exc

    def _dataset(self, version: str):
        import pyarrow.dataset as ds

        return ds.dataset(self._path(version), format="parquet")

    def schema_names(self, version: str) -> set[str]:
        """Return Parquet schema names."""
        return set(self._dataset(version).schema.names)

    def read_page(
        self,
        *,
        version: str,
        filters: Mapping[str, Any],
        as_of_field: str | None,
        as_of: Any,
        offset: int,
        limit: int,
    ) -> tuple[list[dict[str, Any]], bool]:
        """Read one filtered page without mutating the Parquet asset."""
        import pyarrow.dataset as ds

        expression = None
        for field, value in filters.items():
            predicate = (
                ds.field(field).isin(value)
                if isinstance(value, (list, tuple, set))
                else ds.field(field) == value
            )
            expression = predicate if expression is None else expression & predicate
        if as_of_field is not None:
            pit_predicate = ds.field(as_of_field) <= as_of
            expression = (
                pit_predicate if expression is None else expression & pit_predicate
            )

        table = self._dataset(version).head(
            offset + limit + 1,
            filter=expression,
        )
        rows = table.to_pylist()
        page_rows = rows[offset : offset + limit]
        return page_rows, len(rows) > offset + limit

    def artifact_uri(self, dataset_id: str, version: str) -> str:
        """Return a stable logical Parquet reference."""
        return f"dataset://{dataset_id}?version={version}&format=parquet"


_IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _quote_relation(value: str) -> str:
    parts = value.split(".")
    if not parts or any(not _IDENTIFIER.fullmatch(part) for part in parts):
        raise ValueError(f"invalid DuckDB relation: {value}")
    return ".".join(f'"{part}"' for part in parts)


class DuckDBDatasetSource:
    """Versioned DuckDB relation opened in read-only mode."""

    def __init__(
        self,
        versions: Mapping[str, tuple[str | Path, str]],
    ) -> None:
        self._versions = {
            version: (Path(path), _quote_relation(relation))
            for version, (path, relation) in versions.items()
        }

    def _target(self, version: str) -> tuple[Path, str]:
        try:
            return self._versions[version]
        except KeyError as exc:
            raise KeyError(f"unknown dataset version: {version}") from exc

    def schema_names(self, version: str) -> set[str]:
        """Return DuckDB relation column names."""
        import duckdb

        path, relation = self._target(version)
        with duckdb.connect(str(path), read_only=True) as connection:
            rows = connection.execute(f"DESCRIBE SELECT * FROM {relation}").fetchall()
        return {row[0] for row in rows}

    def read_page(
        self,
        *,
        version: str,
        filters: Mapping[str, Any],
        as_of_field: str | None,
        as_of: Any,
        offset: int,
        limit: int,
    ) -> tuple[list[dict[str, Any]], bool]:
        """Read one parameterized page through a read-only DuckDB connection."""
        import duckdb

        path, relation = self._target(version)
        schema = self.schema_names(version)
        clauses: list[str] = []
        parameters: list[Any] = []
        for field, value in filters.items():
            if field not in schema:
                raise ValueError(f"unknown filter field: {field}")
            quoted = f'"{field}"'
            if isinstance(value, (list, tuple, set)):
                values = list(value)
                if not values:
                    return [], False
                clauses.append(f"{quoted} IN ({', '.join('?' for _ in values)})")
                parameters.extend(values)
            else:
                clauses.append(f"{quoted} = ?")
                parameters.append(value)
        if as_of_field is not None:
            clauses.append(f'"{as_of_field}" <= ?')
            parameters.append(as_of)
        where = f" WHERE {' AND '.join(clauses)}" if clauses else ""
        statement = f"SELECT * FROM {relation}{where} LIMIT ? OFFSET ?"
        parameters.extend([limit + 1, offset])

        with duckdb.connect(str(path), read_only=True) as connection:
            cursor = connection.execute(statement, parameters)
            columns = [item[0] for item in cursor.description]
            raw_rows = cursor.fetchall()
        has_more = len(raw_rows) > limit
        rows = [dict(zip(columns, row)) for row in raw_rows[:limit]]
        return rows, has_more

    def artifact_uri(self, dataset_id: str, version: str) -> str:
        """Return a stable logical DuckDB reference."""
        return f"dataset://{dataset_id}?version={version}&format=duckdb"


class QueryService:
    """Execute bounded dataset queries against registered read-only sources."""

    def __init__(
        self,
        catalog: Catalog,
        sources: Mapping[str, DatasetSource],
    ) -> None:
        self._catalog = catalog
        self._sources = dict(sources)

    @property
    def registered_ids(self) -> set[str]:
        """Dataset IDs with a queryable runtime source."""
        return set(self._sources)

    def query(self, request: DatasetQuery) -> QueryPage:
        """Validate and execute one dataset query."""
        definition = self._catalog.describe(request.dataset_id)
        if definition.access_mode is not AccessMode.DATASET_QUERY:
            raise ValueError(
                f"{request.dataset_id} is {definition.access_mode.value}; "
                "use its source request entry"
            )
        try:
            source = self._sources[request.dataset_id]
        except KeyError as exc:
            raise KeyError(f"no source registered for {request.dataset_id}") from exc

        version = self._resolve_version(definition, request)
        as_of_field = self._validate_pit(definition, source, version, request)
        unknown_filters = set(request.filters) - source.schema_names(version)
        if unknown_filters:
            raise ValueError(f"unknown filter fields: {sorted(unknown_filters)}")

        offset = (request.page - 1) * request.page_size
        rows, has_more = source.read_page(
            version=version,
            filters=request.filters,
            as_of_field=as_of_field,
            as_of=request.as_of,
            offset=offset,
            limit=request.page_size,
        )
        return QueryPage(
            dataset_id=request.dataset_id,
            rows=rows,
            page=request.page,
            page_size=request.page_size,
            next_page=request.page + 1 if has_more else None,
            artifact_uri=source.artifact_uri(request.dataset_id, version),
            metadata=QueryMetadata(
                source=definition.provider,
                freshness=definition.freshness,
                coverage_ratio=1.0,
                complete=True,
                quality_status=definition.quality_status,
                pit=definition.pit,
                pit_version=version if definition.pit else None,
                as_of=request.as_of if definition.pit else None,
                lineage=definition.lineage,
            ),
        )

    @staticmethod
    def _resolve_version(
        definition: DatasetDefinition, request: DatasetQuery
    ) -> str:
        if definition.pit and not request.version:
            raise PITContractError("version is required for PIT datasets")
        version = request.version or (definition.versions[-1] if definition.versions else "default")
        if definition.versions and version not in definition.versions:
            raise KeyError(f"unknown dataset version: {version}")
        return version

    @staticmethod
    def _validate_pit(
        definition: DatasetDefinition,
        source: DatasetSource,
        version: str,
        request: DatasetQuery,
    ) -> str | None:
        if not definition.pit:
            return None
        if request.as_of is None:
            raise PITContractError("as_of is required for PIT datasets")

        required = {
            "event_time": definition.event_time_field,
            "available_at": definition.available_at_field,
            "source_updated_at": definition.source_updated_at_field,
        }
        unspecified = [name for name, field in required.items() if not field]
        if unspecified:
            raise PITContractError(
                f"PIT catalog definition is missing fields: {', '.join(unspecified)}"
            )
        schema = source.schema_names(version)
        missing = [field for field in required.values() if field not in schema]
        if missing:
            raise PITContractError(
                "PIT source is missing required columns: " + ", ".join(missing)
            )
        return definition.available_at_field
