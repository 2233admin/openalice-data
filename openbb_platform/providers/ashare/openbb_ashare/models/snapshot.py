"""Normalized A-share quote snapshot model and OpenBB fetcher."""

from __future__ import annotations

import asyncio
import re
from collections.abc import Awaitable, Callable
from datetime import datetime, timezone
from typing import Any
from warnings import warn

from openbb_core.provider.abstract.fetcher import Fetcher
from openbb_core.provider.standard_models.equity_quote import (
    EquityQuoteData,
    EquityQuoteQueryParams,
)
from pydantic import Field, field_validator

SourceAdapter = Callable[[list[str]], Awaitable[list[dict[str, Any]]] | list[dict[str, Any]]]
_SYMBOL = re.compile(r"^(?:(SH|SZ|BJ))?(\d{6})(?:\.(SH|SZ|BJ))?$", re.IGNORECASE)


def normalize_symbol(value: str) -> str:
    """Normalize common A-share spellings to ``CODE.MARKET``."""
    compact = value.strip().replace(" ", "")
    match = _SYMBOL.fullmatch(compact)
    if not match:
        raise ValueError(f"invalid A-share symbol: {value}")
    prefix, code, suffix = match.groups()
    market = (suffix or prefix or _infer_market(code)).upper()
    return f"{code}.{market}"


def _infer_market(code: str) -> str:
    if code.startswith(("4", "8")):
        return "BJ"
    if code.startswith(("5", "6", "9")):
        return "SH"
    return "SZ"


class AshareSnapshotQueryParams(EquityQuoteQueryParams):
    """Request one or more normalized A-share symbols from a named source."""

    source: str = Field(
        default="yfinance",
        description="A-share source adapter. The built-in credential-free adapter is yfinance.",
    )

    @field_validator("symbol", mode="before")
    @classmethod
    def normalize_symbols(cls, value: str) -> str:
        """Normalize every comma-separated A-share symbol."""
        return ",".join(normalize_symbol(item) for item in value.split(","))


class AshareSnapshotData(EquityQuoteData):
    """OpenBB equity quote plus source and observation provenance."""

    source: str = Field(description="Provider adapter that observed the quote.")
    vendor_time: datetime | None = Field(
        default=None, description="Timestamp supplied by the upstream vendor."
    )
    received_at: datetime = Field(
        description="UTC timestamp when the sidecar received the observation."
    )


class AshareSnapshotFetcher(
    Fetcher[AshareSnapshotQueryParams, list[AshareSnapshotData]]
):
    """Fetch normalized A-share snapshots through an injected source adapter."""

    require_credentials = False

    @staticmethod
    def transform_query(params: dict[str, Any]) -> AshareSnapshotQueryParams:
        """Validate and normalize OpenBB query parameters."""
        return AshareSnapshotQueryParams(**params)

    @staticmethod
    async def aextract_data(
        query: AshareSnapshotQueryParams,
        credentials: dict[str, str] | None,
        **kwargs: Any,
    ) -> list[dict[str, Any]]:
        """Call the injected source adapter without handling credentials."""
        adapter: SourceAdapter | None = kwargs.get("source_adapter")
        if adapter is None:
            adapter = _get_source_adapter(query.source)
        result = adapter(query.symbol.split(","))
        if hasattr(result, "__await__"):
            return await result  # type: ignore[misc]
        return result

    @staticmethod
    def transform_data(
        query: AshareSnapshotQueryParams,
        data: list[dict[str, Any]],
        **kwargs: Any,
    ) -> list[AshareSnapshotData]:
        """Normalize source rows while preserving observation provenance."""
        received_at = kwargs.get("received_at") or datetime.now(timezone.utc)
        rows: list[AshareSnapshotData] = []
        for raw in data:
            symbol = normalize_symbol(str(raw["symbol"]))
            _, market = symbol.split(".")
            price = float(raw["price"])
            prev_close = float(raw["prev_close"]) if raw.get("prev_close") else None
            rows.append(
                AshareSnapshotData(
                    symbol=symbol,
                    name=raw.get("name"),
                    exchange={"SH": "SSE", "SZ": "SZSE", "BJ": "BSE"}[market],
                    asset_type="stock",
                    last_price=price,
                    close=price,
                    prev_close=prev_close,
                    change=(price - prev_close) if prev_close else None,
                    change_percent=((price / prev_close) - 1) if prev_close else None,
                    open=raw.get("open"),
                    high=raw.get("high"),
                    low=raw.get("low"),
                    volume=raw.get("volume"),
                    source=query.source,
                    vendor_time=raw.get("vendor_time"),
                    received_at=received_at,
                )
            )
        return rows


def _get_source_adapter(source: str) -> SourceAdapter:
    """Resolve a built-in adapter without coupling the provider to OpenBB Core."""
    adapters: dict[str, SourceAdapter] = {
        "auto": _yfinance_adapter,
        "yfinance": _yfinance_adapter,
    }
    try:
        return adapters[source.lower()]
    except KeyError as exc:
        available = ", ".join(sorted(adapters))
        raise ValueError(
            f"unsupported A-share source adapter: {source}. Available: {available}"
        ) from exc


def _to_yfinance_symbol(symbol: str) -> str:
    """Translate canonical A-share symbols to Yahoo Finance market suffixes."""
    code, market = normalize_symbol(symbol).split(".")
    suffix = {"SH": "SS", "SZ": "SZ", "BJ": "BJ"}[market]
    return f"{code}.{suffix}"


async def _yfinance_adapter(symbols: list[str]) -> list[dict[str, Any]]:
    """Fetch credential-free A-share quotes from Yahoo Finance."""
    from yfinance import Ticker  # pylint: disable=import-outside-toplevel

    async def get_one(symbol: str) -> dict[str, Any] | None:
        canonical = normalize_symbol(symbol)
        try:
            info = await asyncio.to_thread(
                Ticker(_to_yfinance_symbol(canonical)).get_info
            )
        except Exception as exc:  # noqa: BLE001 - isolate upstream symbol failures
            warn(f"Error getting A-share data for {canonical}: {exc}", stacklevel=2)
            return None
        price = info.get("currentPrice") or info.get("regularMarketPrice")
        if price is None:
            return None
        return {
            "symbol": canonical,
            "name": info.get("longName") or info.get("shortName"),
            "price": price,
            "prev_close": info.get("previousClose") or info.get("regularMarketPreviousClose"),
            "open": info.get("open") or info.get("regularMarketOpen"),
            "high": info.get("dayHigh") or info.get("regularMarketDayHigh"),
            "low": info.get("dayLow") or info.get("regularMarketDayLow"),
            "volume": info.get("volume") or info.get("regularMarketVolume"),
            "vendor_time": info.get("regularMarketTime"),
        }

    rows = await asyncio.gather(*(get_one(symbol) for symbol in symbols))
    return [row for row in rows if row is not None]
