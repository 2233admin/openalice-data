"""Concise Python facade that preserves OpenBB return objects."""

from __future__ import annotations

from typing import Any

from openalice_data.hub import DataHub
from openalice_data.models import DatasetQuery


def _openbb():
    from openbb import obb

    return obb


def _with_provider(provider: str | None, kwargs: dict[str, Any]) -> dict[str, Any]:
    if provider is not None:
        kwargs["provider"] = provider
    return kwargs


class CatalogFacade:
    """Dataset discovery and read-only query entry."""

    def __init__(self, hub: DataHub) -> None:
        self._hub = hub

    def search(self, query: str, *, limit: int = 20):
        """Search the shared bilingual catalog."""
        return self._hub.search_catalog(query, limit=limit)

    def describe_dataset(self, dataset_id: str):
        """Describe one catalog entry."""
        return self._hub.describe_dataset(dataset_id)

    describe = describe_dataset

    def query_dataset(self, request: DatasetQuery | None = None, **kwargs):
        """Run one bounded, read-only dataset query."""
        return self._hub.query_dataset(request or DatasetQuery(**kwargs))

    query = query_dataset


class EquityFacade:
    """Short aliases for OpenBB equity routes."""

    def history(self, symbol: str, provider: str | None = None, **kwargs):
        """Delegate equity history to OpenBB and preserve its return object."""
        return _openbb().equity.price.historical(
            **_with_provider(provider, {"symbol": symbol, **kwargs})
        )

    def quote(self, symbol: str, provider: str | None = None, **kwargs):
        """Delegate an equity quote to OpenBB."""
        return _openbb().equity.price.quote(
            **_with_provider(provider, {"symbol": symbol, **kwargs})
        )


class CryptoFacade:
    """Short aliases for OpenBB cryptocurrency routes."""

    def history(self, symbol: str, provider: str | None = None, **kwargs):
        """Delegate cryptocurrency history to OpenBB."""
        return _openbb().crypto.price.historical(
            **_with_provider(provider, {"symbol": symbol, **kwargs})
        )

    def quote(self, symbol: str, provider: str | None = None, **kwargs):
        """Delegate a cryptocurrency quote to OpenBB."""
        return _openbb().crypto.price.quote(
            **_with_provider(provider, {"symbol": symbol, **kwargs})
        )


class FuturesFacade:
    """Short aliases for OpenBB futures routes."""

    def history(self, symbol: str, provider: str | None = None, **kwargs):
        """Delegate futures history to OpenBB."""
        return _openbb().derivatives.futures.historical(
            **_with_provider(provider, {"symbol": symbol, **kwargs})
        )


class DataFacade:
    """Top-level short domain surface."""

    def __init__(self, hub: DataHub) -> None:
        self.catalog = CatalogFacade(hub)
        self.equity = EquityFacade()
        self.crypto = CryptoFacade()
        self.futures = FuturesFacade()
