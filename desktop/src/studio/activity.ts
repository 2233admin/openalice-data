import { type NativeQueryTarget, type QueryDiagnosticCategory, type QueryServiceContext, redactQueryParams } from "./actions";

export interface StudioActivityEntry {
  datasetId: string;
  providerId: string;
  targetKind?: "native" | "workspace";
  target?: NativeQueryTarget;
  succeeded: boolean;
  at: string;
  durationMs?: number;
  rowCount?: number;
  message?: string;
  diagnosticCategory?: QueryDiagnosticCategory;
  status?: number;
  rawResponseAvailable?: boolean;
  rawResponseRedacted?: boolean;
  rawResponseUnavailableReason?: string;
  submittedParams?: Record<string, string>;
  requestPath?: string;
  requestUrl?: string;
  warnings?: string[];
  serviceContext?: QueryServiceContext;
}

const storageKey = "openbb-studio.activity.v1";
const sensitiveName = /(?:authorization|cookie|x[-_]?api[-_]?key|api[-_]?key|access[-_]?token|refresh[-_]?token|token|secret|password|credential)/i;
const sensitivePattern = /(authorization\s*[:=]\s*(?:bearer\s+)?|cookie\s*[:=]\s*|x[-_]?api[-_]?key\s*[:=]\s*|api[-_]?key\s*[:=]\s*|access[-_]?token\s*[:=]\s*|refresh[-_]?token\s*[:=]\s*|token\s*[:=]\s*|secret\s*[:=]\s*|password\s*[:=]\s*)[^\s,;"'}&]+/gi;
const quotedSensitivePattern = /((?:authorization|cookie|x[-_]?api[-_]?key|api[-_]?key|access[-_]?token|refresh[-_]?token|token|secret|password|credential)\s*["']?\s*[:=]\s*["']?)[^\s,;"'}&]+/gi;

function redactText(value: string): string {
  return value.replace(sensitivePattern, "[REDACTED]").replace(quotedSensitivePattern, "[REDACTED]");
}

function redactValue(value: unknown, key?: string): unknown {
  if (key && sensitiveName.test(key)) return "[REDACTED]";
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (typeof value === "object" && value !== null) return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, redactValue(item, name)]));
  return value;
}

function safeActivityEntry(entry: StudioActivityEntry): StudioActivityEntry {
  const submittedParams = entry.submittedParams ? redactQueryParams(entry.submittedParams) : undefined;
  const requestUrl = entry.requestUrl ? redactText(entry.requestUrl) : undefined;
  const safe = { ...entry, message: entry.message ? redactText(entry.message).slice(0, 240) : undefined, submittedParams, requestUrl, warnings: entry.warnings?.map((warning) => redactText(warning).slice(0, 240)), rawResponseUnavailableReason: entry.rawResponseUnavailableReason ? redactText(entry.rawResponseUnavailableReason).slice(0, 240) : undefined };
  return redactValue(safe) as StudioActivityEntry;
}

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
  const safeEntry = safeActivityEntry(entry);
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
