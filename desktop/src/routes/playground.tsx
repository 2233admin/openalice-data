import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { runDatasetQuery, type DatasetQueryResult } from "../studio/actions";
import { recordStudioActivity } from "../studio/activity";
import { StudioPageHeader, StudioPageState } from "../studio/StudioPageState";
import { useStudioState } from "../studio/queries";
import { VirtualResultTable } from "../studio/VirtualResultTable";

const ResultChart = lazy(() => import("../studio/ResultChart"));
type ResultTab = "table" | "chart" | "raw" | "usage" | "diagnostics";

export function PlaygroundPage() {
  const query = useStudioState();
  const params = new URLSearchParams(window.location.search);
  const [datasetId, setDatasetId] = useState(params.get("dataset") ?? "");
  const [providerId, setProviderId] = useState(params.get("provider") ?? "");
  const [result, setResult] = useState<DatasetQueryResult>();
  const [error, setError] = useState("");
  const [tab, setTab] = useState<ResultTab>("table");
  const { register, handleSubmit, reset } = useForm<Record<string, string>>();
  const dataset = query.data?.snapshot.datasets.find((item) => item.id === datasetId) ?? query.data?.snapshot.datasets[0];
  const availableProviders = dataset?.providers ?? [];
  const provider = providerId || availableProviders[0]?.provider_id || "";
  const fields = useMemo(() => {
    const common = dataset?.common_query_fields.filter((field) => field.name !== "provider") ?? [];
    const specific = dataset?.provider_specific_query_fields[provider] ?? [];
    return [...common, ...specific.filter((field) => !common.some((item) => item.name === field.name))];
  }, [dataset, provider]);
  const run = handleSubmit(async (values) => {
    if (!dataset || !query.data?.service.backend?.url) { setError("OpenBB 查询服务尚未启动。请先到顶部“服务”页面启动 OpenBB API。"); return; }
    setError("");
    try {
      const next = await runDatasetQuery({ baseUrl: query.data.service.backend.url, apiPath: dataset.api_path, provider, params: values });
      setResult(next);
      recordStudioActivity({ datasetId: dataset.id, providerId: provider, succeeded: true, at: new Date().toISOString(), durationMs: next.durationMs, rowCount: next.rows.length });
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : String(failure);
      setError(message);
      recordStudioActivity({ datasetId: dataset.id, providerId: provider, succeeded: false, at: new Date().toISOString(), message });
    }
  });
  const pythonArguments = result ? Object.entries(result.submittedParams).map(([name, value]) => `${name}=${JSON.stringify(value)}`).join(", ") : "";
  return <StudioPageState error={query.error} isPending={query.isPending}><div className="mx-auto w-full max-w-7xl overflow-auto py-6"><StudioPageHeader title="查询" description="选择数据集和数据源，填写参数后通过当前 OpenBB API 运行真实查询。" /><div className="mt-5 grid grid-cols-[20rem_minmax(0,1fr)] gap-5"><form className="rounded border border-theme-outline bg-theme-primary p-5" onSubmit={(event) => void run(event)}><label className="block text-sm">数据集<select className="mt-1 w-full rounded border border-theme-outline bg-theme-secondary p-2" onChange={(event) => { setDatasetId(event.target.value); setProviderId(""); reset(); }} value={dataset?.id ?? ""}>{query.data?.snapshot.datasets.map((item) => <option key={item.id} value={item.id}>{item.display_name} · {item.category}</option>)}</select></label><label className="mt-4 block text-sm">数据源<select className="mt-1 w-full rounded border border-theme-outline bg-theme-secondary p-2" onChange={(event) => setProviderId(event.target.value)} value={provider}>{availableProviders.map((item) => <option key={item.provider_id} value={item.provider_id}>{item.provider_id}</option>)}</select></label>{fields.map((field) => <label className="mt-4 block text-sm" key={field.name}>{field.name}{field.required && " *"}{field.choices?.length ? <select className="mt-1 w-full rounded border border-theme-outline bg-theme-secondary p-2" {...register(field.name, { required: field.required })}><option value="">请选择…</option>{field.choices.map((choice) => <option key={String(choice)} value={String(choice)}>{String(choice)}</option>)}</select> : <input className="mt-1 w-full rounded border border-theme-outline bg-theme-secondary p-2" {...register(field.name, { required: field.required })} />}<span className="mt-1 block text-xs text-theme-muted">{field.type}{field.description ? ` · ${field.description}` : ""}</span></label>)}<button className="mt-5 w-full rounded bg-theme-accent px-4 py-2 text-sm text-theme-primary-inverse" type="submit">运行查询</button>{query.data?.service.state !== "running" && <a className="mt-3 block text-center text-sm text-theme-accent" href="/backends">打开查询服务 →</a>}</form><section className="min-w-0 rounded border border-theme-outline bg-theme-primary p-5">{error && <div className="mb-4 rounded border border-red-400 p-3 text-sm text-red-500" role="alert">{error}</div>}{result ? <><div className="flex gap-1 border-b border-theme-outline">{(["table", "chart", "raw", "usage", "diagnostics"] as ResultTab[]).map((item) => <button className={`px-3 py-2 text-sm capitalize ${tab === item ? "border-b-2 border-theme-accent" : "text-theme-muted"}`} key={item} onClick={() => setTab(item)} type="button">{item}</button>)}</div><div className="mt-4">{tab === "table" && <VirtualResultTable rows={result.rows} />}{tab === "chart" && <Suspense fallback={<p>正在加载图表…</p>}><ResultChart rows={result.rows} /></Suspense>}{tab === "raw" && <pre className="max-h-96 overflow-auto text-xs">{JSON.stringify(result.raw, null, 2)}</pre>}{tab === "usage" && <pre className="whitespace-pre-wrap text-xs">{`# Python\nobb.${dataset?.python_path}(${pythonArguments})\n\n# REST\n${result.requestUrl}`}</pre>}{tab === "diagnostics" && <><dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-theme-muted">数据源</dt><dd>{provider}</dd></div><div><dt className="text-theme-muted">耗时</dt><dd>{result.durationMs} ms</dd></div><div><dt className="text-theme-muted">返回行数</dt><dd>{result.rows.length}</dd></div><div><dt className="text-theme-muted">接口</dt><dd className="break-all">{dataset?.api_path}</dd></div></dl><div className="mt-4"><h3 className="text-sm font-semibold">警告</h3>{result.warnings.length ? <ul className="mt-1 list-disc pl-5 text-sm">{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : <p className="text-sm text-theme-muted">没有数据源警告。</p>}</div></>}</div></> : <div className="flex min-h-72 items-center justify-center text-sm text-theme-muted">请选择数据集并运行查询。</div>}</section></div></div></StudioPageState>;
}

export const Route = createFileRoute("/playground")({ component: PlaygroundPage });
