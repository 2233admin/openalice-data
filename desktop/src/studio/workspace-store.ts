import { z } from "zod";
import type { DatasetSummary, StudioSnapshot } from "./contracts";

export const WORKSPACE_STORE_VERSION = 1 as const;
export const workspaceStorageKey = "openbb-studio.workspaces.v1";

export const nativeDatasetRefSchema = z.object({
  providerId: z.string().min(1),
  datasetId: z.string().min(1),
  nativePath: z.string().min(1).nullable(),
  attachedAt: z.string().datetime({ offset: true }),
}).strict();

export const mappingRecordSchema = z.object({
  sourceField: z.string().min(1),
  openbbField: z.string().min(1).nullable().optional(),
  workspaceField: z.string().min(1),
  type: z.string().min(1).nullable().optional(),
  unit: z.string().min(1).nullable().optional(),
  timeGranularity: z.string().min(1).nullable().optional(),
  transform: z.string().nullable().optional(),
  scope: z.enum(["common", "provider"]),
  evidence: z.string(),
  status: z.enum(["draft", "confirmed", "rejected", "unsupported"]),
  version: z.string().min(1),
}).strict();


export const compatibilityReportSchema = z.object({
  queryContract: z.record(z.string(), z.unknown()),
  sample: z.record(z.string(), z.unknown()),
  fieldComparisons: z.array(z.record(z.string(), z.unknown())),
  mismatches: z.array(z.string()),
  tolerancePolicy: z.string(),
  status: z.enum(["compatible", "incompatible", "blocked"]),
  checkedAt: z.string().datetime({ offset: true }),
}).strict();

export const workspaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  members: z.array(nativeDatasetRefSchema),
  mappings: z.array(mappingRecordSchema),
  comparison: compatibilityReportSchema.nullable(),
  appliedVersion: z.string().min(1).nullable(),
}).strict();
export const workspaceStoreSchema = z.object({
  version: z.literal(WORKSPACE_STORE_VERSION),
  workspaces: z.array(workspaceSchema),
}).strict();

export type NativeDatasetRef = z.infer<typeof nativeDatasetRefSchema>;
export type MappingRecord = z.infer<typeof mappingRecordSchema>;
export type CompatibilityReport = z.infer<typeof compatibilityReportSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type WorkspaceStore = z.infer<typeof workspaceStoreSchema>;
export type WorkspaceStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type WorkspaceMemberState = "available" | "stale" | "unavailable" | "unknown";

const emptyStore = (): WorkspaceStore => ({ version: WORKSPACE_STORE_VERSION, workspaces: [] });

function storageOrDefault(storage?: WorkspaceStorage): WorkspaceStorage | undefined {
  if (storage) return storage;
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) return undefined;
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function now(): string {
  return new Date().toISOString();
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `workspace-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function notifyWorkspaceChange(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("studio-workspaces"));
}

/** Migrate at the persistence boundary and copy only the allow-listed shape. */
export function migrateWorkspaceStore(raw: unknown): WorkspaceStore {
  if (raw && typeof raw === "object" && "version" in raw && (raw as { version?: unknown }).version === WORKSPACE_STORE_VERSION) {
    const parsed = workspaceStoreSchema.safeParse(raw);
    return parsed.success ? parsed.data : emptyStore();
  }

  const legacy = raw && typeof raw === "object" && "workspaces" in raw ? (raw as { workspaces?: unknown }).workspaces : raw;
  if (!Array.isArray(legacy)) return emptyStore();
  const migrated: Workspace[] = [];
  for (const candidate of legacy) {
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Record<string, unknown>;
    const id = typeof item.id === "string" && item.id.trim() ? item.id : createId();
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!name) continue;
    const timestamp = typeof item.updatedAt === "string" ? item.updatedAt : now();
    const createdAt = typeof item.createdAt === "string" ? item.createdAt : timestamp;
    const record = {
      id,
      name,
      createdAt,
      updatedAt: timestamp,
      members: Array.isArray(item.members) ? item.members : [],
      mappings: Array.isArray(item.mappings) ? item.mappings : [],
      comparison: item.comparison ?? null,
      appliedVersion: typeof item.appliedVersion === "string" ? item.appliedVersion : null,
    };
    const parsed = workspaceSchema.safeParse(record);
    if (parsed.success) migrated.push(parsed.data);
  }
  return { version: WORKSPACE_STORE_VERSION, workspaces: migrated };
}

export function readWorkspaceStore(storage?: WorkspaceStorage): WorkspaceStore {
  const target = storageOrDefault(storage);
  if (!target) return emptyStore();
  try {
    const raw = target.getItem(workspaceStorageKey);
    if (!raw) return emptyStore();
    const migrated = migrateWorkspaceStore(JSON.parse(raw));
    const normalized = JSON.stringify(migrated);
    if (raw !== normalized) target.setItem(workspaceStorageKey, normalized);
    return migrated;
  } catch {
    target.removeItem(workspaceStorageKey);
    return emptyStore();
  }
}

export function writeWorkspaceStore(store: WorkspaceStore, storage?: WorkspaceStorage): WorkspaceStore {
  const parsed = workspaceStoreSchema.parse(store);
  const target = storageOrDefault(storage);
  if (target) target.setItem(workspaceStorageKey, JSON.stringify(parsed));
  notifyWorkspaceChange();
  return parsed;
}

export function subscribeWorkspaceStore(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("studio-workspaces", listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener("studio-workspaces", listener);
    window.removeEventListener("storage", listener);
  };
}

export function listWorkspaces(storage?: WorkspaceStorage): Workspace[] {
  return readWorkspaceStore(storage).workspaces;
}

export function openWorkspace(workspaceId: string, storage?: WorkspaceStorage): Workspace | null {
  return listWorkspaces(storage).find((workspace) => workspace.id === workspaceId) ?? null;
}

export function createWorkspace(name: string, storage?: WorkspaceStorage): Workspace {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("Workspace name must not be empty.");
  const timestamp = now();
  const workspace: Workspace = {
    id: createId(),
    name: normalizedName,
    createdAt: timestamp,
    updatedAt: timestamp,
    members: [],
    mappings: [],
    comparison: null,
    appliedVersion: null,
  };
  const store = readWorkspaceStore(storage);
  writeWorkspaceStore({ ...store, workspaces: [...store.workspaces, workspace] }, storage);
  return workspace;
}

export function renameWorkspace(workspaceId: string, name: string, storage?: WorkspaceStorage): Workspace {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("Workspace name must not be empty.");
  const store = readWorkspaceStore(storage);
  const index = store.workspaces.findIndex((workspace) => workspace.id === workspaceId);
  if (index < 0) throw new Error("Workspace not found.");
  const workspace = { ...store.workspaces[index], name: normalizedName, updatedAt: now() };
  const workspaces = [...store.workspaces];
  workspaces[index] = workspace;
  writeWorkspaceStore({ ...store, workspaces }, storage);
  return workspace;
}

export function removeWorkspace(workspaceId: string, storage?: WorkspaceStorage): boolean {
  const store = readWorkspaceStore(storage);
  const workspaces = store.workspaces.filter((workspace) => workspace.id !== workspaceId);
  if (workspaces.length === store.workspaces.length) return false;
  writeWorkspaceStore({ ...store, workspaces }, storage);
  return true;
}

export function attachNativeDataset(workspaceId: string, member: NativeDatasetRef, storage?: WorkspaceStorage): Workspace {
  const parsedMember = nativeDatasetRefSchema.parse(member);
  const store = readWorkspaceStore(storage);
  const index = store.workspaces.findIndex((workspace) => workspace.id === workspaceId);
  if (index < 0) throw new Error("Workspace not found.");
  const workspace = store.workspaces[index];
  const exists = workspace.members.some((item) => item.providerId === parsedMember.providerId && item.datasetId === parsedMember.datasetId);
  if (exists) return workspace;
  const updated = { ...workspace, members: [...workspace.members, parsedMember], updatedAt: now() };
  const workspaces = [...store.workspaces];
  workspaces[index] = updated;
  writeWorkspaceStore({ ...store, workspaces }, storage);
  return updated;
}

export function attachDatasetFromSummary(workspaceId: string, providerId: string, dataset: DatasetSummary, storage?: WorkspaceStorage): Workspace {
  if (!dataset.providers.some((provider) => provider.provider_id === providerId)) throw new Error("Provider is not a discovered member of this dataset.");
  return attachNativeDataset(workspaceId, {
    providerId,
    datasetId: dataset.id,
    nativePath: dataset.api_path || dataset.python_path || null,
    attachedAt: now(),
  }, storage);
}

export function detachNativeDataset(workspaceId: string, providerId: string, datasetId: string, storage?: WorkspaceStorage): Workspace {
  const store = readWorkspaceStore(storage);
  const index = store.workspaces.findIndex((workspace) => workspace.id === workspaceId);
  if (index < 0) throw new Error("Workspace not found.");
  const workspace = store.workspaces[index];
  const members = workspace.members.filter((member) => !(member.providerId === providerId && member.datasetId === datasetId));
  const updated = { ...workspace, members, updatedAt: now() };
  const workspaces = [...store.workspaces];
  workspaces[index] = updated;
  writeWorkspaceStore({ ...store, workspaces }, storage);
  return updated;
}

export function getWorkspaceMemberState(
  member: NativeDatasetRef,
  snapshot: StudioSnapshot | null | undefined,
  serviceState: "running" | "stopped" | "error" | undefined,
): WorkspaceMemberState {
  if (!snapshot) return "unavailable";
  if (!serviceState) return "unknown";
  if (serviceState !== "running") return serviceState === "error" ? "unavailable" : "stale";
  const provider = snapshot.providers.find((item) => item.id === member.providerId);
  const dataset = snapshot.datasets.find((item) => item.id === member.datasetId);
  if (!provider || !dataset) return "unavailable";
  const providerState = dataset.providers.find((item) => item.provider_id === member.providerId)?.state;
  if (!providerState || providerState === "unavailable" || provider.status === "failed" || provider.status === "not_installed") return "unavailable";
  if (providerState !== "available" || provider.status !== "available") return "stale";
  return "available";
}

export function workspaceMemberStateLabel(state: WorkspaceMemberState): string {
  return { available: "来源可用", stale: "来源状态待刷新", unavailable: "来源不可用", unknown: "无法确认来源状态" }[state];
}
