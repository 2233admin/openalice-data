import { z } from "zod";

export const STARTUP_PLAN_STORE_VERSION = 1 as const;
export const startupPlanStorageKey = "openalice.startup-plans.v1";

export const startupItemSchema = z.object({
  kind: z.enum(["service", "frontend"]),
  id: z.string().min(1),
}).strict();

export const startupPlanSchema = z.object({
  id: z.string().min(1),
  environment: z.string().min(1),
  name: z.string().min(1),
  items: z.array(startupItemSchema),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
}).strict();

export const startupPlanStoreSchema = z.object({
  version: z.literal(STARTUP_PLAN_STORE_VERSION),
  plans: z.array(startupPlanSchema),
}).strict();

export type StartupItem = z.infer<typeof startupItemSchema>;
export type StartupPlan = z.infer<typeof startupPlanSchema>;
export type StartupPlanStore = z.infer<typeof startupPlanStoreSchema>;
export type StartupPlanStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface LegacyBackendReference {
  id: string;
  name?: string;
  command?: string;
  environment: string;
  auto_start?: boolean;
  autoStart?: boolean;
}

const emptyStore = (): StartupPlanStore => ({ version: STARTUP_PLAN_STORE_VERSION, plans: [] });

function storageOrDefault(storage?: StartupPlanStorage): StartupPlanStorage | undefined {
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
  return `startup-plan-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function notifyStartupPlanChange(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("openalice-startup-plans"));
}

function uniqueItems(items: StartupItem[]): StartupItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.kind}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Accept only the current allow-listed shape at the persistence boundary. */
export function migrateStartupPlanStore(raw: unknown): StartupPlanStore {
  if (raw && typeof raw === "object" && "version" in raw && (raw as { version?: unknown }).version === STARTUP_PLAN_STORE_VERSION) {
    const parsed = startupPlanStoreSchema.safeParse(raw);
    if (parsed.success) {
      return {
        version: STARTUP_PLAN_STORE_VERSION,
        plans: parsed.data.plans.map((plan) => ({ ...plan, items: uniqueItems(plan.items) })),
      };
    }
    return emptyStore();
  }

  const legacy = raw && typeof raw === "object" && "plans" in raw ? (raw as { plans?: unknown }).plans : raw;
  if (!Array.isArray(legacy)) return emptyStore();

  const plans: StartupPlan[] = [];
  for (const candidate of legacy) {
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const environment = typeof item.environment === "string" ? item.environment.trim() : "";
    if (!name || !environment) continue;
    const timestamp = typeof item.updatedAt === "string" ? item.updatedAt : now();
    const createdAt = typeof item.createdAt === "string" ? item.createdAt : timestamp;
    const parsed = startupPlanSchema.safeParse({
      id: typeof item.id === "string" && item.id.trim() ? item.id : createId(),
      environment,
      name,
      items: Array.isArray(item.items) ? item.items : [],
      createdAt,
      updatedAt: timestamp,
    });
    if (parsed.success) plans.push({ ...parsed.data, items: uniqueItems(parsed.data.items) });
  }
  return { version: STARTUP_PLAN_STORE_VERSION, plans };
}

export function readStartupPlanStore(storage?: StartupPlanStorage): StartupPlanStore {
  const target = storageOrDefault(storage);
  if (!target) return emptyStore();
  try {
    const raw = target.getItem(startupPlanStorageKey);
    if (!raw) return emptyStore();
    const migrated = migrateStartupPlanStore(JSON.parse(raw));
    const normalized = JSON.stringify(migrated);
    if (raw !== normalized) target.setItem(startupPlanStorageKey, normalized);
    return migrated;
  } catch {
    target.removeItem(startupPlanStorageKey);
    return emptyStore();
  }
}

export function writeStartupPlanStore(store: StartupPlanStore, storage?: StartupPlanStorage): StartupPlanStore {
  const parsed = startupPlanStoreSchema.parse({
    ...store,
    plans: store.plans.map((plan) => ({ ...plan, items: uniqueItems(plan.items) })),
  });
  storageOrDefault(storage)?.setItem(startupPlanStorageKey, JSON.stringify(parsed));
  notifyStartupPlanChange();
  return parsed;
}

export function subscribeStartupPlans(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("openalice-startup-plans", listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener("openalice-startup-plans", listener);
    window.removeEventListener("storage", listener);
  };
}

export function listStartupPlans(environment?: string, storage?: StartupPlanStorage): StartupPlan[] {
  const plans = readStartupPlanStore(storage).plans;
  return environment ? plans.filter((plan) => plan.environment === environment) : plans;
}

export function createStartupPlan(
  environment: string,
  name: string,
  items: StartupItem[] = [],
  storage?: StartupPlanStorage,
): StartupPlan {
  const normalizedEnvironment = environment.trim();
  const normalizedName = name.trim();
  if (!normalizedEnvironment) throw new Error("请选择运行环境。");
  if (!normalizedName) throw new Error("启动方案名称不能为空。");
  const timestamp = now();
  const plan: StartupPlan = {
    id: createId(),
    environment: normalizedEnvironment,
    name: normalizedName,
    items: uniqueItems(items.map((item) => startupItemSchema.parse(item))),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const store = readStartupPlanStore(storage);
  writeStartupPlanStore({ ...store, plans: [...store.plans, plan] }, storage);
  return plan;
}

export function updateStartupPlan(
  planId: string,
  changes: { name?: string; items?: StartupItem[] },
  storage?: StartupPlanStorage,
): StartupPlan {
  const store = readStartupPlanStore(storage);
  const index = store.plans.findIndex((plan) => plan.id === planId);
  if (index < 0) throw new Error("找不到这个启动方案。");
  const current = store.plans[index];
  const name = changes.name === undefined ? current.name : changes.name.trim();
  if (!name) throw new Error("启动方案名称不能为空。");
  const updated: StartupPlan = {
    ...current,
    name,
    items: changes.items === undefined ? current.items : uniqueItems(changes.items.map((item) => startupItemSchema.parse(item))),
    updatedAt: now(),
  };
  const plans = [...store.plans];
  plans[index] = updated;
  writeStartupPlanStore({ ...store, plans }, storage);
  return updated;
}

export function removeStartupPlan(planId: string, storage?: StartupPlanStorage): boolean {
  const store = readStartupPlanStore(storage);
  const plans = store.plans.filter((plan) => plan.id !== planId);
  if (plans.length === store.plans.length) return false;
  writeStartupPlanStore({ ...store, plans }, storage);
  return true;
}

export function isLegacyAutoStartEnabled(backend: LegacyBackendReference): boolean {
  return backend.auto_start === true || backend.autoStart === true;
}

/**
 * Converts legacy per-backend auto-start flags to one default plan per environment.
 * The caller disables the legacy flags through the existing ODP update command.
 */
export function migrateLegacyAutoStartPlans(
  backends: LegacyBackendReference[],
  storage?: StartupPlanStorage,
): { store: StartupPlanStore; backendIdsToDisable: string[] } {
  const store = readStartupPlanStore(storage);
  const byEnvironment = new Map<string, LegacyBackendReference[]>();
  for (const backend of backends) {
    if (!backend.id || !backend.environment || !isLegacyAutoStartEnabled(backend)) continue;
    const group = byEnvironment.get(backend.environment) ?? [];
    group.push(backend);
    byEnvironment.set(backend.environment, group);
  }

  let plans = [...store.plans];
  for (const [environment, legacyBackends] of byEnvironment) {
    const existing = plans.find((plan) => plan.environment === environment && (plan.name === "默认方案" || plan.name === "OpenBB 默认方案"));
    const legacyItems = legacyBackends.map((backend) => ({ kind: "service" as const, id: backend.id }));
    if (existing) {
      const index = plans.findIndex((plan) => plan.id === existing.id);
      plans[index] = { ...existing, items: uniqueItems([...existing.items, ...legacyItems]), updatedAt: now() };
    } else {
      const timestamp = now();
      plans.push({ id: createId(), environment, name: "默认方案", items: uniqueItems(legacyItems), createdAt: timestamp, updatedAt: timestamp });
    }
  }

  const nextStore = { ...store, plans };
  if (plans.length !== store.plans.length || JSON.stringify(plans) !== JSON.stringify(store.plans)) writeStartupPlanStore(nextStore, storage);
  return { store: nextStore, backendIdsToDisable: [...byEnvironment.values()].flat().map((backend) => backend.id) };
}

function isOpenBbService(backend: LegacyBackendReference): boolean {
  return `${backend.name ?? ""} ${backend.command ?? ""}`.toLowerCase().includes("openbb");
}

/**
 * Seeds the first user-visible plan from the existing OpenBB services.
 * This only references service IDs and the built-in Workspace frontend; it
 * never copies service configuration into plan storage.
 */
export function ensureOpenBbDefaultPlan(
  backends: LegacyBackendReference[],
  frontendIds: string[] = ["frontend:openbb-workspace"],
  storage?: StartupPlanStorage,
): StartupPlanStore {
  const store = readStartupPlanStore(storage);
  const byEnvironment = new Map<string, LegacyBackendReference[]>();
  for (const backend of backends) {
    if (!backend.id || !backend.environment || !isOpenBbService(backend)) continue;
    const group = byEnvironment.get(backend.environment) ?? [];
    group.push(backend);
    byEnvironment.set(backend.environment, group);
  }

  let plans = [...store.plans];
  for (const [environment, services] of byEnvironment) {
    if (plans.some((plan) => plan.environment === environment && plan.name === "OpenBB 默认方案")) continue;
    const openBbIds = new Set(services.map((service) => service.id));
    const legacyDefaultIndex = plans.findIndex((plan) =>
      plan.environment === environment
      && plan.name === "默认方案"
      && plan.items.length > 0
      && plan.items.every((item) => item.kind === "service" && openBbIds.has(item.id)),
    );
    if (legacyDefaultIndex >= 0) {
      const legacy = plans[legacyDefaultIndex];
      plans[legacyDefaultIndex] = {
        ...legacy,
        name: "OpenBB 默认方案",
        updatedAt: now(),
      };
      continue;
    }
    const timestamp = now();
    plans.push({
      id: createId(),
      environment,
      name: "OpenBB 默认方案",
      items: uniqueItems([
        ...services.map((service) => ({ kind: "service" as const, id: service.id })),
        ...frontendIds.map((id) => ({ kind: "frontend" as const, id })),
      ]),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  const nextStore = { ...store, plans };
  if (JSON.stringify(plans) !== JSON.stringify(store.plans)) writeStartupPlanStore(nextStore, storage);
  return nextStore;
}