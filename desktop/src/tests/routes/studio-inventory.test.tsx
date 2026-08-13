import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { DataSourcesPage } from "../../routes/data-sources";
import { DataCatalogPage } from "../../routes/data-catalog";
import { ExtensionsPage } from "../../routes/extensions";
import { ProviderDetailPage } from "../../routes/data-sources.$providerId";
import { useQueryClient } from "@tanstack/react-query";
import { useStudioState } from "../../studio/queries";

vi.mock("../../studio/queries", () => ({ useStudioState: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: vi.fn() }));

const state = {
  runtime: "openbb",
  service: { state: "running" },
  extensions: [{ package: "openbb-fmp", version: "1.2.3", install_method: "pip", channel: "pypi" }],
  snapshot: {
    providers: [{ id: "fmp", name: "fmp", display_name: "FMP", version: "1.2.3", status: "credential_required", capability_count: 1, capabilities: ["equity.price.historical"], credential_fields: [{ name: "fmp_api_key", required: true, configured: false, secret: true }] }],
    datasets: [{ id: "equity.price.historical", display_name: "Historical", category: "Equity", python_path: "equity.price.historical", api_path: "/api/v1/equity/price/historical", standard_model: "EquityHistorical", providers: [{ provider_id: "fmp", state: "available" }], common_query_fields: [{ name: "symbol", type: "str", required: true }], common_data_fields: [{ name: "close", type: "float", required: false }], provider_specific_query_fields: { fmp: [] }, provider_specific_fields: { fmp: [{ name: "change_percent", type: "float", required: false }] } }],
    actions: [], fetched_at: "2026-08-14T00:00:00+00:00",
  },
};

beforeEach(() => {
  localStorage.clear();
  vi.mocked(useStudioState).mockReturnValue({ data: state, isPending: false, error: null } as never);
  vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries: vi.fn() } as never);
});

describe("Studio inventories", () => {
  it("shows provider state from the Inspector", () => {
    render(<DataSourcesPage />);
    expect(screen.getByRole("heading", { name: "数据源" })).toBeInTheDocument();
    expect(screen.getByText("需要凭证")).toBeInTheDocument();
    expect(screen.getByText("尚未测试")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "配置" })).toHaveAttribute("href", "/data-sources/fmp");
  });

  it("shows common and provider-specific dataset fields", () => {
    render(<DataCatalogPage />);
    expect(screen.getByRole("heading", { name: "数据目录" })).toBeInTheDocument();
    expect(screen.getByText("close")).toBeInTheDocument();
    expect(screen.getByText("change_percent")).toBeInTheDocument();
  });

  it("shows installed extensions from the selected runtime", () => {
    render(<ExtensionsPage />);
    expect(screen.getByText("FMP")).toBeInTheDocument();
    expect(screen.getByText("1.2.3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "打开底层扩展管理" })).toHaveAttribute("href", "/advanced?section=extensions");
  });

  it("renders Registry-owned credential fields on provider details", () => {
    render(<ProviderDetailPage providerId="fmp" />);
    expect(screen.getByRole("heading", { name: "FMP" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "凭证" }));
    expect(screen.getByLabelText("fmp_api_key")).toHaveAttribute("type", "password");
    expect(screen.getByRole("link", { name: "运行测试查询" })).toHaveAttribute("href", "/playground?provider=fmp");
  });
});
