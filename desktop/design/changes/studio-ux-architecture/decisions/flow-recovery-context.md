# Recovery and context flow

Status: Superseded by the current design baseline.

The current design does not introduce a generic recovery context envelope or Advanced repair workflow. A failure should link directly to the responsible existing OpenAlice or ODP action:

- missing Provider/package → Extensions;
- stopped or failed Backend → ODP / Backends;
- broken environment or package operation → ODP / Environments;
- missing credential → ODP / API Keys;
- Jupyter failure → ODP / Jupyter or Logs;
- process evidence → ODP / Logs;
- unavailable native/composed member → Data Sources with the exact member reason.

Preserve source identity in links when the existing route supports it. Do not build a parallel repair state machine.
