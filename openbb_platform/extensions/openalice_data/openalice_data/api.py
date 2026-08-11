"""FastAPI routes automatically projected into four OpenBB MCP tools."""

from __future__ import annotations

import re
from importlib.metadata import (
    PackageNotFoundError,
    version as package_version,
)
from importlib.resources import files

from fastapi import APIRouter
from fastapi.responses import HTMLResponse, Response

from openalice_data.hub import DataHub
from openalice_data.models import (
    DatasetDefinition,
    DatasetQuery,
    QueryPage,
    SourceStatus,
)

_MCP_TOOL = {"expose": True, "mcp_type": "tool"}
def _dashboard_asset(name: str) -> str:
    """Load one packaged dashboard asset without relying on a working directory."""
    return files("openalice_data").joinpath("web", name).read_text(encoding="utf-8")


def _display_version() -> str:
    """Convert the package's PEP 440 beta version into the public label."""
    try:
        raw = package_version("openalice-data")
    except PackageNotFoundError:
        raw = "0.1.0b1"
    return re.sub(r"b(\d+)$", r"-beta.\1", raw)


def create_api_router(hub: DataHub) -> APIRouter:
    """Create the REST/MCP projection for one Hub instance."""
    router = APIRouter()

    @router.get("/", include_in_schema=False, response_class=HTMLResponse)
    def dashboard() -> HTMLResponse:
        """Serve the zero-setup Chinese product entry."""
        return HTMLResponse(_dashboard_asset("index.html"))

    @router.get("/assets/dashboard.css", include_in_schema=False)
    def dashboard_stylesheet() -> Response:
        """Serve the dashboard stylesheet from the Python package."""
        return Response(
            _dashboard_asset("dashboard.css"),
            media_type="text/css; charset=utf-8",
        )

    @router.get("/assets/dashboard.js", include_in_schema=False)
    def dashboard_script() -> Response:
        """Serve the dependency-free dashboard application."""
        return Response(
            _dashboard_asset("dashboard.js"),
            media_type="application/javascript; charset=utf-8",
        )

    @router.get("/health", operation_id="openalice_data_health")
    def health() -> dict[str, str]:
        """Verify packaged UI and catalog readiness without exposing credentials."""
        dashboard_ready = "OpenAlice Data" in _dashboard_asset("index.html")
        catalog_ready = bool(hub.search_catalog("", limit=1))
        return {
            "status": "ok" if dashboard_ready and catalog_ready else "degraded",
            "product": "OpenAlice Data",
            "version": _display_version(),
            "catalog": "ready" if catalog_ready else "empty",
            "dashboard": "ready" if dashboard_ready else "missing",
        }

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
