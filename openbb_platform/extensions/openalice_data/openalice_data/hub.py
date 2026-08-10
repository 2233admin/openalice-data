"""Shared application service for Python, REST, and MCP callers."""

from __future__ import annotations

from collections import defaultdict

from openalice_data.catalog import Catalog
from openalice_data.models import (
    AccessMode,
    DatasetDefinition,
    DatasetQuery,
    QueryPage,
    SourceStatus,
)
from openalice_data.query import QueryService


class DataHub:
    """Read-only facade over catalog discovery and dataset querying."""

    def __init__(self, catalog: Catalog, queries: QueryService) -> None:
        self.catalog = catalog
        self.queries = queries

    def search_catalog(
        self, query: str, *, limit: int = 20
    ) -> list[DatasetDefinition]:
        """Search the shared catalog."""
        return self.catalog.search(query, limit=limit)

    def describe_dataset(self, dataset_id: str) -> DatasetDefinition:
        """Describe one dataset."""
        return self.catalog.describe(dataset_id)

    def query_dataset(self, request: DatasetQuery) -> QueryPage:
        """Execute one bounded dataset query."""
        return self.queries.query(request)

    def source_status(self, provider: str | None = None) -> list[SourceStatus]:
        """Report source registration without exposing credentials."""
        grouped: dict[str, list[DatasetDefinition]] = defaultdict(list)
        for dataset in self.catalog.all():
            if provider is None or dataset.provider == provider:
                grouped[dataset.provider].append(dataset)

        results: list[SourceStatus] = []
        registered = self.queries.registered_ids
        for provider_name, datasets in grouped.items():
            dataset_ids = [dataset.dataset_id for dataset in datasets]
            if any(dataset_id in registered for dataset_id in dataset_ids):
                status = "registered"
                message = "A read-only dataset source is registered."
            elif all(
                dataset.access_mode is AccessMode.SOURCE_REQUEST
                for dataset in datasets
            ):
                status = "catalog_only"
                message = "Use the OpenBB source request entry."
            else:
                status = "unavailable"
                message = "Cataloged, but no runtime dataset source is registered."
            results.append(
                SourceStatus(
                    provider=provider_name,
                    status=status,
                    datasets=dataset_ids,
                    message=message,
                )
            )
        return results
