import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import type * as Router from "@tanstack/react-router";
import { EnvironmentExtensionsPage } from "../../routes/environment-extensions";
import { useStudioState } from "../../studio/queries";

vi.mock("../../studio/queries", () => ({ useStudioState: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(() => Promise.resolve({ extensions: [] })) }));
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof Router>("@tanstack/react-router");
  return { ...actual, useSearch: () => ({ tab: "plans" }) };
});

const data = {
  runtime: "research",
  runtimes: [{ name: "openbb" }, { name: "research" }],
  backends: [{ id: "api", name: "OpenBB API", environment: "research", status: "stopped", command: "openbb-api" }],
  extensions: [],
  service: { state: "stopped" },
  snapshot: { providers: [], datasets: [], actions: [], fetched_at: "2026-08-14T00:00:00+00:00", freshness: { status: "empty", inspected_at: "2026-08-14T00:00:00+00:00", source: "live" } },
};

const Page = EnvironmentExtensionsPage as React.ComponentType;

describe("Environment and Extensions surface", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(useStudioState).mockReturnValue({ data, isPending: false, error: null, refetch: vi.fn() } as never);
  });

  it("keeps startup plans, services, and extensions in one environment context", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { name: "环境与扩展" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "启动方案" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "服务" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "扩展" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "openbb" })).toBeInTheDocument();
  });

  it("creates a grouped startup plan without exposing service configuration fields", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "添加启动方案" }));
    fireEvent.change(screen.getByLabelText("名称"), { target: { value: "研究方案" } });
    fireEvent.click(screen.getByLabelText("OpenBB API"));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(screen.getByText("研究方案")).toBeInTheDocument();
    expect(screen.queryByLabelText("启动命令")).not.toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem("openalice.startup-plans.v1") ?? "{}");
    expect(stored.plans.find((plan: { name: string }) => plan.name === "研究方案").items).toEqual([{ kind: "service", id: "api" }]);
  });
  it("migrates legacy auto-start services into a default plan and disables the flag", async () => {
    vi.mocked(useStudioState).mockReturnValue({
      data: { ...data, backends: [{ ...data.backends[0], auto_start: true }] },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    render(<Page />);
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("update_backend_service", expect.objectContaining({
      backend: expect.objectContaining({ id: "api", auto_start: false }),
    })));
    const stored = JSON.parse(localStorage.getItem("openalice.startup-plans.v1") ?? "{}");
    expect(stored.plans.find((plan: { name: string }) => plan.name === "OpenBB 默认方案").items).toEqual(expect.arrayContaining([
      { kind: "service", id: "api" },
      { kind: "frontend", id: "frontend:openbb-workspace" },
    ]));
  });
  it("exposes complete backend configuration fields in the service editor", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("tab", { name: "服务" }));
    fireEvent.click(screen.getByRole("button", { name: "编辑" }));
    expect(screen.getByLabelText("工作目录")).toBeInTheDocument();
    expect(screen.getByLabelText("环境变量文件")).toBeInTheDocument();
    expect(screen.getByLabelText("环境变量")).toBeInTheDocument();
    expect(screen.getByLabelText("主机")).toBeInTheDocument();
    expect(screen.getByLabelText("端口")).toBeInTheDocument();
    expect(screen.getByLabelText("HTTPS URL")).toBeInTheDocument();
  });

  it("puts Notebook lifecycle controls and logs in the extension surface", async () => {
    vi.mocked(invoke).mockImplementation(async (command) => {
      if (command === "get_environment_extensions") {
        return { extensions: [{ package: "jupyterlab", version: "4.0.0", install_method: "pip", channel: "pypi", role: "notebook", display_name: "Python Notebook" }] };
      }
      return { extensions: [] };
    });
    render(<Page />);
    fireEvent.click(screen.getByRole("tab", { name: "扩展" }));
    await waitFor(() => expect(screen.getByText("Python Notebook")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "启动" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "日志" })).toBeInTheDocument();
  });
});
