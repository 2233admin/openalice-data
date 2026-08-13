export interface StudioActivityEntry {
  datasetId: string;
  providerId: string;
  succeeded: boolean;
  at: string;
  durationMs?: number;
  rowCount?: number;
  message?: string;
}

const storageKey = "openbb-studio.activity.v1";
const sensitiveName = /authorization|cookie|api[_-]?key|token|secret|password/i;

export function readStudioActivity(storage: Pick<Storage, "getItem"> = localStorage): StudioActivityEntry[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(storageKey) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is StudioActivityEntry => typeof entry === "object" && entry !== null
      && typeof (entry as StudioActivityEntry).datasetId === "string"
      && typeof (entry as StudioActivityEntry).providerId === "string"
      && typeof (entry as StudioActivityEntry).succeeded === "boolean"
      && typeof (entry as StudioActivityEntry).at === "string");
  } catch {
    return [];
  }
}

export function recordStudioActivity(
  entry: StudioActivityEntry,
  storage: Pick<Storage, "getItem" | "setItem"> = localStorage,
) {
  const safeEntry = { ...entry, message: entry.message && (sensitiveName.test(entry.message) ? "[REDACTED]" : entry.message.slice(0, 240)) };
  const entries = [safeEntry, ...readStudioActivity(storage)].slice(0, 50);
  storage.setItem(storageKey, JSON.stringify(entries));
  window.dispatchEvent(new Event("studio-activity"));
}

export function latestProviderActivity(providerId: string, entries = readStudioActivity()) {
  return entries.find((entry) => entry.providerId === providerId);
}

export function latestDatasetSuccess(datasetId: string, entries = readStudioActivity()) {
  return entries.find((entry) => entry.datasetId === datasetId && entry.succeeded);
}
