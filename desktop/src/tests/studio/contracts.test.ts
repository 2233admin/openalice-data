import { describe, expect, it } from "vitest";
import { studioSnapshotSchema } from "../../studio/contracts";

const validSnapshot = {
  providers: [{
    id: "fmp",
    name: "fmp",
    display_name: "Fmp",
    version: "1.2.3",
    status: "credential_required",
    capability_count: 1,
    capabilities: ["equity.price.historical"],
    credential_fields: [{ name: "fmp_api_key", required: true, configured: false, secret: true }],
  }],
  datasets: [{
    id: "equity.price.historical",
    display_name: "Historical",
    category: "Equity",
    python_path: "equity.price.historical",
    api_path: "/api/v1/equity/price/historical",
    standard_model: "EquityHistorical",
    providers: [{ provider_id: "fmp", state: "available" }],
    common_query_fields: [{ name: "symbol", type: "str", required: true }],
    common_data_fields: [{ name: "close", type: "float", required: false }],
    provider_specific_query_fields: { fmp: [{ name: "exchange", type: "Literal", required: false, choices: ["NASDAQ", "NYSE"] }] },
    provider_specific_fields: { fmp: [{ name: "change_percent", type: "float", required: false }] },
  }],
  actions: [{
    id: "credential:fmp",
    severity: "warning",
    title: "Fmp needs credentials",
    description: "Add the required credentials, then run a test query.",
    entity_type: "credential",
    entity_id: "fmp",
    action_label: "Add credential",
    action_route: "/data-sources/fmp?tab=credentials",
  }],
  fetched_at: "2026-08-14T00:00:00+00:00",
};

describe("studioSnapshotSchema", () => {
  it("accepts the secret-free inspector contract", () => {
    const snapshot = studioSnapshotSchema.parse(validSnapshot);
    expect(snapshot.providers[0].credential_fields[0].configured).toBe(false);
  });

  it("rejects credential values crossing into the renderer", () => {
    const unsafe = structuredClone(validSnapshot) as typeof validSnapshot & {
      providers: Array<(typeof validSnapshot.providers)[number] & { credential_fields: Array<Record<string, unknown>> }>;
    };
    unsafe.providers[0].credential_fields[0].value = "must-not-cross-boundary";
    expect(() => studioSnapshotSchema.parse(unsafe)).toThrow();
  });

  it("rejects status strings not defined by Studio", () => {
    const invalid = structuredClone(validSnapshot);
    invalid.providers[0].status = "probably_ok";
    expect(() => studioSnapshotSchema.parse(invalid)).toThrow();
  });
  it("normalizes legacy snapshots with explicit freshness metadata", () => {
    const parsed = studioSnapshotSchema.parse(validSnapshot);
    expect(parsed.freshness).toMatchObject({
      status: "fresh",
      source: "live",
      inspected_at: validSnapshot.fetched_at,
    });
  });
  it("preserves undeclared response fields as unknown", () => {
    const snapshot = structuredClone(validSnapshot) as typeof validSnapshot & {
      datasets: Array<(typeof validSnapshot.datasets)[number] & { response_fields: null }>;
    };
    snapshot.datasets[0].response_fields = null;
    expect(studioSnapshotSchema.parse(snapshot).datasets[0].response_fields).toBeNull();
  });

  it("rejects secret-bearing provider metadata", () => {
    const unsafe = structuredClone(validSnapshot) as typeof validSnapshot & {
      providers: Array<(typeof validSnapshot.providers)[number] & { token: string }>;
    };
    unsafe.providers[0].token = "must-not-cross-boundary";
    expect(() => studioSnapshotSchema.parse(unsafe)).toThrow();
  });
});
