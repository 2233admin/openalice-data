import { describe, expect, it, vi } from "vitest";
import { DatasetQueryError, runDatasetQuery, saveProviderCredentials, type Invoke } from "../../studio/actions";

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
  it("keeps warnings and reproducible native evidence", async () => {
    const result = await runDatasetQuery({
      baseUrl: "http://127.0.0.1:6900",
      apiPath: "/api/v1/equity/price/historical",
      provider: "fmp",
      params: { symbol: "AAPL", api_key: "secret-value" },
      datasetId: "equity.price.historical",
      serviceContext: { runtime: "openbb", service: "running", backend: "http://127.0.0.1:6900" },
    }, async () => new Response(JSON.stringify({ results: [{ close: 10, api_key: "secret-value" }], warnings: ["token=secret-warning"] }), { status: 200 }));
    expect(result.target).toMatchObject({ kind: "native", datasetId: "equity.price.historical", providerId: "fmp" });
    expect(result.submittedParams).toMatchObject({ symbol: "AAPL", api_key: "[REDACTED]" });
    expect(result.warnings).toEqual(["token=[REDACTED]"]);
    expect(result.rowCount).toBe(1);
    expect(result.requestPath).toBe("/api/v1/equity/price/historical");
    expect(result.serviceContext?.runtime).toBe("openbb");
    expect(result.requestUrl).not.toContain("secret-value");
    expect(JSON.stringify(result.raw)).not.toContain("secret-value");
    expect(result.rawResponseRedacted).toBe(true);
  });
  it("classifies malformed and provider responses with raw evidence", async () => {
    const malformed = runDatasetQuery({ baseUrl: "http://localhost:6900", apiPath: "/api/v1/test", provider: "fmp", params: {} }, async () => new Response("<html>gateway failure</html>", { status: 200 }));
    await expect(malformed).rejects.toMatchObject({ diagnosticCategory: "upstream_response", rawResponseAvailable: true });
    const provider = runDatasetQuery({ baseUrl: "http://localhost:6900", apiPath: "/api/v1/test", provider: "fmp", params: {} }, async () => new Response(JSON.stringify({ detail: "provider rejected symbol" }), { status: 500 }));
    await expect(provider).rejects.toMatchObject({ diagnosticCategory: "source_provider", status: 500 });
  });

  it("classifies service failures and preserves safe retry inputs", async () => {
    const failure = runDatasetQuery({ baseUrl: "http://localhost:6900", apiPath: "/api/v1/test", provider: "fmp", params: { symbol: "AAPL", token: "secret-token" } }, async () => new Response(JSON.stringify({ detail: "service unavailable" }), { status: 503 }));
    await expect(failure).rejects.toMatchObject({ diagnosticCategory: "service_runtime", submittedParams: { symbol: "AAPL", token: "[REDACTED]" }, rawResponseAvailable: true });
  });

  it("exposes a typed diagnostic error for network failures", async () => {
    try {
      await runDatasetQuery({ baseUrl: "http://localhost:6900", apiPath: "/api/v1/test", provider: "fmp", params: { symbol: "AAPL" } }, async () => { throw new Error("connect ECONNREFUSED"); });
      throw new Error("expected query to fail");
    } catch (failure) {
      expect(failure).toBeInstanceOf(DatasetQueryError);
      expect(failure).toMatchObject({ diagnosticCategory: "service_runtime", rawResponseAvailable: false });
    }
  });
});
