import { z } from "zod";

const frontendSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
  builtin: z.boolean(),
}).strict();

const frontendStoreSchema = z.object({
  version: z.literal(1),
  frontends: z.array(frontendSchema),
}).strict();

export type VisualizationFrontend = z.infer<typeof frontendSchema>;
type FrontendStorage = Pick<Storage, "getItem" | "setItem">;

export const frontendStorageKey = "openalice.visualization-frontends.v1";
export const builtinWorkspaceFrontend: VisualizationFrontend = {
  id: "openbb-workspace",
  name: "OpenBB Workspace",
  url: "https://pro.openbb.co",
  builtin: true,
};

function storageOrDefault(storage?: FrontendStorage): FrontendStorage | undefined {
  if (storage) return storage;
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) return undefined;
  return globalThis.localStorage;
}

function notify(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("openalice-frontends"));
}

export function listVisualizationFrontends(storage?: FrontendStorage): VisualizationFrontend[] {
  const target = storageOrDefault(storage);
  if (!target) return [builtinWorkspaceFrontend];
  try {
    const parsed = frontendStoreSchema.safeParse(JSON.parse(target.getItem(frontendStorageKey) ?? "null"));
    const custom = parsed.success ? parsed.data.frontends.filter((item) => !item.builtin && item.id !== builtinWorkspaceFrontend.id) : [];
    return [builtinWorkspaceFrontend, ...custom];
  } catch {
    return [builtinWorkspaceFrontend];
  }
}

function writeVisualizationFrontends(frontends: VisualizationFrontend[], storage?: FrontendStorage): void {
  storageOrDefault(storage)?.setItem(frontendStorageKey, JSON.stringify({ version: 1, frontends }));
  notify();
}

export function addVisualizationFrontend(name: string, url: string, storage?: FrontendStorage): VisualizationFrontend {
  const item = frontendSchema.parse({
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `frontend-${Date.now()}`,
    name: name.trim(),
    url: url.trim(),
    builtin: false,
  });
  const custom = listVisualizationFrontends(storage).filter((entry) => !entry.builtin);
  writeVisualizationFrontends([...custom, item], storage);
  return item;
}

export function updateVisualizationFrontend(id: string, name: string, url: string, storage?: FrontendStorage): VisualizationFrontend {
  const custom = listVisualizationFrontends(storage).filter((entry) => !entry.builtin);
  const index = custom.findIndex((entry) => entry.id === id);
  if (index < 0) throw new Error("找不到这个可视化前端。");
  const updated = frontendSchema.parse({ id, name: name.trim(), url: url.trim(), builtin: false });
  custom[index] = updated;
  writeVisualizationFrontends(custom, storage);
  return updated;
}

export function removeVisualizationFrontend(id: string, storage?: FrontendStorage): boolean {
  if (id === builtinWorkspaceFrontend.id) return false;
  const custom = listVisualizationFrontends(storage).filter((entry) => !entry.builtin);
  const next = custom.filter((entry) => entry.id !== id);
  if (next.length === custom.length) return false;
  writeVisualizationFrontends(next, storage);
  return true;
}

export function subscribeVisualizationFrontends(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("openalice-frontends", listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener("openalice-frontends", listener);
    window.removeEventListener("storage", listener);
  };
}
