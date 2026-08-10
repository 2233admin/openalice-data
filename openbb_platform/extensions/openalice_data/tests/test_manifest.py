import json
from datetime import datetime, timezone

import pyarrow as pa
import pyarrow.parquet as pq

from openalice_data import DatasetQuery
from openalice_data.manifest import load_builtin_catalog, load_provider_policies
from openalice_data.runtime import build_default_hub


def test_builtin_catalog_covers_phase_one_acceptance_datasets() -> None:
    catalog = load_builtin_catalog()

    assert {item.dataset_id for item in catalog.all()} == {
        "openalice.cn.equity.snapshot",
        "openbb.us.equity.history",
        "openbb.crypto.ohlcv",
        "openalice.cn.futures.ohlcv",
        "katana.ashare.pit.daily",
    }


def test_provider_policy_manifest_contains_terms_but_no_secrets() -> None:
    policies = load_provider_policies()

    assert {item.provider_id for item in policies} >= {
        "openbb",
        "axdata",
        "ashare",
        "katana_parquet",
    }
    serialized = [item.model_dump() for item in policies]
    assert all(item["source_url"].startswith("https://") for item in serialized)
    assert "token" not in " ".join(str(item) for item in serialized).lower()
    assert "password" not in " ".join(str(item) for item in serialized).lower()


def test_runtime_manifest_registers_real_pit_versions_read_only(tmp_path) -> None:
    parquet_path = tmp_path / "daily.parquet"
    pq.write_table(
        pa.table(
            {
                "symbol": ["600000.SH"],
                "event_time": [datetime(2026, 1, 1, tzinfo=timezone.utc)],
                "available_at": [datetime(2026, 1, 2, tzinfo=timezone.utc)],
                "source_updated_at": [
                    datetime(2026, 1, 1, 8, tzinfo=timezone.utc)
                ],
            }
        ),
        parquet_path,
    )
    config_path = tmp_path / "sources.json"
    config_path.write_text(
        json.dumps(
            {
                "datasets": {
                    "katana.ashare.pit.daily": {
                        "type": "parquet",
                        "versions": {"real-v1": "daily.parquet"},
                    }
                }
            }
        ),
        encoding="utf-8",
    )

    hub = build_default_hub(config_path)
    result = hub.query_dataset(
        DatasetQuery(
            dataset_id="katana.ashare.pit.daily",
            version="real-v1",
            as_of=datetime(2026, 1, 3, tzinfo=timezone.utc),
        )
    )

    assert result.rows[0]["symbol"] == "600000.SH"
    assert hub.source_status("katana_parquet")[0].status == "registered"
