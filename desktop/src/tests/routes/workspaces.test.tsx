import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { WorkspacesPage } from "../../routes/workspaces.index";
import { WorkspaceDetailPage } from "../../routes/workspaces.$workspaceId";
import { WorkspacesLayout } from "../../routes/workspaces";
import { attachNativeDataset, createWorkspace } from "../../studio/workspace-store";
import { useStudioState } from "../../studio/queries";

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
    Outlet: () => <div data-testid="route-outlet" />,
    useNavigate: vi.fn(() => vi.fn()),
  };
});

vi.mock("../../studio/queries", () => ({ useStudioState: vi.fn() }));

const sourceState = {
  runtime: "openbb",
  service: { state: "running" as const },
  extensions: [],
  snapshot: {
    providers: [{ id: "fmp", name: "fmp", display_name: "FMP", status: "available" as const, capability_count: 1, capabilities: [], credential_fields: [] }],
    datasets: [{ id: "equity.price.historical", display_name: "Historical", category: "Equity", python_path: "equity.price.historical", api_path: "/api/v1/equity/price/historical", standard_model: "EquityHistorical", providers: [{ provider_id: "fmp", state: "available" as const }], common_query_fields: [], common_data_fields: [], provider_specific_query_fields: {}, provider_specific_fields: {} }],
    actions: [],
    fetched_at: "2026-08-15T00:00:00.000Z",
  },
};

describe("workspace routes", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(useStudioState).mockReturnValue({ data: sourceState, isPending: false, error: null } as never);
  });

  it("keeps child routes mounted through the dedicated parent Outlet", () => {
    render(<WorkspacesLayout />);
    expect(screen.getByTestId("route-outlet")).toBeInTheDocument();
  });

  it("explains the next action for an empty workspace list", () => {
    render(<WorkspacesPage />);
    expect(screen.getByRole("heading", { name: "工作区" })).toBeInTheDocument();
    expect(screen.getByTestId("workspace-empty-state")).toHaveTextContent("先创建一个工作区");
  });

  it("links each workspace to its concrete detail route", () => {
    const workspace = createWorkspace("Prices");
    render(<WorkspacesPage />);
    expect(screen.getByRole("link", { name: "Prices" })).toHaveAttribute("href", `/workspaces/${workspace.id}`);
  });

  it("requires an explicit Provider/dataset choice before attaching", async () => {
    const workspace = createWorkspace("Prices");
    render(<WorkspaceDetailPage workspaceId={workspace.id} />);
    expect(screen.getByTestId("workspace-member-empty")).toHaveTextContent("选择一个已发现的数据集");
    fireEvent.change(screen.getByLabelText("选择 Provider 原生数据集"), { target: { value: "fmp:equity.price.historical" } });
    fireEvent.click(screen.getByRole("button", { name: "附加" }));
    await waitFor(() => expect(screen.getByText(/Provider: fmp/)).toBeInTheDocument());
    expect(screen.getByText(/映射：未验证/)).toBeInTheDocument();
    expect(screen.getByText("来源可用")).toBeInTheDocument();
  });
  it("marks persisted members unavailable when live source inspection is absent", () => {
    const workspace = createWorkspace("Unavailable");
    attachNativeDataset(workspace.id, { providerId: "fmp", datasetId: "equity.price.historical", nativePath: "/api/v1/equity/price/historical", attachedAt: "2026-08-15T00:00:00.000Z" });
    vi.mocked(useStudioState).mockReturnValue({ data: undefined, isPending: false, error: new Error("service stopped") } as never);
    render(<WorkspaceDetailPage workspaceId={workspace.id} />);
    expect(screen.getByText("来源不可用")).toBeInTheDocument();
    expect(screen.getByText(/当前来源状态无法读取/)).toBeInTheDocument();
  });
});
