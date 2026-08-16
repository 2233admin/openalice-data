import { Button } from "@openbb/ui-pro";
import { useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { StudioLink } from "../studio/StudioLink";
import { useEffect, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { latestProviderActivity, readStudioActivity } from "../studio/activity";
import { DatasetQueryError, runDatasetQuery, saveProviderCredentials, type DatasetQueryResult } from "../studio/actions";
import type { StudioServiceState } from "../studio/client";
import type { DatasetSummary, ProviderSummary, StudioSnapshot } from "../studio/contracts";
import { StatusPill, StudioPageHeader, StudioPageState } from "../studio/StudioPageState";
import { studioStateQueryKey, useStudioState } from "../studio/queries";

type ProviderTab = "overview" | "capabilities" | "credentials" | "health";
type ProviderDetailSearch = { tab?: ProviderTab; intent?: "use"; dataset?: string };

export function ProviderDetailPage({ providerId, routeSearch }: { providerId: string; routeSearch?: ProviderDetailSearch }) {
  const query = useStudioState();
  const queryClient = useQueryClient();
  const provider = query.data?.snapshot.providers.find((item) => item.id === providerId);
  const browserSearch = new URLSearchParams(window.location.search);
  const requestedTabValue = routeSearch ? routeSearch.tab ?? null : browserSearch.get("tab");
  const requestedTab = requestedTabValue && ["overview", "capabilities", "credentials", "health"].includes(requestedTabValue) ? requestedTabValue as ProviderTab : null;
  const requestedIntent = routeSearch ? routeSearch.intent ?? null : browserSearch.get("intent");
  const requestedDataset = routeSearch ? routeSearch.dataset ?? null : browserSearch.get("dataset");
  const [tab, setTab] = useState<ProviderTab>(requestedIntent === "use" ? "capabilities" : requestedTab ?? "overview");
  useEffect(() => {
    if (requestedIntent === "use") setTab("capabilities");
    else if (requestedTab) setTab(requestedTab);
  }, [requestedIntent, requestedTab]);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { register, handleSubmit, reset } = useForm<Record<string, string>>();
  const last = latestProviderActivity(providerId, readStudioActivity());
  const requiredCredentials = provider?.credential_fields.filter((field) => field.required) ?? [];
  const configuredCredentials = requiredCredentials.filter((field) => field.configured);
  const missingCredentials = requiredCredentials.filter((field) => !field.configured);
  const credentialMetadataUnknown = provider?.credential_metadata_status === "unknown"
    || (!provider?.credential_metadata_status && !provider?.credential_fields.length);
  const credentialStatus = credentialMetadataUnknown
    ? "OpenBB 未报告凭证要求"
    : requiredCredentials.length
      ? `${configuredCredentials.length}/${requiredCredentials.length} 个必填凭证已配置`
      : "无需凭证";

  const save = handleSubmit(async (values) => {
    const changedValues = Object.fromEntries(
      Object.entries(values).filter(([, value]) => value.trim().length > 0),
    );
    if (!Object.keys(changedValues).length) {
      setMessage("没有需要保存的新凭证值。");
      return;
    }
    setIsSaving(true);
    setMessage("正在保存…");
    try {
      await saveProviderCredentials(changedValues);
      await queryClient.invalidateQueries({ queryKey: studioStateQueryKey });
      reset();
      setMessage("凭证已保存。请从当前数据源的使用入口验证是否可用。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  });

  const tabLabels: Record<ProviderTab, string> = {
    overview: "概览",
    capabilities: "数据能力",
    credentials: "凭证",
    health: "健康检查",
  };
  const serviceAction = query.data?.snapshot.actions.find((action) => action.entity_type === "service");
  const providerDatasets = query.data?.snapshot.datasets.filter((dataset) => dataset.providers.some((item) => item.provider_id === providerId)) ?? [];
  const capabilityUsability = (dataset: DatasetSummary) => nativeCapabilityUsability({
    dataset,
    provider,
    providerId,
    service: query.data?.service,
    freshness: query.data?.snapshot.freshness,
  });
  const usableProviderDatasets = providerDatasets.filter((dataset) => capabilityUsability(dataset).usable);
  const providerDataset = providerDatasets[0];
  const selectedDatasetId = requestedDataset ?? (usableProviderDatasets.length === 1 ? usableProviderDatasets[0]?.id : undefined);
  const selectedDataset = providerDatasets.find((dataset) => dataset.id === selectedDatasetId);
  const sourceUseDatasetId = requestedDataset ?? (providerDatasets.length === 1 ? providerDataset?.id : undefined);
  const sourceUseHref = sourceUseDatasetId
    ? `/data-sources/${encodeURIComponent(providerId)}?dataset=${encodeURIComponent(sourceUseDatasetId)}&intent=use`
    : providerDatasets.length ? `/data-sources/${encodeURIComponent(providerId)}?intent=use` : "/data-sources";
  const maintenanceHref = serviceAction?.action_route?.startsWith("/backends") ? serviceAction.action_route : "/backends";
  return (
    <StudioPageState error={query.error} isPending={query.isPending}>
      {provider ? (
        <div className="mx-auto w-full max-w-6xl overflow-auto py-6">
          <StudioPageHeader
            title={provider.display_name}
            description={`Provider ${provider.id} · OpenBB 报告 ${provider.capability_count} 项数据能力。`}
            action={<StudioLink className="rounded bg-theme-accent px-4 py-2 text-sm text-theme-primary-inverse" href={sourceUseHref}>{providerDataset ? "使用" : "返回数据源选择目标"}</StudioLink>}
          />
          <nav aria-label="数据源设置" className="mt-5 overflow-x-auto border-b border-theme-outline">
            <div className="flex min-w-max gap-1" role="tablist">
              {(["overview", "capabilities", "credentials", "health"] as ProviderTab[]).map((item) => (
                <button
                  aria-selected={tab === item}
                  className={`px-4 py-2 text-sm ${tab === item ? "border-b-2 border-theme-accent" : "text-theme-muted"}`}
                  key={item}
                  onClick={() => setTab(item)}
                  role="tab"
                  type="button"
                >
                  {tabLabels[item]}
                </button>
              ))}
            </div>
          </nav>
          <section className="mt-5 rounded border border-theme-outline bg-theme-primary p-5">
            {tab === "overview" && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">Provider 概览</h2>
                    <p className="mt-1 text-sm text-theme-muted">{provider.state_description ?? "OpenBB 未提供更多状态说明。"}</p>
                  </div>
                  <StatusPill value={provider.status} />
                </div>
                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <Item label="稳定标识" value={provider.id} />
                  <Item label="Provider 名称" value={provider.name} />
                  <Item label="版本" value={provider.version ?? "未报告"} />
                  <Item label="数据能力" value={`${provider.capability_count} 项`} />
                  <Item label="凭证状态" value={credentialStatus} />
                  <Item label="最近测试" value={last ? `${last.succeeded ? "通过" : "失败"} · ${new Date(last.at).toLocaleString("zh-CN")}` : "尚未测试"} />
                </dl>
                <div className="mt-5 flex flex-wrap gap-4 text-sm">
                  <button className="text-theme-accent" onClick={() => setTab("credentials")} type="button">配置凭证</button>
                  <StudioLink className="text-theme-accent" href={sourceUseHref}>使用数据源</StudioLink>
                  <button className="text-theme-accent" onClick={() => setTab("capabilities")} type="button">打开数据能力</button>
                </div>
              </>
            )}

            {tab === "capabilities" && (
              requestedIntent === "use" && selectedDataset ? (
                <NativeCapabilityUsePanel dataset={selectedDataset} providerId={provider.id} runtime={query.data?.runtime} service={query.data?.service} usability={capabilityUsability(selectedDataset)} />
              ) : requestedIntent === "use" && usableProviderDatasets.length > 1 ? (
                <NativeCapabilityChooser datasets={usableProviderDatasets} providerId={provider.id} providerName={provider.display_name} />
              ) : requestedIntent === "use" && usableProviderDatasets.length === 0 ? (
                <p aria-live="polite" className="text-sm text-theme-muted" role="status">当前没有可直接使用的数据能力。请查看各能力的实时可用性。</p>
              ) : <>
                <h2 className="font-semibold">可使用的数据能力</h2>
                <p className="mt-1 text-sm text-theme-muted">能力标识来自当前 ODP/OpenBB coverage；使用入口保留所选 Provider 和数据集身份。</p>
                {provider.capabilities.length ? (
                  <ul className="mt-3 divide-y divide-theme-outline">
                    {provider.capabilities.map((capability) => (
                      <li className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm" key={capability}>
                        <code className="break-all">{capability}</code>
                        <StudioLink className="text-theme-accent" href={`/data-sources/${encodeURIComponent(provider.id)}?dataset=${encodeURIComponent(capability)}&intent=use`}>使用</StudioLink>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-theme-muted">ODP 已报告这个 Provider，但没有返回可使用的能力标识。</p>
                )}
              </>
            )}

            {tab === "credentials" && (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">访问凭证</h2>
                    <p className="mt-1 text-sm text-theme-muted">{credentialStatus}。已保存的值不会显示在此页面。</p>
                  </div>
                  <StatusPill value={credentialMetadataUnknown ? "partial" : missingCredentials.length ? "credential_required" : provider.credential_fields.length ? "ready_to_test" : "available"} />
                </div>
                {provider.credential_fields.length ? (
                  <form className="mt-4 max-w-xl space-y-4" onSubmit={(event) => void save(event)}>
                    {provider.credential_fields.map((field) => (
                      <label className="block" key={field.name}>
                        <span className="flex items-center justify-between gap-3 text-sm">
                          <span>{field.name}{field.required ? " *" : ""}</span>
                          <span className="text-xs text-theme-muted">{field.configured ? "已配置" : "未配置"}</span>
                        </span>
                        <input
                          aria-describedby={`${field.name}-credential-help`}
                          autoComplete="off"
                          className="mt-1 w-full rounded border border-theme-outline bg-theme-secondary p-2"
                          placeholder={field.configured ? "保留为空可继续使用当前值" : "输入凭证值"}
                          type="password"
                          {...register(field.name, { required: field.required && !field.configured })}
                        />
                        <span className="mt-1 block text-xs text-theme-muted" id={`${field.name}-credential-help`}>
                          {field.configured ? "当前值已安全保存；只有输入新值时才会替换。" : "凭证值只会提交到现有 Desktop 凭证存储。"}
                        </span>
                      </label>
                    ))}
                    <div className="flex flex-wrap items-center gap-4">
                      <Button disabled={isSaving} type="submit">{isSaving ? "正在保存…" : "保存凭证"}</Button>
                      <StudioLink className="text-sm text-theme-accent" href={sourceUseHref}>使用数据源</StudioLink>
                    </div>
                    <p aria-live="polite" className="text-sm text-theme-muted">{message}</p>
                  </form>
                ) : credentialMetadataUnknown ? (
                  <div className="mt-4 text-sm">
                    <p className="text-theme-muted">无法确认这个 Provider 是否需要凭证。请在 ODP API Keys 检查 OpenBB Registry 配置。</p>
                    <StudioLink className="mt-3 inline-block text-theme-accent" href="/api-keys">打开 ODP API Keys</StudioLink>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-theme-muted">OpenBB 明确报告这个 Provider 不需要凭证。</p>
                )}
              </>
            )}

            {tab === "health" && (
              <>
                <h2 className="font-semibold">健康检查</h2>
                <div className="mt-3 divide-y divide-theme-outline">
                  <Health
                    detail={query.data?.snapshot.freshness.status === "fresh"
                      ? `实时检查于 ${query.data.snapshot.freshness.inspected_at ? new Date(query.data.snapshot.freshness.inspected_at).toLocaleString("zh-CN") : "未知时间"}完成`
                      : `检查状态：${query.data?.snapshot.freshness.status ?? "未知"}`}
                    label="OpenBB 检查"
                    state={query.data?.snapshot.freshness.status === "fresh" ? "available" : query.data?.snapshot.freshness.status === "stale" ? "partial" : "setup_required"}
                  />
                  <Health detail={provider.state_description ?? "Provider 来自当前 OpenBB 实时清单"} label="Provider 状态" state={provider.status} />
                  <Health
                    detail={query.data?.service.state === "running" ? "OpenBB API 正在运行" : query.data?.service.error ?? "请在服务管理启动或修复 OpenBB 服务"}
                    label="ODP 服务"
                    state={query.data?.service.state === "running" ? "available" : query.data?.service.state === "error" ? "failed" : "setup_required"}
                  />
                  <Health
                    detail={credentialMetadataUnknown ? "OpenBB 未报告凭证要求" : credentialStatus}
                    label="凭证"
                    state={credentialMetadataUnknown ? "partial" : missingCredentials.length ? "credential_required" : last?.succeeded ? "available" : "ready_to_test"}
                  />
                  <Health
                    detail={last ? `${last.succeeded ? "通过" : "失败"} · ${new Date(last.at).toLocaleString("zh-CN")}` : "尚未使用此来源"}
                    label="最近使用"
                    state={last ? last.succeeded ? "available" : "failed" : "ready_to_test"}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <StudioLink className="text-theme-accent" href={sourceUseHref}>使用数据源</StudioLink>
                  {query.data?.service.state !== "running" && <StudioLink className="text-theme-accent" href={maintenanceHref}>打开 ODP Backends</StudioLink>}
                </div>
              </>
            )}
          </section>
        </div>
      ) : (
        <section className="mx-auto my-12 w-full max-w-3xl rounded border border-theme-outline bg-theme-primary p-6" role="status">
          <h1 className="text-xl font-semibold">{query.data?.service.state === "running" ? "没有找到这个 Provider" : "尚无法打开 Provider"}</h1>
          <p className="mt-2 text-sm text-theme-muted">
            {query.data?.service.state === "running"
              ? `当前 OpenBB 实时清单中没有 ${providerId}。它可能已被移除或检查结果已变化。`
              : "OpenBB 服务未运行，因此当前没有实时 Provider 清单可供确认。"}
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <Link className="text-theme-accent" to="/data-sources">返回数据源</Link>
            {query.data?.service.state !== "running" && <StudioLink className="text-theme-accent" href={maintenanceHref}>打开 ODP Backends</StudioLink>}
          </div>
        </section>
      )}
    </StudioPageState>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-theme-muted">{label}</dt><dd className="mt-1 break-all">{value}</dd></div>;
}

function Health({ label, state, detail }: { label: string; state: string; detail: string }) {
  return <div className="grid gap-2 py-3 text-sm sm:grid-cols-[10rem_8rem_minmax(0,1fr)] sm:items-center"><strong>{label}</strong><StatusPill value={state} /><span className="text-theme-muted">{detail}</span></div>;
}

type NativeOperationState = "ready" | "preparing" | "running" | "succeeded" | "invalid-input" | "failed";

type NativeCapabilityUsability = { usable: true } | { usable: false; state: "credential-required" | "unavailable"; reason: string };

type NativeCapabilityUseProps = { dataset: DatasetSummary; providerId: string; runtime?: string; service?: StudioServiceState; usability: NativeCapabilityUsability };

function nativeCapabilityUsability({ dataset, provider, providerId, service, freshness }: {
  dataset: DatasetSummary;
  provider: ProviderSummary;
  providerId: string;
  service?: StudioServiceState;
  freshness?: StudioSnapshot["freshness"];
}): NativeCapabilityUsability {
  const datasetProvider = dataset.providers.find((item) => item.provider_id === providerId);
  const missingCredential = provider.credential_fields.some((field) => field.required && !field.configured);
  if (provider.status === "credential_required" || missingCredential) {
    return { usable: false, state: "credential-required", reason: "此 Provider 仍缺少 ODP 管理的必填凭证。" };
  }
  if (service?.state !== "running" || !service.backend?.url) {
    return { usable: false, state: "unavailable", reason: "ODP/OpenBB 服务当前不可用。" };
  }
  if (freshness?.status !== "fresh" || freshness.source !== "live") {
    return { usable: false, state: "unavailable", reason: "当前能力证据不是实时检查结果。" };
  }
  if (!datasetProvider || !["available", "ready_to_test"].includes(datasetProvider.state)) {
    return { usable: false, state: "unavailable", reason: datasetProvider?.state_description ?? "当前检查未报告此 Provider 的能力可用。" };
  }
  if (["failed", "not_installed", "installed_not_applied", "setup_required", "updating"].includes(provider.status)) {
    return { usable: false, state: "unavailable", reason: provider.state_description ?? "当前 Provider 尚不可用。" };
  }
  return { usable: true };
}

function capabilityFields(dataset: DatasetSummary, providerId: string) {
  const common = dataset.common_query_fields.filter((field) => field.name !== "provider");
  return [...common, ...(dataset.provider_specific_query_fields[providerId] ?? []).filter((field) => !common.some((item) => item.name === field.name))];
}

function capabilityAvailability(dataset: DatasetSummary, providerId: string): string {
  const provider = dataset.providers.find((item) => item.provider_id === providerId);
  return provider ? `${provider.state}${provider.state_description ? ` · ${provider.state_description}` : ""}` : "unavailable · 当前检查未报告该 Provider";
}

function NativeCapabilityUsePanel(props: NativeCapabilityUseProps) {
  const fields = capabilityFields(props.dataset, props.providerId);
  const supportedTypes = new Set(["str", "string", "int", "integer", "float", "number", "bool", "boolean", "date", "datetime"]);
  const sensitiveField = /(?:authorization|cookie|api[-_]?key|token|secret|password|credential)/i;
  const hasSensitiveField = fields.some((field) => sensitiveField.test(field.name));
  const supportsInlineUse = Array.isArray(props.dataset.response_fields)
    && fields.every((field) => supportedTypes.has(field.type.toLowerCase()));
  if (!props.usability.usable) {
    return (
      <section aria-labelledby="native-capability-blocked-heading">
        <h2 className="font-semibold" id="native-capability-blocked-heading">使用 {props.dataset.display_name}</h2>
        <CapabilityIdentity dataset={props.dataset} providerId={props.providerId} />
        <p aria-live="polite" className="mt-3 text-sm text-theme-muted" role="status">
          {props.usability.state === "credential-required" ? "需要凭证" : "当前不可用"}：{props.usability.reason}
        </p>
      </section>
    );
  }
  if (hasSensitiveField) {
    return (
      <section aria-labelledby="native-capability-credential-heading">
        <h2 className="font-semibold" id="native-capability-credential-heading">使用 {props.dataset.display_name}</h2>
        <CapabilityIdentity dataset={props.dataset} providerId={props.providerId} />
        <p aria-live="polite" className="mt-3 text-sm text-theme-muted" role="status">需要凭证：检查结果包含凭证或 secret header 字段，本页不会收集、渲染或转交这些值。</p>
        <StudioLink className="mt-4 inline-block text-sm text-theme-accent" href="/api-keys">在 ODP API Keys 中管理凭证</StudioLink>
      </section>
    );
  }
  if (!supportsInlineUse) {
    const handoffHref = `/query?dataset=${encodeURIComponent(props.dataset.id)}&provider=${encodeURIComponent(props.providerId)}`;
    return (
      <section aria-labelledby="native-capability-handoff-heading">
        <h2 className="font-semibold" id="native-capability-handoff-heading">使用 {props.dataset.display_name}</h2>
        <CapabilityIdentity dataset={props.dataset} providerId={props.providerId} />
        <p className="mt-2 text-sm text-theme-muted">当前检查结果没有提供可安全生成内联表单和结果视图的完整 schema。OpenAlice 不会猜测参数。</p>
        <StudioLink className="mt-4 inline-block text-sm text-theme-accent" href={handoffHref}>在现有 ODP/OpenBB 消费端打开</StudioLink>
      </section>
    );
  }
  return <InlineNativeCapabilityUsePanel {...props} fields={fields} />;
}

function CapabilityIdentity({ dataset, providerId }: Pick<NativeCapabilityUseProps, "dataset" | "providerId">) {
  return (
    <>
      <p className="mt-1 text-sm text-theme-muted">Provider: {providerId} · Dataset/API: {dataset.id} · {dataset.api_path}</p>
      <p className="mt-1 text-sm text-theme-muted">可用性: {capabilityAvailability(dataset, providerId)}</p>
    </>
  );
}

function InlineNativeCapabilityUsePanel({ dataset, providerId, runtime, service, fields }: NativeCapabilityUseProps & { fields: ReturnType<typeof capabilityFields> }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [operationState, setOperationState] = useState<NativeOperationState>("ready");
  const [result, setResult] = useState<DatasetQueryResult>();
  const [message, setMessage] = useState("");
  const statusLabel: Record<NativeOperationState, string> = { ready: "准备就绪", preparing: "正在准备", running: "正在运行", succeeded: "使用成功", "invalid-input": "输入无效", failed: "使用失败" };

  async function run(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const missing = fields.find((field) => field.required && !values[field.name]?.trim());
    if (missing) {
      setOperationState("invalid-input");
      setMessage(`请填写必填字段：${missing.name}`);
      return;
    }
    if (service?.state !== "running" || !service.backend?.url) {
      setOperationState("failed");
      setMessage("ODP/OpenBB 服务当前不可用。");
      return;
    }
    setResult(undefined);
    setMessage("");
    setOperationState("preparing");
    await Promise.resolve();
    setOperationState("running");
    try {
      const next = await runDatasetQuery({
        baseUrl: service.backend.url,
        apiPath: dataset.api_path,
        provider: providerId,
        params: values,
        datasetId: dataset.id,
        datasetName: dataset.display_name,
        serviceContext: { runtime, service: service.state, backend: service.backend.id },
      });
      setResult(next);
      setOperationState("succeeded");
    } catch (failure) {
      setOperationState(failure instanceof DatasetQueryError && failure.diagnosticCategory === "request_validation" ? "invalid-input" : "failed");
      setMessage(failure instanceof DatasetQueryError || failure instanceof Error ? failure.message : String(failure));
    }
  }

  return (
    <section aria-labelledby="native-capability-use-heading">
      <h2 className="font-semibold" id="native-capability-use-heading">使用 {dataset.display_name}</h2>
      <CapabilityIdentity dataset={dataset} providerId={providerId} />
      <p aria-live="polite" className="mt-3 text-sm text-theme-muted" role="status">
        {statusLabel[operationState]}{message ? `：${message}` : ""}
      </p>
      <form className="mt-4 max-w-xl" onSubmit={(event) => void run(event)}>
        {fields.map((field) => {
          const label = `${field.name}${field.required ? " *" : ""}`;
          return (
            <label className="mt-3 block text-sm" key={field.name}>
              {label}
              {field.choices?.length ? (
                <select
                  aria-label={label}
                  className="mt-1 w-full rounded border border-theme-outline bg-theme-secondary p-2"
                  onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                  value={values[field.name] ?? ""}
                >
                  <option value="">请选择…</option>
                  {field.choices.map((choice) => <option key={String(choice)} value={String(choice)}>{String(choice)}</option>)}
                </select>
              ) : (
                <input
                  aria-label={label}
                  className="mt-1 w-full rounded border border-theme-outline bg-theme-secondary p-2"
                  onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                  value={values[field.name] ?? ""}
                />
              )}
              <span className="mt-1 block text-xs text-theme-muted">{field.type}{field.description ? ` · ${field.description}` : ""}</span>
            </label>
          );
        })}
        <button
          className="mt-5 rounded bg-theme-accent px-4 py-2 text-sm text-theme-primary-inverse disabled:opacity-50"
          disabled={operationState === "preparing" || operationState === "running"}
          type="submit"
        >
          使用数据能力
        </button>
      </form>
      {result && (
        <section className="mt-5 rounded border border-theme-outline bg-theme-secondary p-4" aria-label="使用结果">
          <p className="text-sm font-medium">请求 {result.requestPath} · 返回 {result.rows.length} 行</p>
          {result.warnings.length > 0 && <p className="mt-1 text-xs text-theme-muted">警告：{result.warnings.join("；")}</p>}
          <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(result.rows, null, 2)}</pre>
        </section>
      )}
    </section>
  );
}

function NativeCapabilityChooser({ datasets, providerId, providerName }: { datasets: DatasetSummary[]; providerId: string; providerName: string }) {
  return (
    <section aria-labelledby="native-capability-chooser-heading">
      <h2 className="font-semibold" id="native-capability-chooser-heading">选择 {providerName} 的数据能力</h2>
      <p className="mt-1 text-sm text-theme-muted">这些选项来自当前 ODP/OpenBB 检查；请选择一个准确的 dataset/API。</p>
      <p aria-live="polite" className="mt-2 text-sm text-theme-muted" role="status">正在选择数据能力</p>
      <ul className="mt-3 divide-y divide-theme-outline">
        {datasets.map((dataset) => (
          <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={dataset.id}>
            <div>
              <strong>{dataset.display_name}</strong>
              <p className="mt-1 break-all text-xs text-theme-muted">{dataset.id} · {dataset.api_path}</p>
            </div>
            <StudioLink className="text-sm text-theme-accent" href={`/data-sources/${encodeURIComponent(providerId)}?dataset=${encodeURIComponent(dataset.id)}&intent=use`}>{dataset.display_name}</StudioLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProviderDetailRoute() {
  const { providerId } = Route.useParams();
  return <ProviderDetailPage providerId={providerId} routeSearch={Route.useSearch()} />;
}

export const Route = createFileRoute("/data-sources/$providerId")({
  validateSearch: (search: Record<string, unknown>): ProviderDetailSearch => ({
    ...(["overview", "capabilities", "credentials", "health"].includes(String(search.tab)) ? { tab: search.tab as ProviderTab } : {}),
    ...(search.intent === "use" ? { intent: "use" as const } : {}),
    ...(typeof search.dataset === "string" && search.dataset.length > 0 ? { dataset: search.dataset } : {}),
  }),
  component: ProviderDetailRoute,
});
