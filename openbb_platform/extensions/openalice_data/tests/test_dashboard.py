"""User-facing dashboard and readiness contracts."""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from openalice_data.api import create_api_router
from openalice_data.runtime import build_default_hub


def _client() -> TestClient:
    """Build an isolated app through the public router factory."""
    app = FastAPI()
    app.include_router(create_api_router(build_default_hub()))
    return TestClient(app)


def test_dashboard_is_a_chinese_first_product_entry() -> None:
    """The zero-setup entry should be a Chinese OpenAlice Data screen."""
    response = _client().get("/")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert '<html lang="zh-CN">' in response.text
    assert "OpenAlice Data" in response.text
    assert "搜索数据" in response.text
    assert "验证真实行情" in response.text
    assert "接入自定义市场" in response.text


def test_dashboard_assets_are_served_by_the_same_api_process() -> None:
    """The API container should not require a second web runtime."""
    client = _client()

    stylesheet = client.get("/assets/dashboard.css")
    script = client.get("/assets/dashboard.js")

    assert stylesheet.status_code == 200
    assert stylesheet.headers["content-type"].startswith("text/css")
    assert "--ink" in stylesheet.text
    assert script.status_code == 200
    assert "catalog/search" in script.text
    assert "/api/v1/equity/price/historical" in script.text


def test_health_exposes_product_and_beta_version_without_becoming_an_mcp_tool() -> None:
    """Readiness should stay separate from the four agent tools."""
    app = FastAPI()
    app.include_router(create_api_router(build_default_hub()))
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["product"] == "OpenAlice Data"
    assert response.json()["version"] == "0.1.0-beta.1"
    assert response.json()["catalog"] == "ready"
    assert response.json()["dashboard"] == "ready"
    mcp_tools = [
        route.operation_id
        for route in app.routes
        if getattr(route, "openapi_extra", None)
        and route.openapi_extra.get("mcp_config", {}).get("expose") is True
    ]
    assert mcp_tools == [
        "search_catalog",
        "query_dataset",
        "describe_dataset",
        "source_status",
    ]
