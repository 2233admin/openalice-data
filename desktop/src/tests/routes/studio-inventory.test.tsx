import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { AddDataSourceSelector } from "../../components/AddDataSourceSelector";
import { DataSourcesPage } from "../../routes/data-sources.index";
import { DataSourcesLayout } from "../../routes/data-sources";
import { AddDataSourcePage } from "../../routes/data-sources.add";
import { DataCatalogPage } from "../../routes/data-catalog";
import { ExtensionsPage } from "../../routes/extensions";
import { ProviderDetailPage } from "../../routes/data-sources.$providerId";
import { useQueryClient } from "@tanstack/react-query";
import { startStudioService } from "../../studio/client";
import type * as StudioClient from "../../studio/client";
import { useStudioState } from "../../studio/queries";
import { saveProviderCredentials } from "../../studio/actions";

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
  return { ...actual, startStudioService: vi.fn() };
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
  vi.mocked(useStudioState).mockReturnValue({ data: state, isPending: false, error: null, refetch: vi.fn() } as never);
  vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries: vi.fn().mockResolvedValue(undefined) } as never);
  vi.mocked(startStudioService).mockReset();
  vi.mocked(saveProviderCredentials).mockReset();
  vi.mocked(saveProviderCredentials).mockResolvedValue(true);
});

describe("Studio inventories", () => {
  it("shows live Provider identity, normalized state, credentials, test history, and concrete actions", () => {
    render(<DataSourcesPage />);
    expect(screen.getByRole("heading", { name: "数据源" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "FMP" })).toBeInTheDocument();
    expect(screen.getByText(/Provider fmp · fmp/)).toBeInTheDocument();
    expect(screen.getByText("需要凭证")).toBeInTheDocument();
    expect(screen.getByText("缺少 1 项")).toBeInTheDocument();
    expect(screen.getByText("1 项")).toBeInTheDocument();
    expect(screen.getByText("尚未测试")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "打开" })).toHaveAttribute("href", "/data-sources/fmp");
    expect(screen.getByRole("link", { name: "添加数据源" })).toHaveAttribute("href", "/data-sources/add");
    expect(screen.getByRole("link", { name: "测试" })).toHaveAttribute("href", "/query?provider=fmp");
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
    expect(screen.getByText("部分可用")).toBeInTheDocument();
    expect(screen.getByText("部分数据能力未通过 OpenBB coverage 检查。")).toBeInTheDocument();
  });

  it("shows native identity, standard model, declared metadata, Provider fields, and query links", () => {
    render(<DataCatalogPage />);
    expect(screen.getByRole("heading", { name: "数据目录" })).toBeInTheDocument();
    expect(screen.getByText("equity.price.historical")).toBeInTheDocument();
    expect(screen.getByText("/api/v1/equity/price/historical")).toBeInTheDocument();
    expect(screen.getByText("EquityHistorical")).toBeInTheDocument();
    expect(screen.getByText("adjustment")).toBeInTheDocument();
    expect(screen.getByText("change_percent")).toBeInTheDocument();
    expect(screen.getByText("收盘价")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "用 fmp 查询" })).toHaveAttribute(
      "href",
      "/query?dataset=equity.price.historical&provider=fmp",
    );
  });
  it("keeps the full OpenBB extension installer and installed Provider packages", () => {
    render(<ExtensionsPage />);
    expect(screen.getByRole("heading", { name: "扩展" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "已安装扩展" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加扩展" })).toBeInTheDocument();
    expect(screen.getByText("openbb-fmp")).toBeInTheDocument();
    expect(screen.getByText(/OpenBB 原生扩展能力/)).toBeInTheDocument();
  });

  it("links custom Provider installation to the native OpenBB installer", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }));
    render(<AddDataSourcePage />);
    expect(screen.getByRole("link", { name: "打开 OpenBB 安装器" })).toHaveAttribute("href", "/extensions");
    expect(screen.getByRole("link", { name: "添加自定义 Provider" })).toHaveAttribute("href", "/extensions");
  });

  it("renders a dedicated data source installation surface", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ packageName: "openbb-yfinance", reprName: "Yahoo Finance", description: "美国市场行情" }],
    }));
    render(<AddDataSourcePage />);
    expect(screen.getByRole("heading", { name: "添加数据源" })).toBeInTheDocument();
    const customProviderHeading = screen.getByRole("heading", { name: "不在官方目录中的 Provider" });
    const catalogHeading = await screen.findByRole("heading", { name: "选择数据源" });
    expect(customProviderHeading.compareDocumentPosition(catalogHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
    expect(screen.getByRole("link", { name: /前往服务管理重启 OpenBB 服务/ })).toHaveAttribute("href", "/backends");
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
    expect(await screen.findByText("凭证已保存。请运行一次代表性查询验证是否可用。")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "运行测试查询" })[0]).toHaveAttribute("href", "/query?provider=fmp");
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
    const view = render(<DataSourcesPage />);
    expect(screen.getByRole("heading", { name: "OpenBB 没有报告数据源" })).toBeInTheDocument();
    expect(screen.getByText(/这不是检查失败/)).toBeInTheDocument();
    view.unmount();
    render(<DataCatalogPage />);
    expect(screen.getByRole("heading", { name: "OpenBB 没有报告原生数据集" })).toBeInTheDocument();
  });

  it("starts the managed service in place from the data source inventory", async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useStudioState).mockReturnValue({
      data: {
        ...state,
        service: { state: "stopped", backend: { id: "openbb-api" } },
        snapshot: {
          ...state.snapshot,
          providers: [],
          datasets: [],
          freshness: { status: "not_inspected", inspected_at: null, source: "none" },
          actions: [{
            id: "service:stopped",
            state: "setup_required",
            severity: "warning",
            title: "服务已停止",
            description: "启动后检查",
            entity_type: "service",
            action_label: "启动服务",
            action_route: "/backends",
          }],
        },
      },
      isPending: false,
      error: null,
      refetch,
    } as never);
    vi.mocked(startStudioService).mockResolvedValue({ id: "openbb-api" } as never);

    render(<DataSourcesPage />);
    fireEvent.click(screen.getByRole("button", { name: "启动服务" }));

    await waitFor(() => expect(startStudioService).toHaveBeenCalledWith("openbb-api"));
    expect(refetch).toHaveBeenCalled();
    expect(window.location.pathname).toBe("/data-sources");
  });

  it("uses the shared page failure state instead of showing an empty inventory", () => {
    vi.mocked(useStudioState).mockReturnValue({
      data: undefined,
      isPending: false,
      error: new Error("OpenBB coverage 无法读取"),
    } as never);
    render(<DataSourcesPage />);
    expect(screen.getByText("OpenBB 需要处理")).toBeInTheDocument();
    expect(screen.getByText("OpenBB coverage 无法读取")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "OpenBB 没有报告数据源" })).not.toBeInTheDocument();
  });
});
