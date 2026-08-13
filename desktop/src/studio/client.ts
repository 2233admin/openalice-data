import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { studioSnapshotSchema, type StudioSnapshot } from "./contracts";

export type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

interface BackendService {
  id: string;
  name: string;
  environment: string;
  status: string;
  url?: string;
  command?: string;
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

export interface StudioState {
  runtime: string;
  service: {
    state: "running" | "stopped" | "error";
    backend?: BackendService;
  };
  snapshot: StudioSnapshot;
  extensions: InstalledExtension[];
}

export class StudioStateError extends Error {
  constructor(
    public readonly code: "RUNTIME_NOT_FOUND" | "INSPECTION_FAILED",
    message: string,
    public readonly actionRoute: string,
  ) {
    super(message);
    this.name = "StudioStateError";
  }
}

export async function loadStudioState(invoke: Invoke = tauriInvoke): Promise<StudioState> {
  const [backends, runtimes] = await Promise.all([
    invoke<BackendService[]>("list_backend_services"),
    invoke<Runtime[]>("list_conda_environments", { directory: null }),
  ]);
  const runningBackend = backends.find((backend) => {
    const identity = `${backend.name} ${backend.command ?? ""}`.toLowerCase();
    return backend.status === "running"
      && Boolean(backend.url)
      && (identity.includes("openbb") || identity.includes("uvicorn"));
  });
  const runtime = runningBackend?.environment
    ?? runtimes.find((candidate) => candidate.name === "openbb")?.name;
  if (!runtime) {
    throw new StudioStateError(
      "RUNTIME_NOT_FOUND",
      "OpenBB Studio could not find a managed OpenBB runtime.",
      "/advanced?section=runtimes",
    );
  }

  try {
    const [rawSnapshot, extensionResult] = await Promise.all([
      invoke<unknown>("inspect_studio_environment", { environment: runtime }),
      invoke<{ extensions: InstalledExtension[] }>("get_environment_extensions", { name: runtime }),
    ]);
    return {
      runtime,
      service: {
        state: runningBackend ? "running" : "stopped",
        backend: runningBackend,
      },
      snapshot: studioSnapshotSchema.parse(rawSnapshot),
      extensions: extensionResult.extensions,
    };
  } catch (error) {
    if (error instanceof StudioStateError) throw error;
    throw new StudioStateError(
      "INSPECTION_FAILED",
      error instanceof Error ? error.message : String(error),
      "/advanced?section=runtimes",
    );
  }
}
