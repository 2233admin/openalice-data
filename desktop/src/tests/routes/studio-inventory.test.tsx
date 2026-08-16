import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { vi } from "vitest";
import { AddDataSourceSelector } from "../../components/AddDataSourceSelector";
import { DataSourcesPage } from "../../routes/data-sources.index";
import { DataSourcesLayout } from "../../routes/data-sources";
import { AddDataSourcePage } from "../../routes/data-sources.add";
import { ExtensionsPage } from "../../routes/extensions";
import { ProviderDetailPage } from "../../routes/data-sources.$providerId";
import { useQueryClient } from "@tanstack/react-query";
import { restartStudioService } from "../../studio/client";
import type * as StudioClient from "../../studio/client";
import { useStudioState } from "../../studio/queries";
import { saveProviderCredentials } from "../../studio/actions";
import { createWorkspaceFromMembers } from "../../studio/workspace-store";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({ to, children, params, search, ...props }: { to: string; children: ReactNode; params?: Record<string, string>; search?: Record<string, string> }) => {
      const path = params ? Object.entries(params).reduce((value, [key, item]) => value.replace(`$${key}`, item), to) : to;
      const query = search ? `?${new URLSearchParams(search).toString()}` : "";
      return <a href={`${path}${query}`} {...props}>{children}</a>;
    },
    Outlet: () => <div data-testid="route-outlet" />,
    useNavigate: vi.fn(() => vi.fn()),
  };
});

vi.mock("../../studio/client", async () => {
  const actual = await vi.importActual<typeof StudioClient>("../../studio/client");
  return {
    ...actual,
    restartStudioService: vi.fn(),
  };
});
vi.mock("../../studio/queries", () => ({ studioStateQueryKey: ["studio", "state"], useStudioState: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: vi.fn() }));
vi.mock("../../studio/actions", () => ({ saveProviderCredentials: vi.fn() }));

const state = {
  runtime: "openbb",
  service: { state: "running" },
  extensions: [{ package: "openbb-fmp", version: "1.2.3", install_method: "pip", channel: "pypi" }],
  snapshot: {
    providers: [{
      id: "fmp",
      name: "fmp",
      display_name: "FMP",
      version: "1.2.3",
      status: "credential_required",
      state_description: "缺少必填凭证，配置后可运行代表性查询。",
      capability_count: 1,
      capabilities: ["equity.price.historical"],
      credential_metadata_status: "known",
      credential_fields: [{ name: "fmp_api_key", required: true, configured: false, secret: true }],
    }],
    datasets: [{
      id: "equity.price.historical",
      display_name: "Historical",
      category: "Equity",
      python_path: "equity.price.historical",
      api_path: "/api/v1/equity/price/historical",
      standard_model: "EquityHistorical",
      providers: [{ provider_id: "fmp", state: "available", state_description: "已加载" }],
      common_query_fields: [{ name: "symbol", type: "str", required: true }],
      common_data_fields: [{ name: "close", type: "float", required: false }],
      response_fields: [{ name: "close", type: "number", description: "收盘价", required: true }],
      provider_specific_query_fields: { fmp: [{ name: "adjustment", type: "str", required: false }] },
      provider_specific_fields: { fmp: [{ name: "change_percent", type: "float", required: false }] },
    }],
    actions: [],
    fetched_at: "2026-08-14T00:00:00+00:00",
    freshness: {
      status: "fresh",
      inspected_at: "2026-08-14T00:00:00+00:00",
      source: "live",
    },
  },
};

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "/data-sources");
  vi.mocked(invoke).mockReset();
  vi.mocked(useStudioState).mockReturnValue({ data: state, isPending: false, error: null, refetch: vi.fn() } as never);
  vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries: vi.fn().mockResolvedValue(undefined) } as never);
  vi.mocked(restartStudioService).mockReset();
  vi.mocked(saveProviderCredentials).mockReset();
  vi.mocked(saveProviderCredentials).mockResolvedValue(true);
});

describe("Studio inventories", () => {
  it("shows each discovered dataset as a real source row with status and actions", () => {
    render(<DataSourcesPage />);
    expect(screen.getByRole("heading", { name: "数据源" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Historical" })).toBeInTheDocument();
    expect(screen.getByText(/FMP · fmp/)).toBeInTheDocument();
    expect(screen.getByText("Dataset/API: equity.price.historical")).toBeInTheDocument();
    expect(screen.getByText("API path: /api/v1/equity/price/historical")).toBeInTheDocument();
    expect(screen.getByText("需要配置凭证后测试")).toBeInTheDocument();
    expect(screen.getByText("0/1 项凭证")).toBeInTheDocument();
    expect(screen.getByText("尚未测试")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "详情" })).toHaveAttribute("href", "/data-sources/fmp?dataset=equity.price.historical");
    expect(screen.getByRole("link", { name: "使用" })).toHaveAttribute("href", "/data-sources/fmp?dataset=equity.price.historical&intent=use");
    expect(screen.getByRole("link", { name: "组合" })).toHaveAttribute("href", "/data-sources?intent=compose&source=fmp%3Aequity.price.historical");
    expect(screen.getByRole("link", { name: "通过 Extensions 添加" })).toHaveAttribute("href", "/extensions");
    expect(screen.getByRole("link", { name: "Historical" })).toHaveAttribute("href", "/data-sources/fmp?dataset=equity.price.historical");
    expect(document.querySelector('a[href^="/query"]')).not.toBeInTheDocument();
  });

  it("shows native and composed sources together with exact persisted member identities", () => {
    createWorkspaceFromMembers("美股行情组合", [{
      providerId: "fmp",
      datasetId: "equity.price.historical",
      nativePath: "/api/v1/equity/price/historical",
      attachedAt: "2026-08-14T00:00:00.000Z",
    }, {
      providerId: "polygon",
      datasetId: "equity.price.quote",
      nativePath: "/api/v1/equity/price/quote",
      attachedAt: "2026-08-14T00:00:00.000Z",
    }]);

    render(<DataSourcesPage />);
    expect(screen.getByRole("link", { name: "Historical" })).toBeInTheDocument();
    const composition = screen.getByTestId("composition-row");
    expect(within(composition).getByText("美股行情组合")).toBeInTheDocument();
    expect(within(composition).getByText(/fmp\/equity\.price\.historical/)).toBeInTheDocument();
    expect(within(composition).getByText(/polygon\/equity\.price\.quote/)).toBeInTheDocument();
    expect(within(composition).getByRole("link", { name: "使用" })).toHaveAttribute("href", expect.stringContaining("intent=use"));
    expect(within(composition).getByRole("link", { name: "详情" })).toBeInTheDocument();
  });

  it("opens composed-source details without exposing the legacy Workspace mapping surface", () => {
    const composition = createWorkspaceFromMembers("美股行情组合", [{
      providerId: "fmp",
      datasetId: "equity.price.historical",
      nativePath: "/api/v1/equity/price/historical",
      attachedAt: "2026-08-14T00:00:00.000Z",
    }, {
      providerId: "polygon",
      datasetId: "equity.price.quote",
      nativePath: "/api/v1/equity/price/quote",
      attachedAt: "2026-08-14T00:00:00.000Z",
    }]);
    render(<DataSourcesPage workspaceId={composition.id} />);
    expect(screen.getByRole("heading", { name: "美股行情组合" })).toBeInTheDocument();
    expect(screen.getByText("fmp / equity.price.historical")).toBeInTheDocument();
    expect(screen.queryByText(/Workspace|映射|兼容性/)).not.toBeInTheDocument();
  });

  it("keeps child routes mounted through the dedicated parent Outlet", () => {
    render(<DataSourcesLayout />);
    expect(screen.getByTestId("route-outlet")).toBeInTheDocument();
  });

  it("keeps partial Provider state and its live explanation visible", () => {
    vi.mocked(useStudioState).mockReturnValue({
      data: {
        ...state,
        snapshot: {
          ...state.snapshot,
          providers: [{
            ...state.snapshot.providers[0],
            status: "partial",
            state_description: "部分数据能力未通过 OpenBB coverage 检查。",
          }],
        },
      },
      isPending: false,
      error: null,
    } as never);
    render(<DataSourcesPage />);
    expect(screen.getByText("部分数据能力未通过 OpenBB coverage 检查。")).toBeInTheDocument();
  });

  it("keeps stale inventory distinct and offers a live recheck", () => {
    const refetch = vi.fn();
    vi.mocked(useStudioState).mockReturnValue({
      data: { ...state, snapshot: { ...state.snapshot, freshness: { status: "stale", inspected_at: "2026-08-13T00:00:00+00:00", source: "cache" } } },
      isPending: false,
      error: null,
      refetch,
    } as never);
    render(<DataSourcesPage />);
    expect(screen.getByRole("heading", { name: "数据源状态待刷新" })).toBeInTheDocument();
    expect(screen.getByText("待刷新")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新检查" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("keeps failed live inspection distinct and maps recovery to an authoritative ODP route", () => {
    vi.mocked(useStudioState).mockReturnValue({
      data: { ...state, snapshot: { ...state.snapshot, freshness: { status: "failed", inspected_at: "2026-08-13T00:00:00+00:00", source: "cache", error: { code: "coverage_failed", message: "coverage 无法读取", action_route: "/advanced?section=logs" } } } },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    render(<DataSourcesPage />);
    expect(screen.getByRole("heading", { name: "实时数据源检查失败" })).toBeInTheDocument();
    expect(screen.getByText(/coverage 无法读取/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "打开负责的 ODP 控制" })).toHaveAttribute("href", "/diagnostics");
  });

  it("does not expose a separate data catalog surface", () => {
    render(<DataSourcesPage />);
    expect(screen.queryByRole("heading", { name: "数据目录" })).not.toBeInTheDocument();
    expect(screen.getByTestId("source-inventory")).toBeInTheDocument();
  });
  it("keeps the generic extension inventory separate from the Provider add flow", () => {
    render(<ExtensionsPage />);
    expect(screen.getByRole("heading", { name: "扩展" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "已安装扩展" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加扩展" })).toBeInTheDocument();
    expect(screen.getByText("openbb-fmp")).toBeInTheDocument();
    expect(screen.getByText(/Provider 的安装入口和能力状态在数据源页面维护/)).toBeInTheDocument();
  });

  it("keeps custom Provider installation inside the data source surface", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }));
    render(<AddDataSourcePage />);
    expect(screen.queryByRole("link", { name: "打开 OpenBB 安装器" })).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "添加自定义 Provider" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Provider 包名" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "安装 Provider" })).toBeInTheDocument();
  });

  it("renders a dedicated data source installation surface", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ packageName: "openbb-yfinance", reprName: "Yahoo Finance", description: "美国市场行情" }],
    }));
    render(<AddDataSourcePage />);
    expect(screen.getByRole("heading", { name: "添加数据源" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "添加自定义 Provider" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "选择数据源" })).toBeInTheDocument();
    expect(screen.getByText("Yahoo Finance")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "安装数据源" })).toBeInTheDocument();
  });

  it("installs only the selected Provider and exposes the restart handoff", async () => {
    const installProvider = vi.fn().mockResolvedValue(undefined);
    render(
      <AddDataSourceSelector
        installedPackages={new Set()}
        onInstallProvider={installProvider}
      />,
    );
    await screen.findByText("Yahoo Finance");
    fireEvent.click(screen.getByRole("button", { name: "安装数据源" }));
    await waitFor(() => expect(installProvider).toHaveBeenCalledWith("openbb-yfinance"));
    expect(screen.getByText(/服务重启并重新发现数据能力后/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /前往系统维护处理 OpenBB 服务/ })).toHaveAttribute("href", "/advanced?section=runtimes");
  });

  it("shows the installed-but-not-applied catalog state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ packageName: "openbb-yfinance", reprName: "Yahoo Finance" }],
    }));
    render(
      <AddDataSourceSelector
        discoveredProviderIds={new Set()}
        installedPackages={new Set(["openbb-yfinance"])}
        onInstallProvider={vi.fn()}
      />,
    );
    expect(await screen.findByText("已安装未应用")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "重启并发现" })).toHaveAttribute("href", "/advanced?section=runtimes");
  });

  it("restarts a running OpenBB service and refreshes discovery after installation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ packageName: "openbb-yfinance", reprName: "Yahoo Finance" }],
    }));
    const refetch = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(useStudioState).mockReturnValue({
      data: { ...state, service: { state: "running", backend: { id: "openbb-api" } } },
      isPending: false,
      error: null,
      refetch,
    } as never);
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === "get_installation_state") return { installation_directory: "C:/OpenBB" };
      if (command === "list_conda_environments") return [{ name: "openbb" }];
      if (command === "install_extensions") return true;
      throw new Error(`Unexpected command: ${command}`);
    });
    vi.mocked(restartStudioService).mockResolvedValue({ id: "openbb-api" } as never);

    render(<AddDataSourcePage />);
    fireEvent.click(await screen.findByRole("button", { name: "安装数据源" }));

    await waitFor(() => expect(invoke).toHaveBeenCalledWith("install_extensions", {
      extensions: ["openbb-yfinance"],
      environment: "openbb",
    }));
    expect(restartStudioService).toHaveBeenCalledWith("openbb-api");
    expect(refetch).toHaveBeenCalled();
    expect(await screen.findByText(/OpenBB 服务已重启并重新发现数据能力/)).toBeInTheDocument();
  });
  it("installs a custom Provider package through the Provider action", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ packageName: "openbb-yfinance", reprName: "Yahoo Finance" }],
    }));
    const installProvider = vi.fn().mockResolvedValue(undefined);
    render(
      <AddDataSourceSelector
        installedPackages={new Set()}
        onInstallProvider={installProvider}
      />,
    );
    await screen.findByText("Yahoo Finance");
    fireEvent.change(screen.getByRole("textbox", { name: "Provider 包名" }), { target: { value: "openbb-custom-provider" } });
    fireEvent.click(screen.getByRole("button", { name: "安装 Provider" }));
    await waitFor(() => expect(installProvider).toHaveBeenCalledWith("openbb-custom-provider"));
    expect(screen.getByText(/openbb-custom-provider 已提交安装/)).toBeInTheDocument();
  });

  it("submits only newly entered credential values through the existing action", async () => {
    window.history.replaceState({}, "", "/data-sources/fmp?tab=credentials");
    render(<ProviderDetailPage providerId="fmp" />);
    const input = screen.getByLabelText(/fmp_api_key/);
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveValue("");
    fireEvent.change(input, { target: { value: "test-value" } });
    fireEvent.click(screen.getByRole("button", { name: "保存凭证" }));
    await waitFor(() => expect(saveProviderCredentials).toHaveBeenCalledWith({ fmp_api_key: "test-value" }));
    expect(await screen.findByText("凭证已保存。请从当前数据源的使用入口验证是否可用。")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "使用数据源" })[0]).toHaveAttribute("href", "/data-sources/fmp?dataset=equity.price.historical&intent=use");
  });

  it("distinguishes a successful empty inspection from failure", () => {
    vi.mocked(useStudioState).mockReturnValue({
      data: {
        ...state,
        snapshot: {
          ...state.snapshot,
          providers: [],
          datasets: [],
          freshness: {
            status: "empty",
            inspected_at: "2026-08-14T00:00:00+00:00",
            source: "live",
          },
        },
      },
      isPending: false,
      error: null,
    } as never);
    render(<DataSourcesPage />);
    expect(screen.getByRole("heading", { name: "实时检查完成，但没有数据源" })).toBeInTheDocument();
    expect(screen.getByText("OpenBB 已完成实时检查，但没有报告数据源。")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "打开 Extensions" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /启动服务/ })).not.toBeInTheDocument();
  });

  it("keeps unavailable service distinct and hands repair to ODP Backends", () => {
    vi.mocked(useStudioState).mockReturnValue({
      data: {
        ...state,
        service: { state: "stopped", backend: { id: "openbb-api" } },
        snapshot: {
          ...state.snapshot,
          providers: [],
          datasets: [],
          freshness: { status: "not_inspected", inspected_at: null, source: "none" },
        },
      },
      isPending: false,
      error: null,
    } as never);

    render(<DataSourcesPage />);
    expect(screen.getByRole("heading", { name: "ODP 服务不可用" })).toBeInTheDocument();
    expect(screen.getByText("数据源清单暂不可用；请到 ODP Backends 查看运行状态。")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "打开 ODP Backends" })[0]).toHaveAttribute("href", "/backends");
    expect(screen.queryByRole("button", { name: /启动服务/ })).not.toBeInTheDocument();
  });

  it("announces inventory loading without rendering fake source rows", () => {
    vi.mocked(useStudioState).mockReturnValue({ data: undefined, isPending: true, error: null } as never);
    render(<DataSourcesPage />);
    expect(screen.getByRole("heading", { name: "正在检查数据源" })).toBeInTheDocument();
    expect(screen.queryByTestId("source-inventory")).not.toBeInTheDocument();
  });

  it("uses the shared page failure state instead of showing an empty inventory", () => {
    vi.mocked(useStudioState).mockReturnValue({
      data: undefined,
      isPending: false,
      error: new Error("OpenBB coverage 无法读取"),
    } as never);
    render(<DataSourcesPage />);
    expect(screen.getByRole("heading", { name: "数据源检查失败" })).toBeInTheDocument();
    expect(screen.getByText("OpenBB coverage 无法读取")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重新检查" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "打开 ODP Logs" })).toHaveAttribute("href", "/diagnostics");
    expect(screen.queryByRole("heading", { name: "OpenBB 没有报告数据源" })).not.toBeInTheDocument();
  });
});
