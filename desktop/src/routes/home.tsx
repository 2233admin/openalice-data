import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { BackendService } from "../studio/client";
import { StudioLink } from "../studio/StudioLink";
import { readStudioActivity } from "../studio/activity";
import { ServiceStartAction } from "../studio/ServiceStartAction";
import { useStudioState } from "../studio/queries";
const entityLabels: Record<string, string> = {
  provider: "数据源",
  service: "OpenBB API",
  extension: "扩展",
  credential: "凭证",
  dataset: "数据集",
};

interface HomeAction {
  id: string;
  title: string;
  description: string;
  entity_type: string;
  entity_id?: string;
  action_label: string;
  action_route: string;
}

function backendDisplayName(backend: BackendService): string {
  const identity = `${backend.name} ${backend.command ?? ""}`.toLowerCase();
  return identity.includes("mcp") ? "OpenBB MCP" : "OpenBB API";
}

function backendDescription(backend: BackendService): string {
  return backendDisplayName(backend) === "OpenBB MCP"
    ? "供外部 MCP 客户端调用 OpenBB 工具。"
    : "OpenBB 查询服务，供 Studio 查询和数据目录使用。";
}

function backendStatusLabel(status: string): string {
  if (status === "running") return "运行中";
  if (status === "starting") return "启动中";
  if (status === "error") return "异常";
  return "未运行";
}

function OpenBBServiceRow({ backend, onStarted }: { backend: BackendService; onStarted: () => Promise<unknown> }) {
  const running = backend.status === "running";
  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-semibold">{backendDisplayName(backend)}</h3>
          <span className="text-sm font-medium text-theme-muted">{backendStatusLabel(backend.status)}</span>
        </div>
        <p className="mt-1 text-sm text-theme-muted">{backendDescription(backend)}</p>
      </div>
      {!running && (
        <ServiceStartAction
          backendId={backend.id}
          className="shrink-0 self-start text-sm text-theme-accent sm:self-auto"
          href="/backends"
          label="启动服务"
          onStarted={onStarted}
        />
      )}
    </li>
  );
}

function HomePage() {
  const { data, error, isPending, refetch } = useStudioState();
  const [activity, setActivity] = useState(readStudioActivity);

  useEffect(() => {
    const refresh = () => setActivity(readStudioActivity());
    window.addEventListener("studio-activity", refresh);
    return () => window.removeEventListener("studio-activity", refresh);
  }, []);

  if (isPending) {
    return (
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center py-6" role="status" aria-live="polite">
        <p className="text-sm font-medium text-theme-accent">行动中心</p>
        <h1 className="mt-2 text-2xl font-semibold">正在检查现在能做什么</h1>
        <p className="mt-2 text-sm text-theme-muted">正在读取 OpenBB 服务、数据源和待处理事项…</p>
      </section>
    );
  }

  if (!data) {
    const actionRoute = error && typeof error === "object" && "actionRoute" in error
      ? String(error.actionRoute)
      : "/advanced?section=runtimes";
    return (
      <section className="mx-auto my-12 w-full max-w-3xl border-y border-theme-outline bg-theme-primary py-6" role="alert">
        <p className="text-sm font-medium text-theme-accent">查询暂时不可用</p>
        <h1 className="mt-2 text-2xl font-semibold">先恢复 OpenBB 运行环境</h1>
        <p className="mt-2 text-sm text-theme-muted">{error instanceof Error ? error.message : "当前无法读取 OpenBB；检查运行环境后可以返回重试。"}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <StudioLink className="rounded bg-theme-accent px-4 py-2 text-sm text-theme-primary-inverse" href={actionRoute}>检查运行环境</StudioLink>
          <button className="button-outline px-4 py-2 text-sm" type="button" onClick={() => void refetch()}>重新检查</button>
        </div>
      </section>
    );
  }

  const { snapshot, service, backends } = data;
  const openbbBackends = backends?.length ? backends : service.backend ? [service.backend] : [];
  const routedAction = snapshot.actions.find((action) => action.action_route);
  const primaryAction: HomeAction = routedAction?.action_route
    ? { ...routedAction, action_route: routedAction.action_route }
    : service.state !== "running"
      ? {
          id: "service:stopped",
          title: "查询服务未运行，真实查询会失败",
          description: "打开保留的服务控制，启动或修复 OpenBB API 后再继续。",
          entity_type: "service",
          entity_id: data.runtime,
          action_label: "检查查询服务",
          action_route: "/backends",
        }
      : snapshot.providers.length === 0
        ? {
            id: "providers:empty",
            title: "还没有可查询的数据源",
            description: "先查看当前 OpenBB 运行环境实际发现了哪些数据源。",
            entity_type: "provider",
            action_label: "查看数据源",
            action_route: "/data-sources",
          }
        : {
            id: "query:ready",
            title: "数据源已就绪，可以运行查询",
            description: "选择一个原生数据集，运行并保留可复现的查询记录。",
            entity_type: "dataset",
            action_label: "开始查询",
            action_route: "/query",
          };
  const additionalActions = routedAction
    ? snapshot.actions.filter((action) => action.id !== routedAction.id)
    : snapshot.actions;
  const inspectedAt = snapshot.freshness.inspected_at ?? snapshot.fetched_at;

  return (
    <div className="mx-auto w-full max-w-6xl overflow-auto py-6">
      <header className="border-b border-theme-outline pb-5">
        <p className="text-sm font-medium text-theme-accent">OPENALICE 数据工作台</p>
        <h1 className="mt-1 text-2xl font-semibold">行动中心</h1>
        <p className="mt-1 max-w-3xl text-sm text-theme-muted">先处理会阻塞查询的事项；每个操作都保留对应的数据源、数据集或服务上下文。</p>
      </header>

      <section className="border-b border-theme-outline py-6" aria-labelledby="next-action-heading">
        <p className="text-xs font-medium text-theme-muted">下一步</p>
        <div className="mt-2 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-3xl">
            <h2 className="text-xl font-semibold" id="next-action-heading">{primaryAction.title}</h2>
            <p className="mt-2 text-sm text-theme-muted">{primaryAction.description}</p>
            {primaryAction.entity_id && (
              <p className="mt-3 text-xs text-theme-muted">
                影响对象：{entityLabels[primaryAction.entity_type] ?? primaryAction.entity_type} · {primaryAction.entity_id}
              </p>
            )}
          </div>
          {primaryAction.entity_type === "service" ? (
            <ServiceStartAction
              backendId={service.backend?.id}
              className="shrink-0 rounded bg-theme-accent px-4 py-2 text-sm text-theme-primary-inverse"
              href={primaryAction.action_route}
              label={primaryAction.action_label}
              onStarted={refetch}
            />
          ) : (
            <StudioLink className="shrink-0 rounded bg-theme-accent px-4 py-2 text-sm text-theme-primary-inverse" href={primaryAction.action_route}>
              {primaryAction.action_label}
            </StudioLink>
          )}
        </div>
      </section>

      <dl className="grid grid-cols-2 border-b border-theme-outline py-4 text-sm sm:grid-cols-4">
        <div className="py-2"><dt className="text-xs text-theme-muted">OpenBB API</dt><dd className="mt-1 font-medium">{service.state === "running" ? "运行中" : "需要处理"}</dd></div>
        <div className="py-2"><dt className="text-xs text-theme-muted">数据源</dt><dd className="mt-1 font-medium">{snapshot.providers.length} 个</dd></div>
        <div className="py-2"><dt className="text-xs text-theme-muted">数据集</dt><dd className="mt-1 font-medium">{snapshot.datasets.length} 个</dd></div>
        <div className="py-2"><dt className="text-xs text-theme-muted">最近检查</dt><dd className="mt-1 font-medium"><time dateTime={inspectedAt}>{new Date(inspectedAt).toLocaleString("zh-CN")}</time></dd></div>
      </dl>

      <div className="grid gap-4 border-b border-theme-outline py-5 sm:grid-cols-2">
        <section className="rounded border border-theme-outline bg-theme-primary p-5" aria-labelledby="openbb-services-heading">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-theme-muted">服务管理</p>
              <h2 className="mt-1 font-semibold" id="openbb-services-heading">OpenBB 服务</h2>
              <p className="mt-2 text-sm text-theme-muted">决定当前运行环境启动哪些 OpenBB 服务。</p>
            </div>
            <StudioLink className="shrink-0 text-sm text-theme-accent" href="/backends">打开服务管理 →</StudioLink>
          </div>
          {openbbBackends.length ? (
            <ul className="mt-5 divide-y divide-theme-outline">
              {openbbBackends.map((backend) => (
                <OpenBBServiceRow backend={backend} key={backend.id} onStarted={refetch} />
              ))}
            </ul>
          ) : (
            <p className="mt-5 border-t border-theme-outline pt-4 text-sm text-theme-muted">
              尚未发现 OpenBB 服务。打开服务管理，选择要运行的 API 或 MCP 服务。
            </p>
          )}
        </section>
        <section className="rounded border border-theme-outline bg-theme-primary p-5" aria-labelledby="runtime-heading">
          <p className="text-xs font-medium text-theme-muted">默认运行环境</p>
          <h2 className="mt-1 font-semibold" id="runtime-heading">{data.runtime}</h2>
          <p className="mt-1 text-sm text-theme-muted">数据源、查询和扩展默认使用这个运行环境。</p>
          <StudioLink className="mt-4 inline-block text-sm text-theme-accent" href="/environments">打开运行环境 →</StudioLink>
        </section>
      </div>

      <div className="grid gap-8 py-6 lg:grid-cols-2">
        <section aria-labelledby="action-items-heading">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-semibold" id="action-items-heading">其他待处理事项</h2>
            <StudioLink className="text-sm text-theme-accent" href="/data-sources">查看数据源</StudioLink>
          </div>
          <div className="mt-3 divide-y divide-theme-outline border-y border-theme-outline">
            {additionalActions.slice(0, 5).map((action) => (
              <article className="py-4" key={action.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium">{action.title}</h3>
                    <p className="mt-1 text-sm text-theme-muted">{action.description}</p>
                    {action.entity_id && <p className="mt-2 text-xs text-theme-muted">{entityLabels[action.entity_type]} · {action.entity_id}</p>}
                  </div>
                  {action.action_route && <StudioLink className="shrink-0 text-sm text-theme-accent" href={action.action_route}>{action.action_label}</StudioLink>}
                </div>
              </article>
            ))}
            {additionalActions.length === 0 && (
              <p className="py-5 text-sm text-theme-muted">没有其他阻塞项。你可以继续当前的下一步操作。</p>
            )}
          </div>
        </section>

        <section aria-labelledby="recent-activity-heading">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-semibold" id="recent-activity-heading">最近活动</h2>
            <StudioLink className="text-sm text-theme-accent" href="/query">打开查询</StudioLink>
          </div>
          <ul className="mt-3 divide-y divide-theme-outline border-y border-theme-outline">
            {activity.slice(0, 5).map((entry) => (
              <li key={`${entry.at}:${entry.providerId}:${entry.datasetId}`}>
                <StudioLink
                  className="grid gap-1 py-4 hover:bg-theme-secondary sm:grid-cols-[minmax(0,1fr)_auto]"
                  href={`/query?dataset=${encodeURIComponent(entry.datasetId)}&provider=${encodeURIComponent(entry.providerId)}`}
                >
                  <span className="min-w-0">
                    <strong className="block truncate text-sm">{entry.succeeded ? "查询完成" : "查询失败"}：{entry.datasetId}</strong>
                    <span className="mt-1 block text-xs text-theme-muted">{entry.providerId}{entry.message ? ` · ${entry.message}` : ""}</span>
                  </span>
                  <span className="text-xs text-theme-muted sm:text-right">
                    {entry.succeeded && entry.rowCount !== undefined ? `${entry.rowCount} 行 · ` : ""}
                    <time dateTime={entry.at}>{new Date(entry.at).toLocaleString("zh-CN")}</time>
                  </span>
                </StudioLink>
              </li>
            ))}
            {activity.length === 0 && (
              <li className="py-5 text-sm text-theme-muted">还没有活动。运行一次查询后，这里会保留数据集和数据源上下文。</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/home")({ component: HomePage });
