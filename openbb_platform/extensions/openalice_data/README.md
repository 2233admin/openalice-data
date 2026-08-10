# OpenAlice Data extension

`openalice-data` is the temporary internal package identity for the read-only
OpenAlice Data Hub. It is not intended for PyPI publication before the public
brand and package name are approved.

The extension adds one OpenBB route tree, `/data`, and four MCP-visible tools:

- `search_catalog`
- `describe_dataset`
- `query_dataset`
- `source_status`

It also provides the concise Python facade without replacing OpenBB return
objects:

```python
from openalice_data import data

datasets = data.catalog.search("A股 PIT")
result = data.equity.history("AAPL", provider="yfinance")
```

Local PIT datasets are registered through a JSON file whose path is supplied in
`OPENALICE_DATA_SOURCES`. The Hub opens Parquet and DuckDB sources read-only;
it does not ingest, update, or fabricate PIT timestamps. See
[`runtime-sources.example.json`](runtime-sources.example.json).
