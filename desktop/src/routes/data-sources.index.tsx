import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { ProviderSummary, StudioFreshness } from "../studio/contracts";
import { latestProviderActivity, readStudioActivity } from "../studio/activity";
import { ServiceStartAction } from "../studio/ServiceStartAction";
import { StatusPill, StudioPageHeader, StudioPageState } from "../studio/StudioPageState";
import { useStudioState } from "../studio/queries";

export function DataSourcesPage() {
  const query = useStudioState();
  const [search, setSearch] = useState("");
  const snapshot = query.data?.snapshot;
  const providers = useMemo(
    () => snapshot?.providers.filter((provider) =>
      `${provider.display_name} ${provider.name} ${provider.id}`.toLowerCase().includes(search.trim().toLowerCase()),
    ) ?? [],
    [search, snapshot],
  );
  const activity = readStudioActivity();
  const serviceAction = snapshot?.actions.find((action) => action.entity_type === "service");

  return (
    <StudioPageState error={query.error} isPending={query.isPending}>
      <div className="mx-auto w-full max-w-6xl overflow-auto py-6">
        <StudioPageHeader
          title="数据源"
          description="这些 Provider 由当前 OpenBB 运行环境实时报告；它们不会被自动加入工作区。"
          action={<div className="flex flex-wrap gap-3"><Link className="rounded border border-theme-outline px-4 py-2 text-sm text-theme-accent" to="/data-catalog">数据目录</Link><Link className="rounded bg-theme-accent px-4 py-2 text-sm text-theme-primary-inverse" to="/data-sources/add">添加数据源</Link></div>}
        />

        {snapshot && (
          <InspectionSummary
            actionLabel={serviceAction?.action_label}
            actionRoute={serviceAction?.action_route}
            backendId={query.data?.service.backend?.id}
            freshness={snapshot.freshness}
            onStarted={query.refetch}
            serviceState={query.data?.service.state}
          />
        )}

        <label className="mt-5 block max-w-md">
          <span className="sr-only">搜索数据源</span>
          <input
            className="w-full rounded border border-theme-outline bg-theme-primary px-3 py-2 text-sm"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="按名称或 Provider 标识搜索"
            value={search}
          />
        </label>

        {snapshot?.providers.length ? (
          providers.length ? (
            <div className="mt-4 divide-y divide-theme-outline rounded border border-theme-outline bg-theme-primary">
              {providers.map((provider) => {
                const last = latestProviderActivity(provider.id, activity);
                const credential = credentialSummary(provider);
                return (
                  <article className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center" key={provider.id}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-semibold">{provider.display_name}</h2>
                        <StatusPill value={provider.status} />
                      </div>
                      <p className="mt-1 break-all text-xs text-theme-muted">
                        Provider {provider.id} · {provider.name}
                        {provider.version ? ` · v${provider.version}` : " · 版本未报告"}
                      </p>
                      <p className="mt-2 text-sm text-theme-muted">
                        {provider.state_description ?? "OpenBB 未提供更多状态说明。"}
                      </p>
                    </div>
                    <dl className="grid grid-cols-2 gap-4 text-sm lg:grid-cols-1">
                      <div>
                        <dt className="text-xs text-theme-muted">数据能力</dt>
                        <dd>{provider.capability_count} 项</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-theme-muted">凭证</dt>
                        <dd title={credential.detail}>
                          {credential.needsSetup ? (
                            <Link className="text-theme-accent" search={{ tab: "credentials" }} params={{ providerId: provider.id }} to="/data-sources/$providerId">{credential.label}</Link>
                          ) : credential.label}
                        </dd>
                      </div>
                    </dl>
                    <div className="text-sm">
                      <p className="text-xs text-theme-muted">最近测试</p>
                      <p>{last ? `${last.succeeded ? "通过" : "失败"} · ${new Date(last.at).toLocaleString("zh-CN")}` : "尚未测试"}</p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm" aria-label={`${provider.display_name} 操作`}>
                      <Link className="text-theme-accent" params={{ providerId: provider.id }} to="/data-sources/$providerId">打开</Link>
                      <Link className="text-theme-accent" search={{ provider: provider.id }} to="/query">测试</Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <section className="mt-4 rounded border border-theme-outline bg-theme-primary p-5" role="status">
              <h2 className="font-semibold">没有匹配的数据源</h2>
              <p className="mt-2 text-sm text-theme-muted">请修改搜索词；当前实时检查仍报告 {snapshot.providers.length} 个 Provider。</p>
            </section>
          )
        ) : (
          <SourceEmptyState
            actionRoute={serviceAction?.action_route}
            backendId={query.data?.service.backend?.id}
            freshness={snapshot?.freshness}
            onStarted={query.refetch}
            serviceState={query.data?.service.state}
          />
        )}
      </div>
    </StudioPageState>
  );
}
function credentialSummary(provider: ProviderSummary): { label: string; detail: string; needsSetup: boolean } {
  if (provider.credential_metadata_status === "unknown" || (!provider.credential_metadata_status && !provider.credential_fields.length)) {
    return { label: "状态未知", detail: "OpenBB 未报告此 Provider 的凭证要求。", needsSetup: false };
  }
  if (!provider.credential_fields.length) {
    return { label: "无需凭证", detail: "OpenBB 未声明凭证字段。", needsSetup: false };
  }
  const required = provider.credential_fields.filter((field) => field.required);
  const configured = required.filter((field) => field.configured);
  if (configured.length === required.length) {
    return { label: "已配置", detail: `${configured.length}/${required.length} 个必填字段已配置。`, needsSetup: false };
  }
  return {
    label: `缺少 ${required.length - configured.length} 项`,
    detail: `${configured.length}/${required.length} 个必填字段已配置。`,
    needsSetup: true,
  };
}


function InspectionSummary({
  actionLabel,
  actionRoute,
  backendId,
  freshness,
  onStarted,
  serviceState,
}: {
  actionLabel?: string;
  actionRoute?: string;
  backendId?: string;
  freshness: StudioFreshness;
  onStarted: () => Promise<unknown>;
  serviceState?: "running" | "stopped" | "error";
}) {
  const inspected = freshness.inspected_at ? new Date(freshness.inspected_at).toLocaleString("zh-CN") : "尚未检查";
  const copy = freshness.status === "stale"
    ? `当前显示缓存结果；最近检查于 ${inspected}。`
    : freshness.status === "empty"
      ? `OpenBB 已于 ${inspected} 完成检查，但没有报告 Provider。`
      : freshness.status === "not_inspected"
        ? "尚未从 OpenBB 服务读取 Provider。"
        : `实时检查时间：${inspected}。`;
  return (
    <section className="mt-5 flex flex-wrap items-center gap-4 rounded border border-theme-outline bg-theme-primary p-4" aria-label="OpenBB 检查状态">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">服务：{serviceState === "running" ? "运行中" : serviceState === "error" ? "异常" : "已停止"}</p>
        <p className="mt-1 text-sm text-theme-muted">{copy}</p>
      </div>
      {actionRoute && freshness.status === "not_inspected" && (
        <ServiceStartAction
          backendId={backendId}
          className="text-sm text-theme-accent"
          href={actionRoute}
          label={actionLabel ?? "处理服务"}
          onStarted={onStarted}
        />
      )}
    </section>
  );
}

function SourceEmptyState({
  actionRoute,
  backendId,
  freshness,
  onStarted,
  serviceState,
}: {
  actionRoute?: string;
  backendId?: string;
  freshness?: StudioFreshness;
  onStarted: () => Promise<unknown>;
  serviceState?: "running" | "stopped" | "error";
}) {
  const inspectionWasEmpty = freshness?.status === "empty";
  return (
    <section className="mt-4 rounded border border-theme-outline bg-theme-primary p-6" role="status">
      <h2 className="font-semibold">{inspectionWasEmpty ? "OpenBB 没有报告数据源" : "尚未检查数据源"}</h2>
      <p className="mt-2 text-sm text-theme-muted">
        {inspectionWasEmpty
          ? "实时检查已成功完成，但当前运行环境没有返回 Provider 或原生数据集。这不是检查失败。"
          : serviceState === "stopped"
            ? "OpenBB 服务已停止。启动服务后才能读取实时 Provider 和原生数据集。"
            : "当前还没有可显示的实时 Provider 信息。请检查服务并重新读取。"}
      </p>
      {actionRoute && (
        <ServiceStartAction
          backendId={backendId}
          className="mt-4 text-sm text-theme-accent"
          href={actionRoute}
          label="处理 OpenBB 服务"
          onStarted={onStarted}
        />
      )}
    </section>
  );
}

export const Route = createFileRoute("/data-sources/")({ component: DataSourcesPage });
