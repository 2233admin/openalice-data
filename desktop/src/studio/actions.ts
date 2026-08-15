import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

export async function saveProviderCredentials(values: Record<string, string>, invoke: Invoke = tauriInvoke) {
  const settings = await invoke<{ credentials?: Record<string, string> }>("get_user_credentials");
  return invoke<boolean>("update_user_credentials", {
    credentials: { ...(settings.credentials ?? {}), ...values },
  });
}

export type QueryDiagnosticCategory =
  | "service_runtime"
  | "credential"
  | "source_provider"
  | "request_validation"
  | "mapping_compatibility"
  | "upstream_response";

export interface QueryServiceContext {
  runtime?: string;
  service?: string;
  backend?: string;
}

export interface NativeQueryTarget {
  kind: "native";
  datasetId: string;
  providerId: string;
  datasetName?: string;
}

export interface DatasetQuery {
  baseUrl: string;
  apiPath: string;
  provider: string;
  params: Record<string, string>;
  datasetId?: string;
  datasetName?: string;
  serviceContext?: QueryServiceContext;
}

export interface QueryEvidence {
  target: NativeQueryTarget;
  submittedParams: Record<string, string>;
  requestPath: string;
  requestUrl: string;
  completedAt: string;
  durationMs?: number;
  rowCount?: number;
  warnings: string[];
  rawResponseAvailable: boolean;
  rawResponseUnavailableReason?: string;
  rawResponseRedacted?: boolean;
  raw?: unknown;
  serviceContext?: QueryServiceContext;
  diagnosticCategory?: QueryDiagnosticCategory;
  status?: number;
}

export interface DatasetQueryResult extends QueryEvidence {
  rows: Record<string, unknown>[];
}

export class DatasetQueryError extends Error implements QueryEvidence {
  readonly name = "DatasetQueryError";
  readonly target: NativeQueryTarget;
  readonly submittedParams: Record<string, string>;
  readonly requestPath: string;
  readonly requestUrl: string;
  readonly completedAt: string;
  readonly durationMs?: number;
  readonly rowCount?: number;
  readonly warnings: string[];
  readonly rawResponseAvailable: boolean;
  readonly rawResponseUnavailableReason?: string;
  readonly rawResponseRedacted?: boolean;
  readonly raw?: unknown;
  readonly serviceContext?: QueryServiceContext;
  readonly diagnosticCategory: QueryDiagnosticCategory;
  readonly status?: number;

  constructor(message: string, evidence: Omit<QueryEvidence, "diagnosticCategory"> & { diagnosticCategory: QueryDiagnosticCategory }) {
    super(message);
    this.target = evidence.target;
    this.submittedParams = evidence.submittedParams;
    this.requestPath = evidence.requestPath;
    this.requestUrl = evidence.requestUrl;
    this.completedAt = evidence.completedAt;
    this.durationMs = evidence.durationMs;
    this.rowCount = evidence.rowCount;
    this.warnings = evidence.warnings;
    this.rawResponseAvailable = evidence.rawResponseAvailable;
    this.rawResponseUnavailableReason = evidence.rawResponseUnavailableReason;
    this.rawResponseRedacted = evidence.rawResponseRedacted;
    this.raw = evidence.raw;
    this.serviceContext = evidence.serviceContext;
    this.diagnosticCategory = evidence.diagnosticCategory;
    this.status = evidence.status;
  }
}

const sensitiveName = /(?:authorization|cookie|x[-_]?api[-_]?key|api[-_]?key|access[-_]?token|refresh[-_]?token|token|secret|password|credential)/i;
const sensitivePattern = /(authorization\s*[:=]\s*(?:bearer\s+)?|cookie\s*[:=]\s*|x[-_]?api[-_]?key\s*[:=]\s*|api[-_]?key\s*[:=]\s*|access[-_]?token\s*[:=]\s*|refresh[-_]?token\s*[:=]\s*|token\s*[:=]\s*|secret\s*[:=]\s*|password\s*[:=]\s*)[^\s,;"'}&]+/gi;
const quotedSensitivePattern = /((?:authorization|cookie|x[-_]?api[-_]?key|api[-_]?key|access[-_]?token|refresh[-_]?token|token|secret|password|credential)\s*["']?\s*[:=]\s*["']?)[^\s,;"'}&]+/gi;

function redactString(value: string): string {
  return value.replace(sensitivePattern, "$1[REDACTED]").replace(quotedSensitivePattern, "$1[REDACTED]");
}

function redactValue(value: unknown, key?: string): unknown {
  if (key && sensitiveName.test(key)) return "[REDACTED]";
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, redactValue(item, name)]));
  }
  return value;
}

export function redactQueryParams(params: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(params).map(([name, value]) => [name, String(redactValue(value, name))]));
}

function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    for (const [name, value] of parsed.searchParams.entries()) parsed.searchParams.set(name, String(redactValue(value, name)));
    return redactString(parsed.toString());
  } catch {
    return redactString(url);
  }
}

function rowsFromResponse(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw.filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null);
  if (typeof raw !== "object" || raw === null) return [];
  const record = raw as Record<string, unknown>;
  for (const key of ["results", "data", "results_data"]) {
    if (Array.isArray(record[key])) return record[key].filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null);
  }
  return [];
}

function responseWarnings(raw: unknown): string[] {
  if (typeof raw !== "object" || raw === null || !Array.isArray((raw as Record<string, unknown>).warnings)) return [];
  return (raw as { warnings: unknown[] }).warnings.map((warning) => redactString(String(warning))).slice(0, 100);
}

function classifyResponse(status: number, detail: string): QueryDiagnosticCategory {
  const lower = detail.toLowerCase();
  if (status === 401 || status === 403 || /credential|api[_ -]?key|authorization|bearer|token|password|secret/.test(lower)) return "credential";
  if (status === 400 || status === 422) return "request_validation";
  if (status === 404 || /provider|fetcher|dataset|source/.test(lower)) return "source_provider";
  if (status === 502 || status === 503 || status === 504) return "service_runtime";
  if (status >= 500) return "upstream_response";
  return "source_provider";
}

function targetFor(query: DatasetQuery): NativeQueryTarget {
  return { kind: "native", datasetId: query.datasetId ?? query.apiPath, providerId: query.provider, datasetName: query.datasetName };
}

function makeEvidence(query: DatasetQuery, startedAt: number, requestUrl: string, values: Record<string, string>): QueryEvidence {
  return {
    target: targetFor(query),
    submittedParams: redactQueryParams(values),
    requestPath: query.apiPath,
    requestUrl: redactUrl(requestUrl),
    completedAt: new Date().toISOString(),
    warnings: [],
    rawResponseAvailable: false,
    serviceContext: query.serviceContext,
    durationMs: Math.round(performance.now() - startedAt),
  };
}

export async function runDatasetQuery(query: DatasetQuery, request: typeof fetch = fetch): Promise<DatasetQueryResult> {
  const base = query.baseUrl.replace(/\/$/, "");
  const parameters = new URLSearchParams({ provider: query.provider });
  Object.entries(query.params).forEach(([name, value]) => { if (value !== "") parameters.set(name, value); });
  const requestUrl = `${base}${query.apiPath}?${parameters.toString()}`;
  const startedAt = performance.now();
  let response: Response;
  let text: string;
  try {
    response = await request(requestUrl, { headers: { Accept: "application/json" } });
    text = await response.text();
  } catch (failure) {
    const evidence = makeEvidence(query, startedAt, requestUrl, { provider: query.provider, ...query.params });
    const message = redactString(failure instanceof Error ? failure.message : String(failure));
    throw new DatasetQueryError(`Query service unavailable: ${message}`, { ...evidence, diagnosticCategory: "service_runtime", rawResponseUnavailableReason: "The OpenBB service did not return a response." });
  }

  const evidence = makeEvidence(query, startedAt, requestUrl, { provider: query.provider, ...query.params });
  let parsed: unknown;
  let parsedJson = true;
  try { parsed = JSON.parse(text); } catch { parsedJson = false; parsed = redactString(text); }
  const safeRaw = redactValue(parsed);
  const warnings = responseWarnings(safeRaw);
  const redacted = JSON.stringify(parsed) !== JSON.stringify(safeRaw);
  const completedEvidence = { ...evidence, durationMs: Math.round(performance.now() - startedAt), completedAt: new Date().toISOString(), warnings, rawResponseAvailable: true, rawResponseRedacted: redacted, raw: safeRaw, status: response.status, rowCount: rowsFromResponse(safeRaw).length };

  if (!response.ok) {
    const detail = typeof safeRaw === "object" && safeRaw !== null && "detail" in safeRaw ? String((safeRaw as { detail: unknown }).detail) : String(safeRaw);
    const category = classifyResponse(response.status, detail);
    throw new DatasetQueryError(redactString(`Query failed (${response.status}): ${detail}`), { ...completedEvidence, diagnosticCategory: category, status: response.status });
  }
  if (!parsedJson) {
    throw new DatasetQueryError("OpenBB returned a malformed non-JSON response.", { ...completedEvidence, diagnosticCategory: "upstream_response", rawResponseUnavailableReason: "The response body was not valid JSON." });
  }

  const rows = rowsFromResponse(safeRaw);
  return { ...completedEvidence, rows, rowCount: rows.length };
}
