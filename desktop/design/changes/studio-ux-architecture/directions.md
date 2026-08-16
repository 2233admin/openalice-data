# Design direction: OpenAlice around ODP

## Selected direction

A calm, dense task shell around the inherited ODP control plane.

```text
OpenAlice tasks                 ODP capability behind them
首页                            managed services / frontend opening
数据源                          native sources / API Keys / Provider execution
环境与扩展                      environments / services / extensions / Notebook / logs
```

## Why

- The repository already contains the real ODP control plane; OpenAlice must reuse it rather than hide it behind a second settings system.
- Startup plans organize existing service and launchable frontend references without copying configuration.
- Data Sources is the only source/API Key surface and keeps workspace classification beside native sources.
- Dense rows, short Chinese actions and contextual native logs improve recovery without a dashboard or query product.

## Interaction signature

- explicit environment, plan and source selection;
- categorized temporary launch-item adjustments;
- visible new/reused/failed service state;
- direct native service, extension, environment and log actions;
- compact tables, rows and tabs instead of decorative cards.

## Rejected directions

- separate Frontends, Extensions, Backends, Environments, API Keys or Logs top-level pages;
- Query, Catalog, Advanced or generic Settings product surfaces;
- workspace copied into startup plans;
- frontend URL registry or frontend protocol;
- second service state machine, query engine, mapping/canonical-field system or second data core.
