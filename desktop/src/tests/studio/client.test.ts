import { describe, expect, it, vi } from "vitest";
import { loadStudioState, type Invoke } from "../../studio/client";

const snapshot = {
  providers: [], datasets: [], actions: [], fetched_at: "2026-08-14T00:00:00+00:00",
};

describe("loadStudioState", () => {
  it("inspects the runtime used by the running OpenBB service", async () => {
    const invoke = vi.fn(async (command: string) => {
      if (command === "list_backend_services") return [
        { id: "other", name: "Custom worker", environment: "unrelated", status: "running", url: "http://127.0.0.1:7000" },
        { id: "mcp", name: "OpenBB MCP", command: "openbb-mcp", environment: "research", status: "running", url: "http://127.0.0.1:6901" },
        { id: "api", name: "OpenBB API", command: "openbb-api", environment: "research", status: "running", url: "http://127.0.0.1:6900" },
      ];
      if (command === "list_conda_environments") return [{ name: "openbb" }, { name: "research" }];
      if (command === "inspect_studio_environment") return snapshot;
      if (command === "get_environment_extensions") return { extensions: [{ package: "openbb-fmp", version: "1.2.3", install_method: "pip", channel: "pypi" }] };
      throw new Error(`Unexpected command: ${command}`);
    });

    const state = await loadStudioState(invoke as unknown as Invoke);

    expect(invoke).toHaveBeenCalledWith("inspect_studio_environment", { environment: "research" });
    expect(state.runtime).toBe("research");
    expect(state.service.state).toBe("running");
    expect(state.backends?.map((backend) => backend.id)).toEqual(["mcp", "api"]);
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

  it("returns an actionable error when no OpenBB runtime exists", async () => {
    const invoke = vi.fn(async (command: string) => {
      if (command === "list_backend_services") return [];
      if (command === "list_conda_environments") return [{ name: "unrelated" }];
      throw new Error(`Unexpected command: ${command}`);
    });

    await expect(loadStudioState(invoke as unknown as Invoke)).rejects.toMatchObject({
      code: "RUNTIME_NOT_FOUND",
      actionRoute: "/advanced?section=runtimes",
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
      code: "RUNTIME_NOT_FOUND",
      actionRoute: "/advanced?section=runtimes",
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

  it("reports inspection failures with runtime context and an Advanced diagnostics route", async () => {
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
      actionRoute: "/advanced?section=diagnostics",
      context: { runtime: "openbb", serviceState: "running", backendId: "api" },
    });
  });
});
