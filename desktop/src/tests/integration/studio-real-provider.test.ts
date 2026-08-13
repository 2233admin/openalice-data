import { describe, expect, it } from "vitest";
import { runDatasetQuery } from "../../studio/actions";

const apiUrl = process.env.OPENBB_STUDIO_API_URL;

describe.runIf(Boolean(apiUrl))("managed OpenBB real-provider flow", () => {
  it("returns yfinance rows and reproducible Usage inputs", async () => {
    const result = await runDatasetQuery({
      baseUrl: apiUrl!,
      apiPath: "/api/v1/equity/price/historical",
      provider: "yfinance",
      params: { symbol: "AAPL", start_date: "2026-08-01" },
    });
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.submittedParams).toMatchObject({ provider: "yfinance", symbol: "AAPL" });
    expect(result.requestUrl).toContain("provider=yfinance");
  }, 60_000);
});
