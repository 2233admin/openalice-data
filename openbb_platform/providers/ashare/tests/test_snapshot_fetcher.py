"""A-share provider contract tests."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
from openbb_ashare import ashare_provider
from openbb_ashare.models.snapshot import (
    AshareSnapshotFetcher,
    _get_source_adapter,
    _to_yfinance_symbol,
    _yfinance_adapter,
)


def test_provider_registers_the_standard_equity_quote_model() -> None:
    """The provider must attach to OpenBB's existing equity quote route."""
    assert ashare_provider.fetcher_dict["EquityQuote"] is AshareSnapshotFetcher
    assert "AshareSnapshot" not in ashare_provider.fetcher_dict


def test_yfinance_symbol_translation_preserves_chinese_markets() -> None:
    """Translate OpenBB exchange suffixes to Yahoo Finance suffixes."""
    assert _to_yfinance_symbol("600000.SH") == "600000.SS"
    assert _to_yfinance_symbol("sz000001") == "000001.SZ"


def test_unknown_source_adapter_is_actionable() -> None:
    """Reject unknown adapters with an actionable error."""
    with pytest.raises(ValueError, match="unsupported A-share source adapter"):
        _get_source_adapter("missing")


@pytest.mark.asyncio
async def test_yfinance_adapter_isolates_one_symbol_failure() -> None:
    """Return healthy symbols even when one upstream request fails."""
    successful = MagicMock()
    successful.get_info.return_value = {
        "currentPrice": 10.5,
        "previousClose": 10.0,
        "longName": "平安银行",
    }
    failed = MagicMock()
    failed.get_info.side_effect = RuntimeError("upstream unavailable")

    with patch(
        "yfinance.Ticker",
        side_effect=lambda symbol: failed if symbol == "600000.SS" else successful,
    ), pytest.warns(UserWarning, match="600000.SH"):
        rows = await _yfinance_adapter(["000001.SZ", "600000.SH"])

    assert [row["symbol"] for row in rows] == ["000001.SZ"]


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
