import sys
from types import SimpleNamespace

from openalice_data import DataFacade
from openalice_data.runtime import build_default_hub


class _Recorder:
    def __init__(self, result):
        self.result = result
        self.calls = []

    def __call__(self, **kwargs):
        self.calls.append(kwargs)
        return self.result


def test_short_domain_entries_delegate_and_preserve_openbb_result(monkeypatch) -> None:
    expected = object()
    equity_history = _Recorder(expected)
    crypto_history = _Recorder(expected)
    futures_history = _Recorder(expected)
    obb = SimpleNamespace(
        equity=SimpleNamespace(price=SimpleNamespace(historical=equity_history)),
        crypto=SimpleNamespace(price=SimpleNamespace(historical=crypto_history)),
        derivatives=SimpleNamespace(
            futures=SimpleNamespace(historical=futures_history)
        ),
    )
    monkeypatch.setitem(sys.modules, "openbb", SimpleNamespace(obb=obb))
    data = DataFacade(build_default_hub())

    assert data.equity.history("AAPL", provider="yfinance") is expected
    assert data.crypto.history("BTCUSD", interval="1h") is expected
    assert data.futures.history("RB0", provider="axdata") is expected
    assert equity_history.calls == [{"symbol": "AAPL", "provider": "yfinance"}]
    assert crypto_history.calls == [{"symbol": "BTCUSD", "interval": "1h"}]
    assert futures_history.calls == [{"symbol": "RB0", "provider": "axdata"}]


def test_catalog_facade_uses_the_shared_builtin_catalog() -> None:
    data = DataFacade(build_default_hub())

    assert data.catalog.describe_dataset("katana.ashare.pit.daily").pit is True
    assert data.catalog.search("国内期货")[0].dataset_id == (
        "openalice.cn.futures.ohlcv"
    )
