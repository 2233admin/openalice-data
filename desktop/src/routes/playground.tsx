import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { DatasetQueryError, redactQueryParams, runDatasetQuery, type DatasetQueryResult, type QueryEvidence } from "../studio/actions";
import type { DatasetSummary } from "../studio/contracts";
import { recordStudioActivity } from "../studio/activity";
import { StudioPageHeader, StudioPageState } from "../studio/StudioPageState";
import { StudioLink } from "../studio/StudioLink";
import { useStudioState } from "../studio/queries";
import { VirtualResultTable } from "../studio/VirtualResultTable";
const ResultChart = lazy(() => import("../studio/ResultChart"));
type ResultTab = "table" | "chart" | "raw" | "usage" | "diagnostics";

type QueryValues = Record<string, string>;

function evidenceForUnavailableService(dataset: DatasetSummary, provider: string, values: QueryValues, serviceContext: QueryEvidence["serviceContext"]): DatasetQueryError {
  const submittedParams = redactQueryParams({ provider, ...values });
  return new DatasetQueryError("OpenBB 查询服务尚未启动。请先启动或修复 OpenBB API。", {
    target: { kind: "native", datasetId: dataset.id, providerId: provider, datasetName: dataset.display_name },
    submittedParams,
    requestPath: dataset.api_path,
    requestUrl: dataset.api_path,
    completedAt: new Date().toISOString(),
    warnings: [],
    rawResponseAvailable: false,
    rawResponseUnavailableReason: "OpenBB service is stopped or no backend URL is configured.",
    diagnosticCategory: "service_runtime",
    serviceContext,
  });
}

function evidenceFromFailure(failure: unknown, dataset: DatasetSummary, provider: string, values: QueryValues, serviceContext: QueryEvidence["serviceContext"]): DatasetQueryError {
  if (failure instanceof DatasetQueryError) return failure;
  const submittedParams = redactQueryParams({ provider, ...values });
  const message = failure instanceof Error ? failure.message : String(failure);
  return new DatasetQueryError(message, {
    target: { kind: "native", datasetId: dataset.id, providerId: provider, datasetName: dataset.display_name },
    submittedParams,
    requestPath: dataset.api_path,
    requestUrl: dataset.api_path,
    completedAt: new Date().toISOString(),
    warnings: [],
    rawResponseAvailable: false,
    rawResponseUnavailableReason: "The query did not return a response.",
    diagnosticCategory: "upstream_response",
    serviceContext,
  });
}

function activityForEvidence(evidence: QueryEvidence, succeeded: boolean, message?: string) {
  return {
    datasetId: evidence.target.datasetId,
    providerId: evidence.target.providerId,
    targetKind: evidence.target.kind,
    target: evidence.target,
    succeeded,
    at: evidence.completedAt,
    durationMs: evidence.durationMs,
    rowCount: evidence.rowCount,
    message,
    diagnosticCategory: evidence.diagnosticCategory,
    status: evidence.status,
    submittedParams: evidence.submittedParams,
    requestPath: evidence.requestPath,
    requestUrl: evidence.requestUrl,
    warnings: evidence.warnings,
    rawResponseAvailable: evidence.rawResponseAvailable,
    rawResponseRedacted: evidence.rawResponseRedacted,
    rawResponseUnavailableReason: evidence.rawResponseUnavailableReason,
    serviceContext: evidence.serviceContext,
  };
}



export function PlaygroundPage() {
  const query = useStudioState();
  const params = new URLSearchParams(window.location.search);
  const [datasetId, setDatasetId] = useState(params.get("dataset") ?? "");
  const [providerId, setProviderId] = useState(params.get("provider") ?? "");
  const [result, setResult] = useState<DatasetQueryResult>();
  const [failure, setFailure] = useState<DatasetQueryError>();
  const [tab, setTab] = useState<ResultTab>("table");
  const { register, handleSubmit, reset } = useForm<QueryValues>();
  const dataset = query.data?.snapshot.datasets.find((item) => item.id === datasetId) ?? query.data?.snapshot.datasets[0];
  const availableProviders = dataset?.providers ?? [];
  const provider = providerId || availableProviders[0]?.provider_id || "";
  const fields = useMemo(() => {
    const common = dataset?.common_query_fields.filter((field) => field.name !== "provider") ?? [];
    const specific = dataset?.provider_specific_query_fields[provider] ?? [];
    return [...common, ...specific.filter((field) => !common.some((item) => item.name === field.name))];
  }, [dataset, provider]);
  const serviceContext = query.data?.service ? {
    runtime: query.data.runtime,
    service: query.data.service.state,
    backend: query.data.service.backend?.url,
  } : undefined;

  const run = handleSubmit(async (values) => {
    if (!dataset) return;
    setFailure(undefined);
    setResult(undefined);
    if (query.data?.service.state !== "running" || !query.data.service.backend?.url) {
      const unavailable = evidenceForUnavailableService(dataset, provider, values, serviceContext);
      setFailure(unavailable);
      recordStudioActivity(activityForEvidence(unavailable, false, unavailable.message));
      return;
    }
    try {
      const next = await runDatasetQuery({
        baseUrl: query.data.service.backend.url,
        apiPath: dataset.api_path,
        provider,
        params: values,
        datasetId: dataset.id,
        datasetName: dataset.display_name,
        serviceContext,
      });
      setResult(next);
      recordStudioActivity(activityForEvidence(next, true));
    } catch (caught) {
      const nextFailure = evidenceFromFailure(caught, dataset, provider, values, serviceContext);
      setFailure(nextFailure);
      recordStudioActivity(activityForEvidence(nextFailure, false, nextFailure.message));
    }
  });

  const evidence = result ?? failure;
  const usageParams = evidence ? Object.entries(evidence.submittedParams).map(([name, value]) => `${name}=${JSON.stringify(value)}`).join(", ") : "";
  const recoveryRoute = failure?.diagnosticCategory === "service_runtime"
    ? "/backends"
    : failure?.diagnosticCategory === "credential" || failure?.diagnosticCategory === "source_provider"
      ? `/data-sources/${encodeURIComponent(provider)}`
      : undefined;
  const hasOutput = result !== undefined || failure !== undefined;

  return <StudioPageState error={query.error} isPending={query.isPending}>
    <div className="mx-auto w-full max-w-7xl overflow-auto py-6">
      <StudioPageHeader title="查询" description="选择 OpenBB 原生数据集和数据源，填写参数后通过现有 OpenBB API 运行真实查询。查询失败时会保留目标和安全参数，便于修复后重试。" />
      <div className="mt-5 grid grid-cols-[20rem_minmax(0,1fr)] gap-5">
        <form className="rounded border border-theme-outline bg-theme-primary p-5" onSubmit={(event) => void run(event)}>
          <p className="mb-4 text-xs text-theme-muted">目标类型：native · 原生数据集查询</p>
          <label className="block text-sm">数据集<select className="mt-1 w-full rounded border border-theme-outline bg-theme-secondary p-2" onChange={(event) => { setDatasetId(event.target.value); setProviderId(""); setResult(undefined); setFailure(undefined); reset(); }} value={dataset?.id ?? ""}>{query.data?.snapshot.datasets.map((item) => <option key={item.id} value={item.id}>{item.display_name} · {item.category}</option>)}</select></label>
          <label className="mt-4 block text-sm">数据源<select className="mt-1 w-full rounded border border-theme-outline bg-theme-secondary p-2" onChange={(event) => { setProviderId(event.target.value); setResult(undefined); setFailure(undefined); }} value={provider}>{availableProviders.map((item) => <option key={item.provider_id} value={item.provider_id}>{item.provider_id} · {item.state}</option>)}</select></label>
          {fields.map((field) => <label className="mt-4 block text-sm" key={field.name}>{field.name}{field.required && " *"}{field.choices?.length ? <select className="mt-1 w-full rounded border border-theme-outline bg-theme-secondary p-2" {...register(field.name, { required: field.required })}><option value="">请选择…</option>{field.choices.map((choice) => <option key={String(choice)} value={String(choice)}>{String(choice)}</option>)}</select> : <input className="mt-1 w-full rounded border border-theme-outline bg-theme-secondary p-2" {...register(field.name, { required: field.required })} />}<span className="mt-1 block text-xs text-theme-muted">{field.type}{field.description ? ` · ${field.description}` : ""}</span></label>)}
          <button className="mt-5 w-full rounded bg-theme-accent px-4 py-2 text-sm text-theme-primary-inverse" type="submit">运行查询</button>
          {query.data?.service.state !== "running" && <StudioLink className="mt-3 block text-center text-sm text-theme-accent" href="/backends">打开服务管理 →</StudioLink>}
        </form>
        <section className="min-w-0 rounded border border-theme-outline bg-theme-primary p-5">
          {failure && <div className="mb-4 rounded border border-red-400 p-3 text-sm text-red-500" role="alert"><span>{failure.message}</span><span className="mt-1 block text-xs">诊断分类：{failure.diagnosticCategory} · 目标和安全参数已保留，可修复后重试。</span>{recoveryRoute && <StudioLink className="mt-2 inline-block text-sm text-theme-accent" href={recoveryRoute}>前往修复 →</StudioLink>}</div>}
          {hasOutput && evidence ? <>
            <div className="mb-3 flex items-center justify-between text-xs text-theme-muted"><span>{evidence.target.datasetName ?? evidence.target.datasetId} · {evidence.target.providerId}</span><span>{evidence.completedAt}</span></div>
            <div className="flex gap-1 border-b border-theme-outline">{(["table", "chart", "raw", "usage", "diagnostics"] as ResultTab[]).map((item) => <button className={`px-3 py-2 text-sm capitalize ${tab === item ? "border-b-2 border-theme-accent" : "text-theme-muted"}`} key={item} onClick={() => setTab(item)} type="button">{item}</button>)}</div>
            {evidence.warnings.length > 0 && <div className="mb-3 rounded border border-yellow-500 p-2 text-sm"><strong>警告</strong><ul className="mt-1 list-disc pl-5">{evidence.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
            <div className="mt-4">
              {tab === "table" && result && <VirtualResultTable rows={result.rows} />}
              {tab === "table" && !result && <p className="text-sm text-theme-muted">本次查询没有可展示的结果行。</p>}
              {tab === "chart" && result && <Suspense fallback={<p>正在加载图表…</p>}><ResultChart rows={result.rows} /></Suspense>}
              {tab === "chart" && !result && <p className="text-sm text-theme-muted">查询失败后没有图表数据。</p>}
              {tab === "usage" && <pre className="whitespace-pre-wrap text-xs">{`# Python\nobb.${dataset?.python_path}(${usageParams})\n\n# REST\n${evidence.requestUrl}`}</pre>}
              {tab === "raw" && <>{evidence.rawResponseRedacted && <p className="mb-2 text-xs text-theme-muted">敏感值已隐藏。</p>}<pre className="max-h-96 overflow-auto text-xs">{evidence.rawResponseAvailable ? JSON.stringify(evidence.raw, null, 2) : evidence.rawResponseUnavailableReason}</pre></>}
            </div>
          </> : <div className="flex min-h-72 items-center justify-center text-sm text-theme-muted">请选择数据集并运行查询。</div>}
        </section>
      </div>
    </div>
  </StudioPageState>;
}

export const Route = createFileRoute("/playground")({ component: PlaygroundPage });
