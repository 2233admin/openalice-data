import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DataSourcesPage } from "../../routes/data-sources.index";
import { WorkspaceDetailPage } from "../../routes/workspaces.$workspaceId";
import { WorkspacesLayout } from "../../routes/workspaces";
import { createWorkspaceFromMembers, attachNativeDataset, openWorkspace } from "../../studio/workspace-store";
import { useStudioState } from "../../studio/queries";
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({ to, search, children }: { to: string; search?: { workspaceId?: string }; children: ReactNode }) => <a href={search?.workspaceId ? `${to}?workspaceId=${search.workspaceId}` : to}>{children}</a>,
    Outlet: () => <div data-testid="route-outlet" />,
    useNavigate: vi.fn(() => vi.fn()),
  };
});

vi.mock("../../studio/queries", () => ({ useStudioState: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const sourceState = {
  runtime: "openbb",
  service: { state: "running" as const },
  extensions: [],
  snapshot: {
    providers: [
      { id: "fmp", name: "fmp", display_name: "FMP", status: "available" as const, capability_count: 1, capabilities: [], credential_fields: [] },
      { id: "yfinance", name: "yfinance", display_name: "YFinance", status: "available" as const, capability_count: 1, capabilities: [], credential_fields: [] },
    ],
    datasets: [
      { id: "equity.price.historical", display_name: "Historical", category: "Equity", python_path: "equity.price.historical", api_path: "/api/v1/equity/price/historical", standard_model: "EquityHistorical", providers: [{ provider_id: "fmp", state: "available" as const }], common_query_fields: [], common_data_fields: [], provider_specific_query_fields: {}, provider_specific_fields: {} },
      { id: "equity.price.quote", display_name: "Quote", category: "Equity", python_path: "equity.price.quote", api_path: "/api/v1/equity/price/quote", standard_model: "EquityQuote", providers: [{ provider_id: "fmp", state: "available" as const }], common_query_fields: [], common_data_fields: [], provider_specific_query_fields: {}, provider_specific_fields: {} },
    ],
    actions: [],
    fetched_at: "2026-08-15T00:00:00.000Z",
    freshness: { status: "fresh" as const, inspected_at: "2026-08-15T00:00:00.000Z", source: "live" as const },
  },
};

function createTestWorkspace(name: string) {
  return createWorkspaceFromMembers(name, [
    { providerId: "fmp", datasetId: "equity.price.historical", nativePath: "/api/v1/equity/price/historical", attachedAt: "2026-08-15T00:00:00.000Z" },
    { providerId: "fmp", datasetId: "equity.price.quote", nativePath: "/api/v1/equity/price/quote", attachedAt: "2026-08-15T00:00:00.000Z" },
  ]);
}

describe("workspace routes", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(invoke).mockImplementation((command) =>
      command === "get_user_credentials"
        ? Promise.resolve({ credentials: { fmp_api_key: "fmp-secret", yfinance_api_key: "yf-secret" } })
        : Promise.resolve(undefined),
    );
    vi.mocked(useStudioState).mockReturnValue({ data: sourceState, isPending: false, error: null } as never);
  });

  it("keeps child routes mounted through the dedicated parent Outlet", () => {
    render(<WorkspacesLayout />);
    expect(screen.getByTestId("route-outlet")).toBeInTheDocument();
  });
  it("keeps native sources inside the unified Data Sources inventory", async () => {
    render(<DataSourcesPage />);
    await waitFor(() => expect(screen.getByText("fmp_api_key")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "数据源" })).toBeInTheDocument();
    expect(screen.getAllByText("全部数据源")).toHaveLength(2);
    expect(screen.queryByText("Historical")).not.toBeInTheDocument();
    expect(screen.queryByText("Quote")).not.toBeInTheDocument();
  });

  it("keeps each category reachable from the inline Data Sources inventory", () => {
    const workspace = createTestWorkspace("Prices");
    render(<DataSourcesPage />);
    expect(screen.getByRole("button", { name: workspace.name })).toBeInTheDocument();
  });

  it("creates a named category from two explicit native sources", async () => {
    render(<DataSourcesPage />);
    await waitFor(() => expect(screen.getByText("fmp_api_key")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("选择 fmp_api_key"));
    fireEvent.click(screen.getByLabelText("选择 yfinance_api_key"));
    fireEvent.click(screen.getByRole("button", { name: "用所选创建分类" }));
    fireEvent.change(screen.getByLabelText("分类名称"), { target: { value: "Prices" } });
    fireEvent.click(screen.getByRole("button", { name: "创建分类" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Prices" })).toBeInTheDocument());
    expect(screen.getByText("已创建分类：Prices")).toBeInTheDocument();
  });
  it("adds an explicit native source to an existing category", async () => {
    const workspace = createWorkspaceFromMembers("Prices", [
      { providerId: "fmp_api_key", datasetId: "__provider__", nativePath: null, attachedAt: "2026-08-15T00:00:00.000Z" },
    ]);
    render(<DataSourcesPage />);
    await waitFor(() => expect(screen.getByText("yfinance_api_key")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("选择 yfinance_api_key"));
    fireEvent.change(screen.getByLabelText("目标分类"), { target: { value: workspace.id } });
    fireEvent.click(screen.getByRole("button", { name: "加入分类" }));
    await waitFor(() => expect(screen.getByText(`已加入分类：${workspace.name}`)).toBeInTheDocument());
    expect(openWorkspace(workspace.id)?.members.some((member) => member.providerId === "yfinance_api_key")).toBe(true);
  });

  it("requires an explicit Provider/dataset choice before attaching", async () => {
    const workspace = createTestWorkspace("Prices");
    render(<WorkspaceDetailPage workspaceId={workspace.id} />);
    expect(screen.getByRole("heading", { name: "成员与来源状态" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("选择 Provider 原生数据集"), { target: { value: "fmp:equity.price.historical" } });
    fireEvent.click(screen.getByRole("button", { name: "附加" }));
    await waitFor(() => expect(screen.getAllByText(/Provider: fmp/)[0]).toBeInTheDocument());
    expect(screen.getAllByText(/原生成员尚未验证统一使用/)[0]).toBeInTheDocument();
    expect(screen.getAllByText("来源可用")[0]).toBeInTheDocument();
  });

  it("reorders and dissolves a persisted composition without deleting native sources", async () => {
    const workspace = createTestWorkspace("Prices");
    render(<WorkspaceDetailPage workspaceId={workspace.id} />);
    fireEvent.click(screen.getAllByRole("button", { name: "下移" })[0]);
    expect(openWorkspace(workspace.id)?.members[0].datasetId).toBe("equity.price.quote");
    fireEvent.click(screen.getByRole("button", { name: "解散组合" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "找不到这个组合数据源" })).toBeInTheDocument());
    expect(openWorkspace(workspace.id)).toBeNull();
  });

  it("marks persisted members unavailable when live source inspection is absent", () => {
    const workspace = createTestWorkspace("Unavailable");
    attachNativeDataset(workspace.id, { providerId: "fmp", datasetId: "equity.price.historical", nativePath: "/api/v1/equity/price/historical", attachedAt: "2026-08-15T00:00:00.000Z" });
    vi.mocked(useStudioState).mockReturnValue({ data: undefined, isPending: false, error: new Error("service stopped") } as never);
    render(<WorkspaceDetailPage workspaceId={workspace.id} />);
    expect(screen.getAllByText("来源不可用")[0]).toBeInTheDocument();
    expect(screen.getByText(/当前来源状态无法读取/)).toBeInTheDocument();
  });

});
