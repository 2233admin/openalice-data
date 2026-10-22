# Motion: functional UX

Project foundation: `../../MOTION.md`
Project foundation SHA-256: `0cfca3c3f67be1d102300ec1637089a10ec9cc07d812dd0c86446075686fd490`
Posture: `static`
Selected primitives: none (`design-pipeline.motion-primitives.v1`)

This change uses immediate semantic state updates and stable geometry. Install, update, rediscovery,
composition, and ODP operations may expose determinate named stages; they must not rely on a spinner
or decorative motion.

Reduced-motion path: identical to the default path. Every install state, source state, composition
change, route handoff, and ODP operation result remains visible without animation.
