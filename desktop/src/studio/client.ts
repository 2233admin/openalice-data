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
  auto_start?: boolean;
  autoStart?: boolean;
  host?: string;
  port?: number;
  working_directory?: string;
  [key: string]: unknown;
}

export interface RuntimeSummary {
  name: string;
  path?: string;
  pythonVersion?: string;
  [key: string]: unknown;
}

export type ExtensionRole = "frontend" | "notebook";

export interface FrontendDescriptor {
  id: string;
  name: string;
  url: string;
}

export type LaunchableFrontend = FrontendDescriptor & {
  builtin: boolean;
  extensionPackage?: string;
  role?: ExtensionRole;
  display_name?: string;
  frontend?: FrontendDescriptor;
};

export const builtinLaunchableFrontend: LaunchableFrontend = {
  id: "frontend:openbb-workspace",
  name: "OpenBB Workspace",
  url: "https://pro.openbb.co",
  builtin: true,
};

function isValidFrontendDescriptor(value: unknown): value is FrontendDescriptor {
  if (!value || typeof value !== "object") return false;
  const descriptor = value as Record<string, unknown>;
  if (
    typeof descriptor.id !== "string" ||
    !descriptor.id.trim() ||
    typeof descriptor.name !== "string" ||
    !descriptor.name.trim() ||
    typeof descriptor.url !== "string" ||
    !descriptor.url.trim()
  ) {
    return false;
  }
  try {
    const parsed = new URL(descriptor.url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function listLaunchableFrontends(extensions: InstalledExtension[] = []): LaunchableFrontend[] {
  const frontends: LaunchableFrontend[] = [builtinLaunchableFrontend];
  const knownIds = new Set(frontends.map((frontend) => frontend.id));
  for (const extension of extensions) {
    if (extension.role !== "frontend" || !isValidFrontendDescriptor(extension.frontend)) continue;
    const { id, name, url } = extension.frontend;
    if (knownIds.has(id)) continue;
    knownIds.add(id);
    frontends.push({
      id,
      name,
      url,
      builtin: false,
      extensionPackage: extension.package,
    });
  }
  return frontends;
}


export interface InstalledExtension {
  package: string;
  version: string;
  install_method: "pip" | "conda";
  channel: string;
  role?: ExtensionRole;
  display_name?: string;
  frontend?: FrontendDescriptor;
}



export interface StudioServiceState {
  state: "running" | "stopped" | "error";
  backend?: BackendService;
  error?: string;
}

export interface StudioState {
  runtime: string;
  runtimes: RuntimeSummary[];
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
      title: "OpenBB 服务未运行",
      description: "启动受管服务后才能检查实时数据源。",
      entity_type: "service",
      action_label: "检查服务",
      action_route: "/environment-extensions?tab=services",
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

function normalizedRuntimeName(name: string): string {
  return name.trim().toLowerCase();
}
function isOpenBbBackend(candidate: BackendService): boolean {
  const identity = `${candidate.name} ${candidate.command ?? ""}`.toLowerCase();
  return identity.includes("openbb");
}

function isOpenBbApiBackend(candidate: BackendService): boolean {
  const identity = `${candidate.name} ${candidate.command ?? ""}`.toLowerCase();
  return identity.includes("openbb api") || identity.includes("openbb-api");
}

export function isOpenBbRuntime(name: string): boolean {
  return normalizedRuntimeName(name) === "openbb";
}

function sameRuntimeName(left: string, right: string): boolean {
  return normalizedRuntimeName(left) === normalizedRuntimeName(right);
}

function selectRuntime(backends: BackendService[], runtimes: RuntimeSummary[]): {
  backend?: BackendService;
  runtime?: string;
} {
  const openbbBackends = backends.filter(isOpenBbBackend);
  const backend = openbbBackends.find(isOpenBbApiBackend);
  const backendRuntime = backend?.environment
    ? runtimes.find((candidate) => sameRuntimeName(candidate.name, backend.environment))?.name
    : undefined;
  const runningBackendHasMissingRuntime = backend?.status === "running"
    && Boolean(backend.environment)
    && !backendRuntime;
  const runtime = runningBackendHasMissingRuntime
    ? undefined
    : backendRuntime ?? runtimes.find((candidate) => isOpenBbRuntime(candidate.name))?.name;
  return { backend, runtime };
}

export async function loadStudioState(invoke: Invoke = tauriInvoke): Promise<StudioState> {
  const [backends, runtimes] = await Promise.all([
    invoke<BackendService[]>("list_backend_services"),
    invoke<RuntimeSummary[]>("list_conda_environments", { directory: null }),
  ]);
  const selection = selectRuntime(backends, runtimes);
  const backend = selection.backend;
  if (!selection.runtime) {
    throw new StudioStateError(
      "RUNTIME_NOT_FOUND",
      "找不到受管 OpenBB 运行环境，请在“环境与扩展”中创建或修复环境。",
      "/environment-extensions?tab=environment",
      { serviceState: "stopped", backendId: selection.backend?.id },
    );
  }

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
    let extensions: InstalledExtension[] = [];
    try {
      const extensionResult = await invoke<{ extensions: InstalledExtension[] }>("get_environment_extensions", { name: selection.runtime });
      extensions = extensionResult.extensions;
    } catch {
      // A stopped or broken service must not hide the rest of the runtime state
      // when extension inventory is temporarily unavailable.
    }
    return {
      runtime: selection.runtime,
      runtimes,
      service: serviceState,
      backends,
      snapshot: emptySnapshot(serviceState, selection.runtime),
      extensions,
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
      runtimes,
      service: serviceState,
      backends,
      snapshot,
      extensions: extensionResult.extensions,
    };
  } catch (error) {
    if (error instanceof StudioStateError) throw error;
    throw new StudioStateError(
      "INSPECTION_FAILED",
      error instanceof Error ? error.message : String(error),
      "/environment-extensions?tab=services",
      {
        runtime: selection.runtime,
        serviceState: serviceState.state,
        backendId: backend?.id,
      },
    );
  }
}

export async function stopStudioService(
  backendId: string,
  invoke: Invoke = tauriInvoke,
): Promise<void> {
  await invoke("stop_backend_service", { id: backendId });
}

export async function startStudioServiceAndWait(
  backendId: string,
  invoke: Invoke = tauriInvoke,
): Promise<BackendService> {
  const started = await startStudioService(backendId, invoke);
  await waitForStudioService(started);
  return started;
}

export async function restartStudioService(
  backendId: string,
  invoke: Invoke = tauriInvoke,
): Promise<BackendService> {
  await stopStudioService(backendId, invoke);
  return startStudioServiceAndWait(backendId, invoke);
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
