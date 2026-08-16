import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { vi } from "vitest";
import { DataSourcesPage } from "../../routes/data-sources.index";
import { createWorkspaceFromMembers } from "../../studio/workspace-store";
import { useStudioState } from "../../studio/queries";

vi.mock("../../studio/queries", () => ({ useStudioState: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ message: vi.fn() }));

const snapshot = {
  providers: [
    { id: "yfinance", name: "yfinance", display_name: "YFinance", status: "available", capability_count: 1, capabilities: [], credential_fields: [] },
  ],
  datasets: [],
  actions: [],
  fetched_at: "2026-08-14T00:00:00+00:00",
  freshness: { status: "fresh", inspected_at: "2026-08-14T00:00:00+00:00", source: "live" },
};

function ready(overrides: Record<string, unknown> = {}) {
  return {
    data: { service: { state: "running" }, snapshot, ...overrides },
    isPending: false,
    error: null,
    refetch: vi.fn(),
  };
}

describe("Data Sources route inventory", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(invoke).mockImplementation((command) =>
      command === "get_user_credentials"
        ? Promise.resolve({ credentials: { fmp_api_key: "secret", fred_api_key: "fred-secret" } })
        : Promise.resolve(undefined),
    );
    vi.mocked(useStudioState).mockReturnValue(ready() as never);
  });

  it("shows one compact API key row per native data source", async () => {
    render(<DataSourcesPage />);

    await waitFor(() => expect(screen.getByText("fmp_api_key")).toBeInTheDocument());
    expect(screen.getByText("fred_api_key")).toBeInTheDocument();
    expect(screen.getAllByText("全部数据源")).toHaveLength(2);
    expect(screen.getByText("YFinance")).toBeInTheDocument();
    expect(screen.getByText("内置数据源")).toBeInTheDocument();
    expect(screen.queryByText("Financial Modeling Prep")).not.toBeInTheDocument();
    expect(screen.queryByText("Historical")).not.toBeInTheDocument();
    expect(screen.queryByText("Quote")).not.toBeInTheDocument();
    expect(invoke).toHaveBeenCalledWith("get_user_credentials");
  });
  it("keeps unassigned credential rows visible in 未分类", async () => {
    render(<DataSourcesPage />);
    await waitFor(() => expect(screen.getByText("fmp_api_key")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "未分类" }));

    expect(screen.getByText("fmp_api_key")).toBeInTheDocument();
    expect(screen.getByText("fred_api_key")).toBeInTheDocument();
  });
  it("groups required credentials under the native provider identity", async () => {
    const groupedSnapshot = {
      ...snapshot,
      providers: [
        ...snapshot.providers,
        {
          id: "fmp",
          name: "fmp",
          display_name: "Financial Modeling Prep",
          status: "available",
          capability_count: 1,
          capabilities: [],
          credential_fields: [
            { name: "fmp_api_key", required: true },
            { name: "fmp_secret", required: true },
          ],
        },
      ],
    };
    vi.mocked(invoke).mockImplementation((command) =>
      command === "get_user_credentials"
        ? Promise.resolve({ credentials: { fmp_api_key: "secret", fmp_secret: "secret-2" } })
        : Promise.resolve(undefined),
    );
    vi.mocked(useStudioState).mockReturnValue(ready({ snapshot: groupedSnapshot }) as never);

    render(<DataSourcesPage />);

    await waitFor(() => expect(screen.getByText("Financial Modeling Prep")).toBeInTheDocument());
    expect(screen.getByText("2/2 项凭证")).toBeInTheDocument();
    expect(screen.queryByText("fmp_api_key")).not.toBeInTheDocument();
  });

  it("maps legacy credential-field memberships to the grouped source", async () => {
    const workspace = createWorkspaceFromMembers("Legacy", [{
      providerId: "fmp_api_key",
      datasetId: "__credential__",
      nativePath: null,
      attachedAt: "2026-08-15T00:00:00.000Z",
    }]);
    const groupedSnapshot = {
      ...snapshot,
      providers: [
        ...snapshot.providers,
        {
          id: "fmp",
          name: "fmp",
          display_name: "Financial Modeling Prep",
          status: "available",
          capability_count: 1,
          capabilities: [],
          credential_fields: [{ name: "fmp_api_key", required: true }],
        },
      ],
    };
    vi.mocked(invoke).mockImplementation((command) =>
      command === "get_user_credentials"
        ? Promise.resolve({ credentials: { fmp_api_key: "secret" } })
        : Promise.resolve(undefined),
    );
    vi.mocked(useStudioState).mockReturnValue(ready({ snapshot: groupedSnapshot }) as never);

    render(<DataSourcesPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: workspace.name })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: workspace.name }));

    expect(screen.getByText("Financial Modeling Prep")).toBeInTheDocument();
    expect(screen.queryByText("fmp_api_key")).not.toBeInTheDocument();
  });

  it("creates a flat category with selected native sources", async () => {
    render(<DataSourcesPage />);
    await waitFor(() => expect(screen.getByText("fmp_api_key")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("checkbox", { name: "选择 fmp_api_key" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "选择 YFinance" }));
    fireEvent.click(screen.getByRole("button", { name: "用所选创建分类" }));
    fireEvent.change(screen.getByLabelText("分类名称"), { target: { value: "美股来源" } });
    fireEvent.click(screen.getByRole("button", { name: "创建分类" }));

    expect(screen.getByRole("button", { name: "美股来源" })).toBeInTheDocument();
    expect(screen.getByText("已创建分类：美股来源")).toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem("openbb-studio.workspaces.v1") ?? "{}").workspaces[0];
    expect(stored.members.map((member: { providerId: string }) => member.providerId)).toEqual(["fmp_api_key", "yfinance"]);
    expect(stored.members[1].datasetId).toBe("__provider__");
  });

  it("filters the flat inventory by category without mutating source identity", async () => {
    render(<DataSourcesPage />);
    await waitFor(() => expect(screen.getByText("fmp_api_key")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("checkbox", { name: "选择 fmp_api_key" }));
    fireEvent.click(screen.getByRole("button", { name: "用所选创建分类" }));
    fireEvent.change(screen.getByLabelText("分类名称"), { target: { value: "研究来源" } });
    fireEvent.click(screen.getByRole("button", { name: "创建分类" }));
    fireEvent.click(screen.getByRole("button", { name: "研究来源" }));

    expect(screen.getByText("fmp_api_key")).toBeInTheDocument();
    expect(screen.queryByText("fred_api_key")).not.toBeInTheDocument();
  });

  it("keeps loading, service-unavailable, stale, and failed evidence distinct", () => {
    vi.mocked(useStudioState).mockReturnValue({ data: undefined, isPending: true, error: null, refetch: vi.fn() } as never);
    const { unmount } = render(<DataSourcesPage />);
    expect(screen.getByRole("status")).toHaveTextContent("正在读取数据源");
    unmount();

    vi.mocked(useStudioState).mockReturnValue(ready({ service: { state: "stopped", backend: { id: "openbb" } } }) as never);
    const stopped = render(<DataSourcesPage />);
    expect(screen.getByRole("status")).toHaveTextContent("数据服务未运行");
    expect(screen.getByRole("link", { name: "检查服务" })).toHaveAttribute("href", "/environment-extensions?tab=services");
    stopped.unmount();

    vi.mocked(useStudioState).mockReturnValue(ready({ snapshot: { ...snapshot, freshness: { ...snapshot.freshness, status: "stale" } } }) as never);
    const stale = render(<DataSourcesPage />);
    expect(screen.getByRole("status")).toHaveTextContent("缓存来源");
    stale.unmount();

    vi.mocked(useStudioState).mockReturnValue(ready({ snapshot: { ...snapshot, freshness: { ...snapshot.freshness, status: "failed", error: { code: "inspection", message: "实时检查失败" } } } }) as never);
    render(<DataSourcesPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("实时来源检查失败");
  });
});