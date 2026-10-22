# Cross-flow map: install to source use

Status: Superseded and simplified by the current design baseline.

```text
Home
  -> Data Sources
  -> Extensions when a capability is missing
  -> existing ODP install/update operation
  -> live rediscovery
  -> select a native source or explicitly compose sources
  -> use the source through the existing ODP/OpenBB capability

Any infrastructure issue
  -> ODP
  -> existing Backend / Environment / API Keys / Jupyter / Logs route
  -> return to Data Sources when the route supports it
```

The former install-to-query flow, frontend selection, Workspace mapping, compatibility gates, and shared-canonical query are not active requirements.

See [`../requirements.md`](../requirements.md).
