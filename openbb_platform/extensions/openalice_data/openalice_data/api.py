"""FastAPI routes automatically projected into four OpenBB MCP tools."""

from __future__ import annotations

from fastapi import APIRouter

from openalice_data.hub import DataHub
from openalice_data.models import (
    DatasetDefinition,
    DatasetQuery,
    QueryPage,
    SourceStatus,
)

_MCP_TOOL = {"expose": True, "mcp_type": "tool"}


def create_api_router(hub: DataHub) -> APIRouter:
    """Create the REST/MCP projection for one Hub instance."""
    router = APIRouter()

    @router.get(
        "/catalog/search",
        operation_id="search_catalog",
        response_model=list[DatasetDefinition],
        openapi_extra={"mcp_config": _MCP_TOOL},
    )
    def search_catalog(query: str, limit: int = 20) -> list[DatasetDefinition]:
        """Search bilingual dataset metadata and return compact definitions."""
        return hub.search_catalog(query, limit=limit)

    @router.post(
        "/catalog/query",
        operation_id="query_dataset",
        response_model=QueryPage,
        openapi_extra={"mcp_config": _MCP_TOOL},
    )
    def query_dataset(request: DatasetQuery) -> QueryPage:
        """Query one registered read-only dataset with bounded pagination."""
        return hub.query_dataset(request)

    @router.get(
        "/catalog/{dataset_id}",
        operation_id="describe_dataset",
        response_model=DatasetDefinition,
        openapi_extra={"mcp_config": _MCP_TOOL},
    )
    def describe_dataset(dataset_id: str) -> DatasetDefinition:
        """Describe fields, provenance, licensing, quality, and query entry."""
        return hub.describe_dataset(dataset_id)

    @router.get(
        "/sources/status",
        operation_id="source_status",
        response_model=list[SourceStatus],
        openapi_extra={"mcp_config": _MCP_TOOL},
    )
    def source_status(provider: str | None = None) -> list[SourceStatus]:
        """Report credential-free source registration and availability."""
        return hub.source_status(provider)

    return router
