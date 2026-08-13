# OpenBB Studio P0 implementation

Studio is an incremental product layer over the existing ODP Desktop. It does
not replace the environment, extension, credential, backend, or logging
subsystems.

## Runtime data flow

1. `inspect_studio_environment` selects a Python executable from an ODP-managed
   Conda runtime. The command accepts an environment name, not an arbitrary
   command or script.
2. The bundled `studio_inspector.py` loads OpenBB's `ProviderInterface`,
   `RegistryMap`, `CommandMap`, and `UserSettings`.
3. The Inspector returns provider credential *names and configured state*,
   model fields, command coverage, and dataset routes. Credential values are
   never serialized.
4. The renderer validates the boundary with a strict Zod schema and caches it
   with TanStack Query.
5. Successful and failed representative queries store only bounded,
   non-sensitive activity metadata in renderer storage. This supplies recent
   queries, last-test timestamps, and observed health; it never stores response
   bodies, submitted parameters, or credentials.

The original `/backends`, `/environments`, `/api-keys`, and log routes remain
unchanged and are available from **Advanced**.

## Development checks

From `desktop/`:

```powershell
npm test -- --run
npm run lint
npm run build
```

Inspector contract and real-environment smoke test:

```powershell
$env:PYTHONPATH='src-tauri/resources'
python -m unittest discover -s src-tauri/resources/tests -v
python src-tauri/resources/studio_inspector.py --json
$env:OPENBB_STUDIO_REAL_RUNTIME='1'
python -m unittest discover -s src-tauri/resources/tests -v
```

With a managed API service already running, execute the opt-in real-provider
integration test:

```powershell
$env:OPENBB_STUDIO_API_URL='http://127.0.0.1:6900'
npm test -- --run src/tests/integration/studio-real-provider.test.ts
```

Rust tests require the same OpenSSL/vcpkg prerequisites as the upstream ODP
Desktop CI. On Windows, set `VCPKG_ROOT`, install `openssl:x64-windows`, and set
`OPENSSL_DIR` to the installed triplet before running `cargo test`.

## Current P0 limitations

- The API service must be started through the existing Services page before a
  Playground query can run.
- Query history is intentionally local metadata rather than a synchronization
  service and is bounded to the most recent 50 tests.
- Extension installation uses the existing Runtimes installer; Studio does not
  introduce a second package manager.

## P1 continuation seam

P1 can add Provider Builder and richer guided installation behind the same
Inspector contract and existing runtime installer. It should extend registry
serialization or the controlled Tauri boundary instead of introducing a second
catalogue, package manager, or credential store.
