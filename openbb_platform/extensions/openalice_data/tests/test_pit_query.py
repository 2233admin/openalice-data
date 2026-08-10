from datetime import datetime, timezone

import duckdb
import pyarrow as pa
import pyarrow.parquet as pq
import pytest

from openalice_data import (
    AccessMode,
    Catalog,
    DatasetDefinition,
    DatasetField,
    DatasetQuery,
    DuckDBDatasetSource,
    ParquetDatasetSource,
    PITContractError,
    QueryService,
)


def _definition() -> DatasetDefinition:
    return DatasetDefinition(
        dataset_id="katana.ashare.pit.daily",
        name="A-share PIT daily bars",
        name_zh="A 股 PIT 日线",
        market="CN",
        asset_type="equity",
        provider="katana_parquet",
        access_mode=AccessMode.DATASET_QUERY,
        fields=[
            DatasetField(name="symbol", type="string"),
            DatasetField(name="event_time", type="datetime"),
            DatasetField(name="available_at", type="datetime"),
            DatasetField(name="source_updated_at", type="datetime"),
            DatasetField(name="close", type="number"),
        ],
        license_id="internal-data-contract",
        query_entry="data.catalog.query_dataset",
        pit=True,
        versions=["v1"],
        event_time_field="event_time",
        available_at_field="available_at",
        source_updated_at_field="source_updated_at",
        lineage="k-atana:ashare-pit-daily",
        quality_status="validated",
    )


def _write_parquet(path, *, include_available_at: bool = True) -> None:
    data = {
        "symbol": ["600000.SH", "000001.SZ"],
        "event_time": [
            datetime(2026, 1, 1, tzinfo=timezone.utc),
            datetime(2026, 1, 2, tzinfo=timezone.utc),
        ],
        "source_updated_at": [
            datetime(2026, 1, 1, 8, tzinfo=timezone.utc),
            datetime(2026, 1, 4, 8, tzinfo=timezone.utc),
        ],
        "close": [10.0, 20.0],
    }
    if include_available_at:
        data["available_at"] = [
            datetime(2026, 1, 2, tzinfo=timezone.utc),
            datetime(2026, 1, 5, tzinfo=timezone.utc),
        ]
    pq.write_table(pa.table(data), path)


def test_pit_query_clips_rows_by_available_at_and_pins_version(tmp_path) -> None:
    parquet_path = tmp_path / "daily-v1.parquet"
    _write_parquet(parquet_path)
    service = QueryService(
        Catalog([_definition()]),
        {"katana.ashare.pit.daily": ParquetDatasetSource({"v1": parquet_path})},
    )

    result = service.query(
        DatasetQuery(
            dataset_id="katana.ashare.pit.daily",
            version="v1",
            as_of=datetime(2026, 1, 3, tzinfo=timezone.utc),
        )
    )

    assert [row["symbol"] for row in result.rows] == ["600000.SH"]
    assert result.metadata.pit_version == "v1"
    assert result.metadata.as_of == datetime(2026, 1, 3, tzinfo=timezone.utc)
    assert result.metadata.source == "katana_parquet"
    assert result.metadata.complete is True


@pytest.mark.parametrize("missing", ["version", "as_of"])
def test_pit_query_requires_version_and_as_of(tmp_path, missing) -> None:
    parquet_path = tmp_path / "daily-v1.parquet"
    _write_parquet(parquet_path)
    service = QueryService(
        Catalog([_definition()]),
        {"katana.ashare.pit.daily": ParquetDatasetSource({"v1": parquet_path})},
    )
    values = {
        "dataset_id": "katana.ashare.pit.daily",
        "version": "v1",
        "as_of": datetime(2026, 1, 3, tzinfo=timezone.utc),
    }
    values[missing] = None

    with pytest.raises(PITContractError, match=missing):
        service.query(DatasetQuery(**values))


def test_pit_query_rejects_parquet_without_available_at(tmp_path) -> None:
    parquet_path = tmp_path / "broken.parquet"
    _write_parquet(parquet_path, include_available_at=False)
    service = QueryService(
        Catalog([_definition()]),
        {"katana.ashare.pit.daily": ParquetDatasetSource({"v1": parquet_path})},
    )

    with pytest.raises(PITContractError, match="available_at"):
        service.query(
            DatasetQuery(
                dataset_id="katana.ashare.pit.daily",
                version="v1",
                as_of=datetime(2026, 1, 3, tzinfo=timezone.utc),
            )
        )


def test_duckdb_source_uses_the_same_pit_query_contract(tmp_path) -> None:
    database = tmp_path / "pit.duckdb"
    connection = duckdb.connect(str(database))
    connection.execute(
        """
        CREATE TABLE daily (
          symbol VARCHAR,
          event_time TIMESTAMPTZ,
          available_at TIMESTAMPTZ,
          source_updated_at TIMESTAMPTZ,
          close DOUBLE
        )
        """
    )
    connection.executemany(
        "INSERT INTO daily VALUES (?, ?, ?, ?, ?)",
        [
            (
                "600000.SH",
                datetime(2026, 1, 1, tzinfo=timezone.utc),
                datetime(2026, 1, 2, tzinfo=timezone.utc),
                datetime(2026, 1, 1, 8, tzinfo=timezone.utc),
                10.0,
            ),
            (
                "000001.SZ",
                datetime(2026, 1, 2, tzinfo=timezone.utc),
                datetime(2026, 1, 5, tzinfo=timezone.utc),
                datetime(2026, 1, 4, 8, tzinfo=timezone.utc),
                20.0,
            ),
        ],
    )
    connection.close()
    service = QueryService(
        Catalog([_definition()]),
        {
            "katana.ashare.pit.daily": DuckDBDatasetSource(
                {"v1": (database, "daily")}
            )
        },
    )

    result = service.query(
        DatasetQuery(
            dataset_id="katana.ashare.pit.daily",
            version="v1",
            as_of=datetime(2026, 1, 3, tzinfo=timezone.utc),
        )
    )

    assert [row["symbol"] for row in result.rows] == ["600000.SH"]
    assert result.artifact_uri.endswith("format=duckdb")
