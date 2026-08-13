import { describe, expect, it, vi } from "vitest";
import { runDatasetQuery, saveProviderCredentials, type Invoke } from "../../studio/actions";

describe("Studio actions", () => {
  it("preserves OpenBB's flat credential structure", async () => {
    const invoke = vi.fn(async (command: string) => {
      if (command === "get_user_credentials") return { credentials: { fred_api_key: "existing" } };
      if (command === "update_user_credentials") return true;
      throw new Error(command);
    });
    await saveProviderCredentials({ fmp_api_key: "new-secret" }, invoke as unknown as Invoke);
    expect(invoke).toHaveBeenCalledWith("update_user_credentials", { credentials: { fred_api_key: "existing", fmp_api_key: "new-secret" } });
  });

  it("runs the Inspector-selected route and returns normalized rows", async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ results: [{ date: "2026-08-14", close: 10 }] }), { status: 200 }));
    const result = await runDatasetQuery({ baseUrl: "http://127.0.0.1:6900", apiPath: "/api/v1/equity/price/historical", provider: "fmp", params: { symbol: "AAPL" } }, request);
    expect(request).toHaveBeenCalledWith("http://127.0.0.1:6900/api/v1/equity/price/historical?provider=fmp&symbol=AAPL", expect.anything());
    expect(result.rows[0].close).toBe(10);
  });

  it("redacts secrets from provider errors", async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ detail: "Authorization: Bearer abc123 X-API-Key=secret-value" }), { status: 401 }));
    await expect(runDatasetQuery({ baseUrl: "http://localhost:6900", apiPath: "/api/v1/test", provider: "fmp", params: {} }, request)).rejects.not.toThrow(/abc123|secret-value/);
  });
});
