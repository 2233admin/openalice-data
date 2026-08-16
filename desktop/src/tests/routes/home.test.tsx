import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import { Route } from "../../routes/home";
import { useStudioState } from "../../studio/queries";

vi.mock("../../studio/queries", () => ({ useStudioState: vi.fn() }));

const Home = Route.options.component as React.ComponentType;
const readyData = {
  runtime: "openbb",
  service: { state: "running" },
  backends: [],
  extensions: [],
  snapshot: {
    providers: [{
      id: "fmp",
      name: "fmp",
      display_name: "FMP",
      status: "available",
      capability_count: 12,
      capabilities: [],
      credential_fields: [],
    }],
    datasets: [{
      id: "equity.price.historical",
      display_name: "Historical Prices",
      category: "Equity",
      api_path: "/api/v1/equity/price/historical",
      providers: [{ provider_id: "fmp", state: "available" }],
      common_query_fields: [],
      common_data_fields: [],
      provider_specific_query_fields: {},
      provider_specific_fields: {},
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

  it("opens with a target picker instead of an inferred action center", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "选择数据源" })).toBeInTheDocument();
    expect(screen.queryByText("行动中心")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /FMP.*Historical Prices/ })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "打开数据源" })[0]).toHaveAttribute("href", "/data-sources");
  });

  it("exposes one explicit Start action for the selected native target", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("radio", { name: /FMP.*Historical Prices/ }));

    expect(screen.getByRole("link", { name: "使用" })).toHaveAttribute(
      "href",
      "/data-sources/fmp?dataset=equity.price.historical&intent=use",
    );
  });

  it("shows persisted Workspace targets without treating them as native datasets", () => {
    localStorage.setItem("openbb-studio.workspaces.v1", JSON.stringify({
      version: 1,
      workspaces: [{
        id: "workspace-1",
        name: "美股行情",
        createdAt: "2026-08-14T00:00:00+00:00",
        updatedAt: "2026-08-14T00:00:00+00:00",
        members: [{
          providerId: "fmp",
          datasetId: "equity.price.historical",
          nativePath: "/api/v1/equity/price/historical",
          attachedAt: "2026-08-14T00:00:00+00:00",
        }],
        mappings: [],
        comparison: null,
        appliedVersion: null,
      }],
    }));

    render(<Home />);

    expect(screen.getByRole("radio", { name: /组合数据源.*美股行情/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /组合数据源.*美股行情/ }));
    expect(screen.getByRole("link", { name: "详情" })).toHaveAttribute("href", "/data-sources?workspaceId=workspace-1&intent=use");
  });

  it("offers Data Sources when the live snapshot has no targets", () => {
    vi.mocked(useStudioState).mockReturnValue({
      data: {
        ...readyData,
        snapshot: { ...readyData.snapshot, providers: [], datasets: [] },
      },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    render(<Home />);

    expect(screen.getByText("还没有可选择的数据源。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "选择数据源" })).toHaveAttribute("href", "/data-sources");
  });

  it("keeps service readiness as selected-target context", () => {
    vi.mocked(useStudioState).mockReturnValue({
      data: {
        ...readyData,
        service: { state: "stopped", backend: { id: "openbb-api" } },
      },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    render(<Home />);
    expect(within(screen.getByRole("radiogroup", { name: "可选择的数据源" })).getByText("不可用")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /FMP.*Historical Prices/ }));

    expect(screen.getByText("ODP 服务未运行，当前不能确认这个来源可用。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "打开 ODP Backends" })).toHaveAttribute("href", "/backends");
  });

  it("keeps exact recent activity context", () => {
    localStorage.setItem("openbb-studio.activity.v1", JSON.stringify([{
      datasetId: "equity/price/historical",
      providerId: "fmp",
      succeeded: false,
      at: "2026-08-14T01:00:00+00:00",
      message: "凭证未配置",
    }]));

    render(<Home />);

    expect(screen.getByText("使用失败：equity/price/historical")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /使用失败：equity\/price\/historical/ })).toHaveAttribute(
      "href",
      "/data-sources/fmp?dataset=equity%2Fprice%2Fhistorical",
    );
  });

  it("shows stable loading and recovery states", () => {
    vi.mocked(useStudioState).mockReturnValue({
      data: undefined,
      isPending: true,
      error: null,
      refetch: vi.fn(),
    } as never);
    const { unmount } = render(<Home />);
    expect(screen.getByRole("status")).toHaveTextContent("正在读取可选择的数据源");
    unmount();

    vi.mocked(useStudioState).mockReturnValue({
      data: undefined,
      isPending: false,
      error: { message: "Runtime missing", actionRoute: "/advanced?section=runtimes" },
      refetch: vi.fn(),
    } as never);
    render(<Home />);
    expect(screen.getByRole("alert")).toHaveTextContent("暂时无法读取数据源");
    expect(screen.getByRole("link", { name: "检查 ODP Backends" })).toHaveAttribute("href", "/backends");
  });
});
