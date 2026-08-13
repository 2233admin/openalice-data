import { describe, expect, it, vi } from "vitest";
import { latestDatasetSuccess, latestProviderActivity, readStudioActivity, recordStudioActivity } from "../../studio/activity";

describe("Studio activity", () => {
  it("persists only bounded non-secret test metadata", () => {
    localStorage.clear();
    vi.spyOn(window, "dispatchEvent");
    recordStudioActivity({ datasetId: "equity.price.historical", providerId: "fmp", succeeded: false, at: "2026-08-14T00:00:00Z", message: "api_key=secret" });
    expect(localStorage.getItem("openbb-studio.activity.v1")).not.toContain("api_key");
    expect(latestProviderActivity("fmp")?.succeeded).toBe(false);
  });

  it("finds the latest successful dataset query", () => {
    localStorage.clear();
    recordStudioActivity({ datasetId: "economy.gdp", providerId: "fred", succeeded: true, at: "2026-08-14T00:00:00Z", rowCount: 2 });
    expect(latestDatasetSuccess("economy.gdp", readStudioActivity())?.rowCount).toBe(2);
  });
});
