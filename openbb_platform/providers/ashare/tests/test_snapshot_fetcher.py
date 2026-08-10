"""A-share provider contract tests."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
from openbb_ashare.models.snapshot import AshareSnapshotFetcher


@pytest.mark.asyncio
async def test_snapshot_fetcher_normalizes_symbols_and_preserves_provenance() -> None:
    """Normalize symbols and retain vendor/source timestamps."""
    async def source_adapter(symbols: list[str]) -> list[dict]:
        assert symbols == ["000001.SZ", "600000.SH"]
        return [
            {
                "symbol": "000001.SZ",
                "name": "平安银行",
                "price": 10.25,
                "prev_close": 10.00,
                "vendor_time": "2026-08-10T10:30:00+08:00",
            },
            {
                "symbol": "600000.SH",
                "name": "浦发银行",
                "price": 11.10,
                "prev_close": 11.00,
                "vendor_time": "2026-08-10T10:30:01+08:00",
            },
        ]

    received_at = datetime(2026, 8, 10, 2, 30, 2, tzinfo=timezone.utc)
    result = await AshareSnapshotFetcher.fetch_data(
        {"symbol": "sz000001,600000.sh", "source": "fixture"},
        source_adapter=source_adapter,
        received_at=received_at,
    )

    assert [row.symbol for row in result] == ["000001.SZ", "600000.SH"]
    assert [row.exchange for row in result] == ["SZSE", "SSE"]
    assert [row.source for row in result] == ["fixture", "fixture"]
    assert all(row.received_at == received_at for row in result)
    assert result[0].change_percent == pytest.approx(0.025)
