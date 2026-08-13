import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

export async function saveProviderCredentials(values: Record<string, string>, invoke: Invoke = tauriInvoke) {
  const settings = await invoke<{ credentials?: Record<string, string> }>("get_user_credentials");
  return invoke<boolean>("update_user_credentials", {
    credentials: { ...(settings.credentials ?? {}), ...values },
  });
}

export interface DatasetQuery {
  baseUrl: string;
  apiPath: string;
  provider: string;
  params: Record<string, string>;
}

export interface DatasetQueryResult {
  rows: Record<string, unknown>[];
  raw: unknown;
  requestUrl: string;
  durationMs: number;
  submittedParams: Record<string, string>;
  warnings: string[];
}

const redact = (value: string) => value
  .replace(/(authorization\s*[:=]\s*(?:bearer\s+)?)[^\s,;"}]+/gi, "$1[REDACTED]")
  .replace(/((?:cookie|x-api-key|api[_-]?key|token|secret|password)\s*[:=]\s*)[^\s,;"}]+/gi, "$1[REDACTED]");

const rowsFromResponse = (raw: unknown): Record<string, unknown>[] => {
  if (Array.isArray(raw)) return raw.filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null);
  if (typeof raw !== "object" || raw === null) return [];
  const record = raw as Record<string, unknown>;
  for (const key of ["results", "data", "results_data"]) {
    if (Array.isArray(record[key])) return record[key].filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null);
  }
  return [];
};

export async function runDatasetQuery(query: DatasetQuery, request: typeof fetch = fetch): Promise<DatasetQueryResult> {
  const base = query.baseUrl.replace(/\/$/, "");
  const parameters = new URLSearchParams({ provider: query.provider });
  Object.entries(query.params).forEach(([name, value]) => { if (value !== "") parameters.set(name, value); });
  const requestUrl = `${base}${query.apiPath}?${parameters.toString()}`;
  const startedAt = performance.now();
  const response = await request(requestUrl, { headers: { Accept: "application/json" } });
  const text = await response.text();
  let raw: unknown = text;
  try { raw = JSON.parse(text); } catch { /* diagnostics preserve non-JSON responses */ }
  if (!response.ok) {
    const detail = typeof raw === "object" && raw !== null && "detail" in raw ? String((raw as { detail: unknown }).detail) : text;
    throw new Error(redact(`Query failed (${response.status}): ${detail}`));
  }
  const warnings = typeof raw === "object" && raw !== null && Array.isArray((raw as Record<string, unknown>).warnings)
    ? (raw as { warnings: unknown[] }).warnings.map(String)
    : [];
  return { rows: rowsFromResponse(raw), raw, requestUrl, durationMs: Math.round(performance.now() - startedAt), submittedParams: { provider: query.provider, ...query.params }, warnings };
}
