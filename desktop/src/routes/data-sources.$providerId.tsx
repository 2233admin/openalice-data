import { Button } from "@openbb/ui-pro";
import { useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { StudioLink } from "../studio/StudioLink";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { latestProviderActivity, readStudioActivity } from "../studio/activity";
import { saveProviderCredentials } from "../studio/actions";
import { StatusPill, StudioPageHeader, StudioPageState } from "../studio/StudioPageState";
import { studioStateQueryKey, useStudioState } from "../studio/queries";

type ProviderTab = "overview" | "capabilities" | "credentials" | "health";

export function ProviderDetailPage({ providerId }: { providerId: string }) {
  const query = useStudioState();
  const queryClient = useQueryClient();
  const provider = query.data?.snapshot.providers.find((item) => item.id === providerId);
  const search = new URLSearchParams(window.location.search);
  const requestedTabValue = search.get("tab");
  const requestedTab = requestedTabValue && ["overview", "capabilities", "credentials", "health"].includes(requestedTabValue)
    ? requestedTabValue as ProviderTab
    : null;
  const requestedIntent = search.get("intent");
  const requestedDataset = search.get("dataset");
  const [tab, setTab] = useState<ProviderTab>(requestedIntent === "use" ? "capabilities" : requestedTab ?? "overview");
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
  const providerDataset = query.data?.snapshot.datasets.find((dataset) => dataset.providers.some((item) => item.provider_id === providerId));
  const selectedDatasetId = requestedDataset ?? providerDataset?.id;
  const sourceUseHref = selectedDatasetId ? `/data-sources/${encodeURIComponent(providerId)}?dataset=${encodeURIComponent(selectedDatasetId)}&intent=use` : "/data-sources";
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
              <>
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

function ProviderDetailRoute() { const { providerId } = Route.useParams(); return <ProviderDetailPage providerId={providerId} />; }
export const Route = createFileRoute("/data-sources/$providerId")({ component: ProviderDetailRoute });
