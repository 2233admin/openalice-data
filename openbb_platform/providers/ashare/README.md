# OpenBB A-share Provider

This package is the A-share extension boundary for the isolated OpenBB
sidecar. It keeps source-specific SDKs and failure modes outside OpenBB core.

The first public model is `AshareSnapshot`:

- accepts common symbol forms such as `sz000001`, `600000.sh`, and `430047`;
- emits canonical `CODE.MARKET` symbols and OpenBB equity quote fields;
- preserves `source`, upstream `vendor_time`, and sidecar `received_at`;
- receives a source adapter by dependency injection so QMT/XtData, AKShare,
  easyquotation, and efinance can be added and isolated independently.

Coverage arbitration and the HTTP sidecar facade are deliberately separate
layers. A response must not claim full-universe completeness merely because
one provider call returned successfully.
