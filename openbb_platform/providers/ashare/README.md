# OpenAlice A-share Provider for OpenBB

This package is the A-share extension boundary for the isolated OpenBB
sidecar. It keeps source-specific SDKs and failure modes outside OpenBB core.

The first public model implements OpenBB's standard `EquityQuote` contract, so
installed environments can use the normal Python, REST, MCP, and
`widgets.json` surfaces:

```python
obb.equity.price.quote("000001.SZ", provider="ashare")
```

It:

- accepts common symbol forms such as `sz000001`, `600000.sh`, and `430047`;
- emits canonical `CODE.MARKET` symbols and OpenBB equity quote fields;
- preserves `source`, upstream `vendor_time`, and sidecar `received_at`;
- receives a source adapter by dependency injection so QMT/XtData, AKShare,
  easyquotation, and efinance can be added and isolated independently.
- includes a credential-free `yfinance` adapter for an immediately runnable
  Shanghai/Shenzhen quote path. Production users can select a licensed source
  adapter without changing OpenBB Core.

Coverage arbitration and the HTTP sidecar facade are deliberately separate
layers. A response must not claim full-universe completeness merely because
one provider call returned successfully.
