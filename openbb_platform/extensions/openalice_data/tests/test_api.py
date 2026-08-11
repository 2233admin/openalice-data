from fastapi import FastAPI
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

from openalice_data import (
    AccessMode,
    Catalog,
    DataHub,
    DatasetDefinition,
    DatasetField,
    QueryService,
    create_api_router,
)


def _hub() -> DataHub:
    catalog = Catalog(
        [
            DatasetDefinition(
                dataset_id="openbb.us.equity.history",
                name="US equity history",
                name_zh="美股历史行情",
                market="US",
                asset_type="equity",
                provider="yfinance",
                access_mode=AccessMode.SOURCE_REQUEST,
                fields=[DatasetField(name="close", type="number")],
                license_id="provider-terms",
                query_entry="data.equity.history",
            )
        ]
    )
    return DataHub(catalog, QueryService(catalog, {}))


def test_api_exposes_exactly_four_read_only_agent_tools() -> None:
    router = create_api_router(_hub())
    routes = [
        route
        for route in router.routes
        if isinstance(route, APIRoute)
        and route.openapi_extra
        and route.openapi_extra.get("mcp_config", {}).get("expose") is True
    ]

    assert {route.operation_id for route in routes} == {
        "search_catalog",
        "describe_dataset",
        "query_dataset",
        "source_status",
    }
    assert all(route.methods <= {"GET", "POST"} for route in routes)
    assert all(
        route.openapi_extra["mcp_config"] == {
            "expose": True,
            "mcp_type": "tool",
        }
        for route in routes
    )


def test_rest_search_uses_the_same_catalog_contract() -> None:
    app = FastAPI()
    app.include_router(create_api_router(_hub()), prefix="/data")
    response = TestClient(app).get("/data/catalog/search", params={"query": "美股"})

    assert response.status_code == 200
    assert response.json()[0]["dataset_id"] == "openbb.us.equity.history"


def test_source_status_does_not_expose_credentials() -> None:
    app = FastAPI()
    app.include_router(create_api_router(_hub()), prefix="/data")
    payload = TestClient(app).get("/data/sources/status").json()

    assert payload == [
        {
            "provider": "yfinance",
            "status": "catalog_only",
            "datasets": ["openbb.us.equity.history"],
            "message": "Use the OpenBB source request entry.",
        }
    ]
    assert "credential" not in str(payload).lower()
