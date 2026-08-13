import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { PlaygroundPage } from "../../routes/playground";
import { useStudioState } from "../../studio/queries";

vi.mock("../../studio/queries", () => ({ useStudioState: vi.fn() }));

describe("Playground", () => {
  it("builds Registry fields, calls the active API, and displays rows", async () => {
    vi.mocked(useStudioState).mockReturnValue({ data: { runtime: "openbb", service: { state: "running", backend: { url: "http://127.0.0.1:6900" } }, extensions: [], snapshot: { providers: [], actions: [], fetched_at: "2026-08-14T00:00:00Z", datasets: [{ id: "equity.price.historical", display_name: "Historical", category: "Equity", python_path: "equity.price.historical", api_path: "/api/v1/equity/price/historical", standard_model: "EquityHistorical", providers: [{ provider_id: "yfinance", state: "available" }], common_query_fields: [{ name: "symbol", type: "str", description: "Ticker", required: true }], provider_specific_query_fields: { yfinance: [{ name: "interval", type: "Literal", required: false, choices: ["1d", "1h"] }] }, common_data_fields: [], provider_specific_fields: { yfinance: [] } }] } }, isPending: false, error: null } as never);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ results: [{ symbol: "AAPL", close: 100 }] }), { status: 200 })));
    render(<PlaygroundPage />);
    fireEvent.change(screen.getByLabelText(/symbol/), { target: { value: "AAPL" } });
    fireEvent.change(screen.getByLabelText(/interval/), { target: { value: "1d" } });
    fireEvent.click(screen.getByRole("button", { name: "运行查询" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "raw" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "raw" }));
    expect(screen.getByText(/"close": 100/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("provider=yfinance&symbol=AAPL&interval=1d"), expect.anything());
  });
});
