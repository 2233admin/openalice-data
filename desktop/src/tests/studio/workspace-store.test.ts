import { describe, expect, it } from "vitest";
import {
  attachNativeDataset,
  createWorkspaceFromMembers,
  detachNativeDataset,
  getWorkspaceMemberState,
  moveNativeDataset,
  migrateWorkspaceStore,
  openWorkspace,
  readWorkspaceStore,
  removeWorkspace,
  renameWorkspace,
  workspaceStorageKey,
} from "../../studio/workspace-store";

type TestStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function storage(): TestStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

const member = { providerId: "fmp", datasetId: "equity.price.historical", nativePath: "/api/v1/equity/price/historical", attachedAt: "2026-08-15T00:00:00.000Z" };
const secondMember = { providerId: "fmp", datasetId: "equity.price.quote", nativePath: "/api/v1/equity/price/quote", attachedAt: "2026-08-15T00:00:00.000Z" };

function createWorkspace(name: string, target: TestStorage) {
  return createWorkspaceFromMembers(name, [member, secondMember], target);
}

function snapshot() {
  return {
    providers: [{ id: "fmp", name: "fmp", display_name: "FMP", status: "available" as const, capability_count: 1, capabilities: [], credential_fields: [] }],
    datasets: [{ id: "equity.price.historical", display_name: "Historical", category: "Equity", python_path: "equity.price.historical", api_path: "/api/v1/equity/price/historical", standard_model: "EquityHistorical", providers: [{ provider_id: "fmp", state: "available" as const }], common_query_fields: [], common_data_fields: [], provider_specific_query_fields: {}, provider_specific_fields: {} }],
    actions: [],
    fetched_at: "2026-08-15T00:00:00.000Z",
    freshness: { status: "fresh" as const, inspected_at: "2026-08-15T00:00:00.000Z", source: "live" as const },
  };
}

describe("workspace store", () => {
  it("creates, renames, opens, removes, and reloads stable workspace records", () => {
    const target = storage();
    const workspace = createWorkspace("  US equities  ", target);
    const id = workspace.id;
    expect(openWorkspace(id, target)?.name).toBe("US equities");
    renameWorkspace(id, "US fundamentals", target);
    expect(readWorkspaceStore(target).workspaces[0]).toMatchObject({ id, name: "US fundamentals", members: [member, secondMember], mappings: [], comparison: null, appliedVersion: null });
    expect(openWorkspace(id, target)?.id).toBe(id);
    expect(removeWorkspace(id, target)).toBe(true);
    expect(openWorkspace(id, target)).toBeNull();
  });

  it("rejects empty names and keeps credentials out of persisted schema", () => {
    const target = storage();
    expect(() => createWorkspace("  ", target)).toThrow();
    target.setItem(workspaceStorageKey, JSON.stringify({ version: 1, workspaces: [{ id: "one", name: "Safe", createdAt: "2026-08-15T00:00:00.000Z", updatedAt: "2026-08-15T00:00:00.000Z", members: [], mappings: [], comparison: null, appliedVersion: null, apiKey: "secret" }] }));
    expect(readWorkspaceStore(target).workspaces).toEqual([]);
  });

  it("migrates an unversioned allow-listed record and ignores malformed records", () => {
    const migrated = migrateWorkspaceStore({ workspaces: [{ id: "legacy", name: "Legacy", createdAt: "2026-08-15T00:00:00.000Z", updatedAt: "2026-08-15T00:00:00.000Z", members: [], mappings: [], comparison: null, appliedVersion: null }, { id: "bad", name: "", members: [] }] });
    expect(migrated.workspaces).toHaveLength(1);
    expect(migrated.workspaces[0].id).toBe("legacy");
  });

  it("attaches only the explicit native identity and supports detach", () => {
    const target = storage();
    const workspace = createWorkspace("Sources", target);
    attachNativeDataset(workspace.id, member, target);
    expect(openWorkspace(workspace.id, target)?.members).toEqual([member, secondMember]);
    attachNativeDataset(workspace.id, member, target);
    expect(openWorkspace(workspace.id, target)?.members).toHaveLength(2);
    detachNativeDataset(workspace.id, member.providerId, member.datasetId, target);
    expect(openWorkspace(workspace.id, target)?.members).toEqual([secondMember]);
  });

  it("reorders persisted members without changing their exact identities", () => {
    const target = storage();
    const workspace = createWorkspace("Sources", target);
    const moved = moveNativeDataset(workspace.id, member.providerId, member.datasetId, "down", target);
    expect(moved.members).toEqual([secondMember, member]);
    expect(openWorkspace(workspace.id, target)?.members).toEqual([secondMember, member]);
    expect(moveNativeDataset(workspace.id, member.providerId, member.datasetId, "down", target).members).toEqual([secondMember, member]);
    expect(moveNativeDataset(workspace.id, member.providerId, member.datasetId, "up", target).members).toEqual([member, secondMember]);
  });

  it("marks source state stale or unavailable when live source state changes", () => {
    const current = snapshot();
    expect(getWorkspaceMemberState(member, current, "running")).toBe("available");
    expect(getWorkspaceMemberState(member, current, "stopped")).toBe("stale");
    expect(getWorkspaceMemberState({ ...member, providerId: "missing" }, current, "running")).toBe("unavailable");
    expect(getWorkspaceMemberState(member, undefined, "running")).toBe("unavailable");
  });
});
