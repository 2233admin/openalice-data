from openalice_data import AccessMode, Catalog, DatasetDefinition, DatasetField


def _catalog() -> Catalog:
    return Catalog(
        [
            DatasetDefinition(
                dataset_id="katana.ashare.pit.daily",
                name="A-share PIT daily bars",
                name_zh="A 股 PIT 日线",
                market="CN",
                asset_type="equity",
                provider="katana_parquet",
                access_mode=AccessMode.DATASET_QUERY,
                description="Point-in-time safe daily bars produced by k-atana.",
                description_zh="由 k-atana 生产的时点安全日线。",
                fields=[
                    DatasetField(name="symbol", type="string", description="Ticker"),
                    DatasetField(
                        name="available_at",
                        type="datetime",
                        description="First usable time",
                        description_zh="可用时间",
                    ),
                ],
                pit=True,
                versions=["2026-08-10"],
                license_id="internal-data-contract",
                query_entry="data.catalog.query_dataset",
            ),
            DatasetDefinition(
                dataset_id="openbb.us.equity.history",
                name="US equity history",
                name_zh="美股历史行情",
                market="US",
                asset_type="equity",
                provider="yfinance",
                access_mode=AccessMode.SOURCE_REQUEST,
                description="Live request through an installed OpenBB provider.",
                description_zh="通过已安装 OpenBB Provider 即时请求。",
                fields=[DatasetField(name="close", type="number")],
                license_id="provider-terms",
                query_entry="data.equity.history",
            ),
        ]
    )


def test_catalog_searches_chinese_names_and_field_descriptions() -> None:
    matches = _catalog().search("A股 可用时间")

    assert [item.dataset_id for item in matches] == ["katana.ashare.pit.daily"]


def test_catalog_describes_access_mode_without_provider_secrets() -> None:
    description = _catalog().describe("openbb.us.equity.history")

    assert description.access_mode is AccessMode.SOURCE_REQUEST
    assert description.query_entry == "data.equity.history"
    assert "credentials" not in description.model_dump()


def test_catalog_returns_english_results_when_chinese_does_not_match() -> None:
    matches = _catalog().search("US history")

    assert [item.dataset_id for item in matches] == ["openbb.us.equity.history"]
