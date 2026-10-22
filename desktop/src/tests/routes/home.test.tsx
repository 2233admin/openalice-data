import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { vi } from "vitest";
import { Route } from "../../routes/home";
import { useStudioState } from "../../studio/queries";
import { startStudioService, stopStudioService } from "../../studio/client";

vi.mock("../../studio/queries", () => ({ useStudioState: vi.fn() }));
vi.mock("../../studio/client", () => ({
  listLaunchableFrontends: vi.fn((extensions: Array<{ role?: string; frontend?: unknown }>) => [
    { id: "frontend:openbb-workspace", name: "OpenBB Workspace", url: "https://pro.openbb.co", builtin: true },
    ...extensions.filter((extension) => extension.role === "frontend" && extension.frontend).map((extension) => ({
      ...(extension.frontend as { id: string; name: string; url: string }),
      builtin: false,
      extensionPackage: "acme-terminal",
    })),
  ]),
  startStudioService: vi.fn(),
  stopStudioService: vi.fn(),
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(() => Promise.resolve()) }));

const Home = Route.options.component as React.ComponentType;
const readyData = {
  runtime: "research",
  runtimes: [{ name: "research" }, { name: "openbb" }],
  backends: [{ id: "api", name: "OpenBB API", environment: "research", status: "stopped", command: "openbb-api" }],
  service: { state: "stopped" },
  extensions: [],
  snapshot: {
    providers: [
      { id: "fmp", name: "fmp", display_name: "FMP", status: "available", capability_count: 1, capabilities: [], credential_fields: [{ name: "fmp_api_key", required: true, configured: true }] },
      { id: "yfinance", name: "yfinance", display_name: "YFinance", status: "available", capability_count: 1, capabilities: [], credential_fields: [] },
    ],
    datasets: [], actions: [], fetched_at: "2026-08-14T00:00:00+00:00",
    freshness: { status: "fresh", inspected_at: "2026-08-14T00:00:00+00:00", source: "live" },
  },
};

function seedPlan(items = [{ kind: "service", id: "api" }, { kind: "frontend", id: "frontend:openbb-workspace" }]) {
  localStorage.setItem("openalice.startup-plans.v1", JSON.stringify({
    version: 1,
    plans: [{ id: "plan-1", environment: "research", name: "研究启动", items, createdAt: "2026-08-14T00:00:00+00:00", updatedAt: "2026-08-14T00:00:00+00:00" }],
  }));
}

describe("Home launcher", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(useStudioState).mockReturnValue({ data: readyData, isPending: false, error: null, refetch: vi.fn().mockResolvedValue(undefined) } as never);
    vi.mocked(startStudioService).mockResolvedValue({ ...readyData.backends[0], status: "running" } as never);
    vi.mocked(stopStudioService).mockResolvedValue(undefined);
  });

  it("keeps the compact environment, plan, source selectors and Start", () => {
    seedPlan();
    render(<Home />);
    expect(screen.getAllByRole("combobox")).toHaveLength(3);
    expect(screen.getByLabelText("环境")).toHaveValue("research");
    expect(screen.getByLabelText("启动方案")).toHaveValue("plan-1");
    expect(screen.getByLabelText("数据源 / 工作区")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
    expect(screen.queryByLabelText("可视化前端")).not.toBeInTheDocument();
  });
  it("creates an OpenBB default plan when the environment has OpenBB services", async () => {
    render(<Home />);

    await waitFor(() => expect(screen.getByRole("option", { name: "OpenBB 默认方案" })).toBeInTheDocument());
    expect(screen.getByLabelText("启动方案")).not.toHaveValue("");
  });

  it("passes stored API key names into the source selector when provider metadata is unavailable", async () => {
    vi.mocked(useStudioState).mockReturnValue({
      data: { ...readyData, snapshot: { ...readyData.snapshot, providers: [] } },
      isPending: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    } as never);
    vi.mocked(invoke).mockImplementation(async (command) =>
      command === "get_user_credentials" ? { credentials: { fmp_api_key: "secret" } } : undefined,
    );

    render(<Home />);

    await waitFor(() => expect(screen.getByRole("option", { name: "fmp_api_key" })).toBeInTheDocument());
  });

  it("shows saved service and frontend counts only after opening temporary adjustments", () => {
    seedPlan();
    render(<Home />);
    expect(screen.getByText("方案将启动 1 个服务、打开 1 个前端")).toBeInTheDocument();
    expect(screen.queryByText("OpenBB Workspace")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "调整本次启动" }));
    expect(screen.getByText("OpenBB Workspace")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /OpenBB API/ })).toBeChecked();
  });

  it("starts selected services then opens every selected frontend", async () => {
    seedPlan();
    render(<Home />);
    fireEvent.change(screen.getByLabelText("数据源 / 工作区"), { target: { value: "source:fmp" } });
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    await waitFor(() => expect(startStudioService).toHaveBeenCalledWith("api"));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("open_url_in_window", { url: "https://pro.openbb.co" }));
    expect(JSON.parse(localStorage.getItem("openalice.active-launch.v2") ?? "{}").started).toEqual(["api"]);
  });

  it("applies the selected source before starting services", async () => {
    seedPlan([{ kind: "service", id: "api" }]);
    render(<Home />);
    fireEvent.change(screen.getByLabelText("数据源 / 工作区"), { target: { value: "source:fmp" } });
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("apply_studio_selection", {
      environment: "research",
      provider_ids: ["fmp"],
      workspace_id: null,
      mode: null,
    }));
    expect(startStudioService).toHaveBeenCalledWith("api");
  });

  it("restarts a running service by stopping it before starting it again", async () => {
    seedPlan([{ kind: "service", id: "api" }]);
    vi.mocked(useStudioState).mockReturnValue({
      data: { ...readyData, backends: [{ ...readyData.backends[0], status: "running" }] },
      isPending: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    } as never);
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "重启" }));
    await waitFor(() => expect(stopStudioService).toHaveBeenCalledWith("api"));
    expect(startStudioService).toHaveBeenCalledWith("api");
    expect(vi.mocked(stopStudioService).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(startStudioService).mock.invocationCallOrder[0]);
  });

  it("reuses running services and keeps opening frontends when another service fails", async () => {
    localStorage.setItem("openalice.startup-plans.v1", JSON.stringify({
      version: 1,
      plans: [{ id: "plan-1", environment: "research", name: "研究启动", items: [{ kind: "service", id: "already-running" }, { kind: "service", id: "api" }, { kind: "frontend", id: "frontend:openbb-workspace" }], createdAt: "2026-08-14T00:00:00+00:00", updatedAt: "2026-08-14T00:00:00+00:00" }],
    }));
    vi.mocked(useStudioState).mockReturnValue({ data: { ...readyData, backends: [{ ...readyData.backends[0], id: "already-running", name: "已有服务", status: "running" }, readyData.backends[0]] }, isPending: false, error: null, refetch: vi.fn().mockResolvedValue(undefined) } as never);
    vi.mocked(startStudioService).mockRejectedValue(new Error("启动失败"));
    render(<Home />);
    fireEvent.change(screen.getByLabelText("数据源 / 工作区"), { target: { value: "source:fmp" } });
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("open_url_in_window", { url: "https://pro.openbb.co" }));
    expect(startStudioService).toHaveBeenCalledWith("api");
    expect(screen.getByText(/个失败/)).toBeInTheDocument();
  });
});
