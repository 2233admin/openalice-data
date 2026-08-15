import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { studioSnapshotSchema, type StudioSnapshot } from "./contracts";

export type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

export interface BackendService {
  id: string;
  name: string;
  environment: string;
  status: string;
  url?: string;
  command?: string;
  error?: string;
}

interface Runtime {
  name: string;
}

export interface InstalledExtension {
  package: string;
  version: string;
  install_method: "pip" | "conda";
  channel: string;
}

export interface StudioServiceState {
  state: "running" | "stopped" | "error";
  backend?: BackendService;
  error?: string;
}

export interface StudioState {
  runtime: string;
  service: StudioServiceState;
  snapshot: StudioSnapshot;
  extensions: InstalledExtension[];
  backends?: BackendService[];
}

export interface StudioErrorContext {
  runtime?: string;
  serviceState?: StudioServiceState["state"];
  backendId?: string;
}

export class StudioStateError extends Error {
  constructor(
    public readonly code: "RUNTIME_NOT_FOUND" | "INSPECTION_FAILED",
    message: string,
    public readonly actionRoute: string,
    public readonly context: StudioErrorContext = {},
  ) {
    super(message);
    this.name = "StudioStateError";
  }
}

function emptySnapshot(service: StudioServiceState, runtime: string): StudioSnapshot {
  const fetchedAt = new Date().toISOString();
  return studioSnapshotSchema.parse({
    providers: [],
    datasets: [],
    actions: [{
      id: "service:stopped",
      state: "setup_required",
      severity: "warning",
      title: "OpenBB service is stopped",
      description: "Start the managed OpenBB service to inspect live Providers and datasets.",
      entity_type: "service",
      action_label: "Start service",
      action_route: "/backends",
    }],
    fetched_at: fetchedAt,
    freshness: {
      status: "not_inspected",
      inspected_at: null,
      source: "none",
    },
    service: {
      state: service.state,
      runtime,
      ...(service.backend?.id ? { backend_id: service.backend.id } : {}),
      ...(service.error ? { error: service.error } : {}),
    },
  });
}

function isOpenBbBackend(candidate: BackendService): boolean {
  const identity = `${candidate.name} ${candidate.command ?? ""}`.toLowerCase();
  return identity.includes("openbb");
}

function isOpenBbApiBackend(candidate: BackendService): boolean {
  const identity = `${candidate.name} ${candidate.command ?? ""}`.toLowerCase();
  return identity.includes("openbb api") || identity.includes("openbb-api");
}

function selectRuntime(backends: BackendService[], runtimes: Runtime[]): {
  backend?: BackendService;
  runtime?: string;
} {
  const openbbBackends = backends.filter(isOpenBbBackend);
  const backend = openbbBackends.find(isOpenBbApiBackend);
  const runtimeNames = new Set(runtimes.map((candidate) => candidate.name));
  const backendRuntime = backend?.environment && runtimeNames.has(backend.environment)
    ? backend.environment
    : undefined;
  const runningBackendHasMissingRuntime = backend?.status === "running"
    && Boolean(backend.environment)
    && !backendRuntime;
  const runtime = runningBackendHasMissingRuntime
    ? undefined
    : backendRuntime ?? runtimes.find((candidate) => candidate.name === "openbb")?.name;
  return { backend, runtime };
}

export async function loadStudioState(invoke: Invoke = tauriInvoke): Promise<StudioState> {
  const [backends, runtimes] = await Promise.all([
    invoke<BackendService[]>("list_backend_services"),
    invoke<Runtime[]>("list_conda_environments", { directory: null }),
  ]);
  const selection = selectRuntime(backends, runtimes);
  const openbbBackends = backends.filter(isOpenBbBackend);
  if (!selection.runtime) {
    throw new StudioStateError(
      "RUNTIME_NOT_FOUND",
      "OpenBB Studio could not find a managed OpenBB runtime. Install or repair the runtime in Advanced.",
      "/advanced?section=runtimes",
      { serviceState: "stopped", backendId: selection.backend?.id },
    );
  }

  const backend = selection.backend;
  const serviceState: StudioServiceState = backend
    ? {
        // A configured backend is stopped until the backend manager reports
        // exactly `running`; URL/configuration presence is not proof of life.
        state: backend.status === "running" ? "running" : "stopped",
        backend,
        ...(backend.status !== "running" && backend.error ? { error: backend.error } : {}),
      }
    : { state: "stopped" };

  if (serviceState.state !== "running") {
    return {
      runtime: selection.runtime,
      service: serviceState,
      backends: openbbBackends,
      snapshot: emptySnapshot(serviceState, selection.runtime),
      extensions: [],
    };
  }

  try {
    const [rawSnapshot, extensionResult] = await Promise.all([
      invoke<unknown>("inspect_studio_environment", {
        environment: selection.runtime,
        base_url: backend?.url,
      }),
      invoke<{ extensions: InstalledExtension[] }>("get_environment_extensions", { name: selection.runtime }),
    ]);
    const snapshot = studioSnapshotSchema.parse(rawSnapshot);
    return {
      runtime: selection.runtime,
      service: serviceState,
      backends: openbbBackends,
      snapshot,
      extensions: extensionResult.extensions,
    };
  } catch (error) {
    if (error instanceof StudioStateError) throw error;
    throw new StudioStateError(
      "INSPECTION_FAILED",
      error instanceof Error ? error.message : String(error),
      "/advanced?section=diagnostics",
      {
        runtime: selection.runtime,
        serviceState: serviceState.state,
        backendId: backend?.id,
      },
    );
  }
}

export async function startStudioService(
  backendId: string,
  invoke: Invoke = tauriInvoke,
): Promise<BackendService> {
  return invoke<BackendService>("start_backend_service", { id: backendId });
}

export async function waitForStudioService(
  backend: BackendService,
  fetcher: typeof fetch = fetch,
  timeoutMs = 15_000,
  intervalMs = 250,
): Promise<void> {
  if (!backend.url) return;
  const baseUrl = backend.url.replace(/\/+$/, "");
  const deadline = Date.now() + timeoutMs;
  let lastFailure = "OpenBB service did not become ready.";

  while (true) {
    try {
      const [openapi, providers] = await Promise.all([
        fetcher(`${baseUrl}/openapi.json`),
        fetcher(`${baseUrl}/api/v1/coverage/providers`),
      ]);
      if (openapi.ok && providers.ok) return;
      lastFailure = `OpenBB service readiness returned ${openapi.status}/${providers.status}.`;
    } catch (cause) {
      lastFailure = cause instanceof Error ? cause.message : String(cause);
    }

    if (Date.now() >= deadline) {
      throw new Error(lastFailure);
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, intervalMs);
    });
  }
}
