import { describe, expect, it, vi } from "vitest";
import { listLaunchableFrontends, loadStudioState, restartStudioService, waitForStudioService, type Invoke } from "../../studio/client";

const snapshot = {
  providers: [], datasets: [], actions: [], fetched_at: "2026-08-14T00:00:00+00:00",
};

describe("loadStudioState", () => {
  it("inspects the runtime used by the running OpenBB service", async () => {
    const invoke = vi.fn(async (command: string) => {
      if (command === "list_backend_services") return [
        { id: "other", name: "Custom worker", environment: "unrelated", status: "running", url: "http://127.0.0.1:7000" },
        { id: "mcp", name: "OpenBB MCP", command: "openbb-mcp", environment: "research", status: "running", url: "http://127.0.0.1:6901" },
        { id: "api", name: "OpenBB API", command: "openbb-api", environment: "research", status: "running", url: "http://127.0.0.1:7900" },
      ];
      if (command === "list_conda_environments") return [{ name: "openbb" }, { name: "research" }];
      if (command === "inspect_studio_environment") return snapshot;
      if (command === "get_environment_extensions") return { extensions: [{ package: "openbb-fmp", version: "1.2.3", install_method: "pip", channel: "pypi" }] };
      throw new Error(`Unexpected command: ${command}`);
    });

    const state = await loadStudioState(invoke as unknown as Invoke);

    expect(invoke).toHaveBeenCalledWith("inspect_studio_environment", { environment: "research", base_url: "http://127.0.0.1:7900" });
    expect(state.runtime).toBe("research");
    expect(state.service.state).toBe("running");
    expect(state.backends?.map((backend) => backend.id)).toEqual(["other", "mcp", "api"]);
  });

  it("does not treat an unrelated Uvicorn backend as the OpenBB API", async () => {
    const invoke = vi.fn(async (command: string) => {
      if (command === "list_backend_services") return [{
        id: "not-openbb",
        name: "Notebook server",
        command: "uvicorn notebook:app",
        environment: "research",
        status: "running",
        url: "http://127.0.0.1:7900",
      }];
      if (command === "list_conda_environments") return [{ name: "openbb" }, { name: "research" }];
      throw new Error(`Unexpected command: ${command}`);
    });

    const state = await loadStudioState(invoke as unknown as Invoke);
    expect(state.runtime).toBe("openbb");
    expect(state.service.state).toBe("stopped");
    expect(invoke).not.toHaveBeenCalledWith("inspect_studio_environment", expect.anything());
  });

  it("falls back to the managed openbb runtime without inventing provider data", async () => {
    const invoke = vi.fn(async (command: string) => {
      if (command === "list_backend_services") return [];
      if (command === "list_conda_environments") return [{ name: "openbb" }];
      if (command === "inspect_studio_environment") return snapshot;
      if (command === "get_environment_extensions") return { extensions: [] };
      throw new Error(`Unexpected command: ${command}`);
    });

    const state = await loadStudioState(invoke as unknown as Invoke);
    expect(state.runtime).toBe("openbb");
    expect(state.service.state).toBe("stopped");
    expect(state.snapshot.providers).toEqual([]);
  });
  it("recognizes the OpenBB default environment when its persisted name casing differs", async () => {
    const invoke = vi.fn(async (command: string) => {
      if (command === "list_backend_services") return [];
      if (command === "list_conda_environments") return [{ name: "OpenBB" }];
      if (command === "get_environment_extensions") return { extensions: [] };
      throw new Error(`Unexpected command: ${command}`);
    });

    const state = await loadStudioState(invoke as unknown as Invoke);

    expect(state.runtime).toBe("OpenBB");
  });
  it("returns an actionable error when no OpenBB runtime exists", async () => {
    const invoke = vi.fn(async (command: string) => {
      if (command === "list_backend_services") return [];
      if (command === "list_conda_environments") return [{ name: "unrelated" }];
      throw new Error(`Unexpected command: ${command}`);
    });

    await expect(loadStudioState(invoke as unknown as Invoke)).rejects.toMatchObject({
      code: "RUNTIME_NOT_FOUND",
      actionRoute: "/environment-extensions?tab=environment",
    });
  });
  it("does not fall back to another runtime when a running backend runtime is missing", async () => {
    const invoke = vi.fn(async (command: string) => {
      if (command === "list_backend_services") return [{
        id: "api",
        name: "OpenBB API",
        command: "openbb-api",
        environment: "removed-runtime",
        status: "running",
        url: "http://127.0.0.1:6900",
      }];
      if (command === "list_conda_environments") return [{ name: "openbb" }];
      throw new Error(`Unexpected command: ${command}`);
    });

    await expect(loadStudioState(invoke as unknown as Invoke)).rejects.toMatchObject({
      actionRoute: "/environment-extensions?tab=environment",
      context: { backendId: "api" },
    });
  });
  it("treats configured non-running backends as stopped and does not inspect stale inventory", async () => {
    const invoke = vi.fn(async (command: string) => {
      if (command === "list_backend_services") return [{
        id: "api",
        name: "OpenBB API",
        command: "openbb-api",
        environment: "openbb",
        status: "error",
        url: "http://127.0.0.1:6900",
        error: "process exited",
      }];
      if (command === "list_conda_environments") return [{ name: "openbb" }];
      throw new Error(`Unexpected command: ${command}`);
    });

    const state = await loadStudioState(invoke as unknown as Invoke);
    expect(state.service.state).toBe("stopped");
    expect(state.service.error).toBe("process exited");
    expect(state.snapshot.providers).toEqual([]);
    expect(invoke).not.toHaveBeenCalledWith("inspect_studio_environment", expect.anything());
    expect(state.snapshot.freshness.status).toBe("not_inspected");
  });

  it("reports inspection failures with runtime context and an environment services route", async () => {
    const invoke = vi.fn(async (command: string) => {
      if (command === "list_backend_services") return [{
        id: "api",
        name: "OpenBB API",
        command: "openbb-api",
        environment: "openbb",
        status: "running",
        url: "http://127.0.0.1:6900",
      }];
      if (command === "list_conda_environments") return [{ name: "openbb" }];
      if (command === "inspect_studio_environment") throw new Error("coverage endpoint unavailable");
      if (command === "get_environment_extensions") return { extensions: [] };
      throw new Error(`Unexpected command: ${command}`);
    });

    await expect(loadStudioState(invoke as unknown as Invoke)).rejects.toMatchObject({
      code: "INSPECTION_FAILED",
      actionRoute: "/environment-extensions?tab=services",
      context: { runtime: "openbb", serviceState: "running", backendId: "api" },
    });
  });
  it("retains installed extension inventory while the service is stopped", async () => {
    const invoke = vi.fn(async (command: string) => {
      if (command === "list_backend_services") return [{
        id: "api",
        name: "OpenBB API",
        command: "openbb-api",
        environment: "openbb",
        status: "stopped",
      }];
      if (command === "list_conda_environments") return [{ name: "openbb" }];
      if (command === "get_environment_extensions") return {
        extensions: [{ package: "openbb-yfinance", version: "1.0.0", install_method: "pip", channel: "pypi" }],
      };
      throw new Error(`Unexpected command: ${command}`);
    });

    const state = await loadStudioState(invoke as unknown as Invoke);

    expect(state.extensions).toEqual([{
      package: "openbb-yfinance",
      version: "1.0.0",
      install_method: "pip",
      channel: "pypi",
    }]);
  });

});

it("lists built-in and explicitly declared installed frontends", () => {
  expect(listLaunchableFrontends([
    {
      package: "acme-terminal",
      version: "1.0.0",
      install_method: "pip",
      channel: "pypi",
      role: "frontend",
      frontend: {
        id: "frontend:acme-terminal",
        name: "Acme Terminal",
        url: "http://127.0.0.1:9010",
      },
    },
    {
      package: "openbb-fmp",
      version: "1.0.0",
      install_method: "pip",
      channel: "pypi",
    },
  ])).toEqual([
    {
      id: "frontend:openbb-workspace",
      name: "OpenBB Workspace",
      url: "https://pro.openbb.co",
      builtin: true,
    },
    {
      id: "frontend:acme-terminal",
      name: "Acme Terminal",
      url: "http://127.0.0.1:9010",
      builtin: false,
      extensionPackage: "acme-terminal",
    },
  ]);
});
it("stops, starts, and waits for a running service during restart", async () => {
  const invoke = vi.fn(async (command: string) => {
    if (command === "stop_backend_service") return undefined;
    if (command === "start_backend_service") return {
      id: "api",
      name: "OpenBB API",
      command: "openbb-api",
      environment: "openbb",
      status: "running",
    };
    throw new Error(`Unexpected command: ${command}`);
  });

  await restartStudioService("api", invoke as unknown as Invoke);

  expect(invoke).toHaveBeenNthCalledWith(1, "stop_backend_service", { id: "api" });
  expect(invoke).toHaveBeenNthCalledWith(2, "start_backend_service", { id: "api" });
});

it("waits for OpenBB coverage readiness before refreshing Studio state", async () => {
  const statuses = [503, 503, 200, 200];
  const fetcher = vi.fn(async () => new Response(null, { status: statuses.shift() ?? 200 }));

  await waitForStudioService(
    { id: "api", name: "OpenBB API", command: "openbb-api", environment: "openbb", status: "running", url: "http://127.0.0.1:6900/" },
    fetcher,
    100,
    0,
  );

  expect(fetcher).toHaveBeenCalledWith("http://127.0.0.1:6900/openapi.json");
  expect(fetcher).toHaveBeenCalledWith("http://127.0.0.1:6900/api/v1/coverage/providers");
  expect(fetcher).toHaveBeenCalledTimes(4);
});
