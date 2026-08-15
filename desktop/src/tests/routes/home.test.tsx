import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { Route } from "../../routes/home";
import { startStudioService } from "../../studio/client";
import type * as StudioClient from "../../studio/client";
import { useStudioState } from "../../studio/queries";

vi.mock("../../studio/client", async () => {
  const actual = await vi.importActual<typeof StudioClient>("../../studio/client");
  return { ...actual, startStudioService: vi.fn() };
});
vi.mock("../../studio/queries", () => ({ useStudioState: vi.fn() }));

const Home = Route.options.component as React.ComponentType;
const readyData = {
  runtime: "openbb",
  service: { state: "running" },
  backends: [
    { id: "openbb-api", name: "OpenBB API", command: "openbb-api", environment: "openbb", status: "running" },
    { id: "openbb-mcp", name: "OpenBB MCP", command: "openbb-mcp", environment: "openbb", status: "stopped" },
  ],
  extensions: [],
  snapshot: {
    providers: [{
      id: "fmp",
      name: "fmp",
      display_name: "FMP",
      status: "credential_required",
      capability_count: 12,
      capabilities: [],
      credential_fields: [],
    }],
    datasets: Array.from({ length: 4 }, (_, index) => ({ id: `dataset-${index}` })),
    actions: [{
      id: "credential:fmp",
      severity: "warning",
      title: "FMP 凭证缺失，相关查询会失败",
      description: "添加 FMP 凭证后再运行代表性查询。",
      entity_type: "credential",
      entity_id: "fmp",
      action_label: "添加凭证",
      action_route: "/data-sources/fmp?tab=credentials",
    }],
    fetched_at: "2026-08-14T00:00:00+00:00",
    freshness: {
      status: "fresh",
      inspected_at: "2026-08-14T00:00:00+00:00",
      source: "live",
    },
  },
};

describe("Home", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(useStudioState).mockReturnValue({
      data: readyData,
      isPending: false,
      error: null,
      refetch: vi.fn(),
    } as never);
  });

  it("groups OpenBB API and MCP under one service-management surface", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "OpenBB 服务" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "OpenBB API" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "OpenBB MCP" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "打开服务管理 →" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "启动服务" })).toBeInTheDocument();
    expect(screen.getByText("未运行")).toBeInTheDocument();
    expect(screen.getByText("决定当前运行环境启动哪些 OpenBB 服务。")).toBeInTheDocument();
    expect(screen.queryByText(/提供 OpenBB 原生数据目录/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "打开运行环境 →" })).toHaveAttribute("href", "/environments");
  });

  it("uses a live action as the single next action and preserves its entity route", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "行动中心" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "FMP 凭证缺失，相关查询会失败" })).toBeInTheDocument();
    expect(screen.getByText("影响对象：凭证 · fmp")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "添加凭证" })).toHaveAttribute("href", "/data-sources/fmp?tab=credentials");
    expect(screen.getByText("1 个")).toBeInTheDocument();
    expect(screen.getByText("4 个")).toBeInTheDocument();
  });

  it("starts the managed service in place from the action center", async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useStudioState).mockReturnValue({
      data: {
        ...readyData,
        service: { state: "stopped", backend: { id: "openbb-api" } },
        snapshot: {
          ...readyData.snapshot,
          providers: [],
          datasets: [],
          actions: [{
            id: "service:stopped",
            severity: "warning",
            title: "查询服务未运行",
            description: "启动后才能查询。",
            entity_type: "service",
            action_label: "Start service",
            action_route: "/backends",
          }],
        },
      },
      isPending: false,
      error: null,
      refetch,
    } as never);
    vi.mocked(startStudioService).mockResolvedValue({ id: "openbb-api" } as never);

    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "Start service" }));

    await waitFor(() => expect(startStudioService).toHaveBeenCalledWith("openbb-api"));
    expect(refetch).toHaveBeenCalled();
    expect(window.location.pathname).toBe("/");
  });

  it("shows stable empty states for secondary actions and recent activity", () => {
    vi.mocked(useStudioState).mockReturnValue({
      data: {
        ...readyData,
        snapshot: { ...readyData.snapshot, actions: [] },
      },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    render(<Home />);

    expect(screen.getByRole("link", { name: "开始查询" })).toHaveAttribute("href", "/query");
    expect(screen.getByText("没有其他阻塞项。你可以继续当前的下一步操作。")).toBeInTheDocument();
    expect(screen.getByText("还没有活动。运行一次查询后，这里会保留数据集和数据源上下文。")).toBeInTheDocument();
  });

  it("keeps dataset and provider context on recent failed activity", () => {
    localStorage.setItem("openbb-studio.activity.v1", JSON.stringify([{
      datasetId: "equity/price/historical",
      providerId: "fmp",
      succeeded: false,
      at: "2026-08-14T01:00:00+00:00",
      message: "凭证未配置",
    }]));

    render(<Home />);

    expect(screen.getByText("查询失败：equity/price/historical")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /查询失败：equity\/price\/historical/ })).toHaveAttribute(
      "href",
      "/query?dataset=equity%2Fprice%2Fhistorical&provider=fmp",
    );
  });

  it("shows a stable loading state", () => {
    vi.mocked(useStudioState).mockReturnValue({
      data: undefined,
      isPending: true,
      error: null,
      refetch: vi.fn(),
    } as never);

    render(<Home />);

    expect(screen.getByRole("status")).toHaveTextContent("正在检查现在能做什么");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows an actionable recovery state", () => {
    vi.mocked(useStudioState).mockReturnValue({
      data: undefined,
      isPending: false,
      error: { message: "Runtime missing", actionRoute: "/advanced?section=runtimes" },
      refetch: vi.fn(),
    } as never);

    render(<Home />);

    expect(screen.getByRole("alert")).toHaveTextContent("先恢复 OpenBB 运行环境");
    expect(screen.getByRole("link", { name: "检查运行环境" })).toHaveAttribute("href", "/advanced?section=runtimes");
    expect(screen.getByRole("button", { name: "重新检查" })).toBeInTheDocument();
  });
});
