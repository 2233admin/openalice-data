import { describe, expect, it } from "vitest";
import {
  createStartupPlan,
  ensureOpenBbDefaultPlan,
  migrateLegacyAutoStartPlans,
  readStartupPlanStore,
  removeStartupPlan,
  startupPlanStorageKey,
  updateStartupPlan,
} from "../../studio/startup-plan-store";

function storage(): Storage {
  return new StorageMock();
}

class StorageMock implements Storage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe("startup plan store", () => {
  it("persists one unified item list without copying service configuration", () => {
    const target = storage();
    const plan = createStartupPlan("research", "研究启动", [
      { kind: "service", id: "api" },
      { kind: "frontend", id: "frontend:openbb-workspace" },
    ], target);
    expect(plan.items).toEqual([
      { kind: "service", id: "api" },
      { kind: "frontend", id: "frontend:openbb-workspace" },
    ]);
    expect(JSON.parse(target.getItem(startupPlanStorageKey) ?? "{}").plans[0].command).toBeUndefined();
  });

  it("updates and removes plans while keeping environment ownership", () => {
    const target = storage();
    const plan = createStartupPlan("research", "旧名称", [], target);
    const updated = updateStartupPlan(plan.id, { name: "新名称", items: [{ kind: "service", id: "mcp" }] }, target);
    expect(updated.environment).toBe("research");
    expect(updated.items).toEqual([{ kind: "service", id: "mcp" }]);
    expect(removeStartupPlan(plan.id, target)).toBe(true);
    expect(readStartupPlanStore(target).plans).toEqual([]);
  });

  it("migrates legacy auto-start services into a default plan per environment", () => {
    const target = storage();
    const result = migrateLegacyAutoStartPlans([
      { id: "api", name: "OpenBB API", environment: "research", auto_start: true },
      { id: "mcp", name: "OpenBB MCP", environment: "research", autoStart: true },
      { id: "other", environment: "research", auto_start: false },
    ], target);
    expect(result.backendIdsToDisable).toEqual(["api", "mcp"]);
    expect(result.store.plans).toHaveLength(1);
    expect(result.store.plans[0]).toMatchObject({ environment: "research", name: "默认方案" });
    expect(result.store.plans[0].items).toEqual([
      { kind: "service", id: "api" },
      { kind: "service", id: "mcp" },
    ]);
  });
  it("seeds an OpenBB default plan from existing services", () => {
    const target = storage();
    const store = ensureOpenBbDefaultPlan([
      { id: "api", name: "OpenBB API", command: "openbb-api", environment: "research" },
      { id: "mcp", name: "OpenBB MCP", command: "openbb-mcp", environment: "research" },
    ], undefined, target);

    expect(store.plans).toHaveLength(1);
    expect(store.plans[0]).toMatchObject({ environment: "research", name: "OpenBB 默认方案" });
    expect(store.plans[0].items).toEqual([
      { kind: "service", id: "api" },
      { kind: "service", id: "mcp" },
      { kind: "frontend", id: "frontend:openbb-workspace" },
    ]);
  });
});
