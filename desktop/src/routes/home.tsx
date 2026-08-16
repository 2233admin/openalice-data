import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { DatasetSummary, StudioSnapshot } from "../studio/contracts";
import { readStudioActivity, type StudioActivityEntry } from "../studio/activity";
import { StatusPill } from "../studio/StudioPageState";
import { StudioLink } from "../studio/StudioLink";
import { useStudioState } from "../studio/queries";
import { getWorkspaceMemberState } from "../studio/workspace-store";
import { useWorkspaceStore } from "../studio/workspace-hooks";
import { odpRecoveryHref } from "../studio/odp-routes";

type NativeTarget = {
  kind: "native";
  key: string;
  datasetId: string;
  datasetName: string;
  category: string;
  providerId: string;
  providerName: string;
  state: string;
  stateDescription?: string;
  credentialState: string;
  href: string;
};

type WorkspaceTarget = {
  kind: "workspace";
  key: string;
  workspaceId: string;
  name: string;
  memberCount: number;
  availableCount: number;
  state: "available" | "partial" | "failed";
  stateDescription: string;
  href: string;
};

type HomeTarget = NativeTarget | WorkspaceTarget;

function statusLabel(value: string): string {
  return {
    available: "可用",
    unavailable: "不可用",
    partial: "部分可用",
    credential_required: "需要凭证",
    ready_to_test: "等待测试",
    failed: "不可用",
    not_installed: "未安装",
    installed_not_applied: "已安装未应用",
    stale: "状态待刷新",
  }[value] ?? value;
}

function nativeTargets(snapshot: StudioSnapshot, serviceState: "running" | "stopped" | "error"): NativeTarget[] {
  return snapshot.datasets.flatMap((dataset: DatasetSummary) => dataset.providers.map((datasetProvider) => {
    const provider = snapshot.providers.find((item) => item.id === datasetProvider.provider_id);
    const requiredCredentials = provider?.credential_fields.filter((field) => field.required) ?? [];
    const configuredCredentials = requiredCredentials.filter((field) => field.configured);
    const state = serviceState !== "running"
      ? "unavailable"
      : ["stale", "failed", "not_inspected"].includes(snapshot.freshness.status)
        ? "stale"
        : provider?.status === "partial" ? "partial" : datasetProvider.state;
    return {
      kind: "native" as const,
      key: `${datasetProvider.provider_id}:${dataset.id}`,
      datasetId: dataset.id,
      datasetName: dataset.display_name,
      category: dataset.category,
      providerId: datasetProvider.provider_id,
      providerName: provider?.display_name ?? datasetProvider.provider_id,
      state,
      stateDescription: provider?.status === "partial"
        ? datasetProvider.state_description ?? provider.state_description
        : datasetProvider.state_description ?? provider?.state_description,
      credentialState: requiredCredentials.length
        ? `${configuredCredentials.length}/${requiredCredentials.length} 项凭证`
        : "无需凭证",
      href: `/data-sources/${encodeURIComponent(datasetProvider.provider_id)}?dataset=${encodeURIComponent(dataset.id)}&intent=use`,
    };
  }));
}

function workspaceTargets(
  snapshot: StudioSnapshot,
  serviceState: "running" | "stopped" | "error",
  workspaces: ReturnType<typeof useWorkspaceStore>,
): WorkspaceTarget[] {
  return workspaces.workspaces.map((workspace) => {
    const availableCount = workspace.members.filter((member) => getWorkspaceMemberState(member, snapshot, serviceState) === "available").length;
    const state = availableCount === 0 ? "failed" : availableCount < workspace.members.length ? "partial" : "available";
    return {
      kind: "workspace" as const,
      key: `workspace:${workspace.id}`,
      workspaceId: workspace.id,
      name: workspace.name,
      memberCount: workspace.members.length,
      availableCount,
      state,
      stateDescription: availableCount > 0 ? "当前 ODP 检查报告至少一个可用成员" : "当前没有可确认的可用成员",
      href: `/data-sources?workspaceId=${encodeURIComponent(workspace.id)}&intent=use`,
    };
  });
}

function targetTitle(target: HomeTarget): string {
  return target.kind === "native" ? target.datasetName : target.name;
}

function targetDescription(target: HomeTarget): string {
  return target.kind === "native"
    ? `${target.providerName} · ${target.providerId} · ${target.category}`
    : `${target.memberCount} 个成员 · ${target.availableCount} 个成员可用`;
}

function activityHref(entry: StudioActivityEntry): string {
  return `/data-sources/${encodeURIComponent(entry.providerId)}?dataset=${encodeURIComponent(entry.datasetId)}`;
}

function HomePage() {
  const query = useStudioState();
  const workspaceStore = useWorkspaceStore();
  const [activity, setActivity] = useState(readStudioActivity);
  const [selectedKey, setSelectedKey] = useState("");

  useEffect(() => {
    const refresh = () => setActivity(readStudioActivity());
    window.addEventListener("studio-activity", refresh);
    return () => window.removeEventListener("studio-activity", refresh);
  }, []);
  const snapshot = query.data?.snapshot;
  const serviceState = query.data?.service.state ?? "stopped";
  const native = useMemo(() => snapshot ? nativeTargets(snapshot, serviceState) : [], [serviceState, snapshot]);
  const workspaces = useMemo(
    () => snapshot ? workspaceTargets(snapshot, serviceState, workspaceStore) : [],
    [serviceState, snapshot, workspaceStore],
  );
  const targets = useMemo<HomeTarget[]>(() => [...native, ...workspaces], [native, workspaces]);
  const selectedTarget = targets.find((target) => target.key === selectedKey);


  if (query.isPending) {
    return (
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center py-6" role="status" aria-live="polite">
        <p className="text-sm font-medium text-theme-accent">首页</p>
        <h1 className="mt-2 text-2xl font-semibold">正在读取可选择的数据源</h1>
        <p className="mt-2 text-sm text-theme-muted">正在读取 OpenBB 的原生数据集和已保存的组合数据源…</p>
      </section>
    );
  }

  if (!query.data) {
    const actionRoute = query.error && typeof query.error === "object" && "actionRoute" in query.error
      ? String(query.error.actionRoute)
      : "/backends";
    return (
      <section className="mx-auto my-12 w-full max-w-3xl border-y border-theme-outline bg-theme-primary py-6" role="alert">
        <p className="text-sm font-medium text-theme-accent">首页暂时无法建立数据源选择</p>
        <h1 className="mt-2 text-2xl font-semibold">暂时无法读取数据源</h1>
        <p className="mt-2 text-sm text-theme-muted">{query.error instanceof Error ? query.error.message : "当前无法读取 OpenBB 数据源；检查运行环境后可以返回重试。"}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <StudioLink className="rounded bg-theme-accent px-4 py-2 text-sm text-theme-primary-inverse" href={odpRecoveryHref(actionRoute, "/backends")}>检查 ODP Backends</StudioLink>
          <button className="button-outline px-4 py-2 text-sm" type="button" onClick={() => void query.refetch()}>重新检查</button>
        </div>
      </section>
    );
  }

  const loadedSnapshot = query.data.snapshot;
  const loadedService = query.data.service;
  const inspectedAt = loadedSnapshot.freshness.inspected_at ?? loadedSnapshot.fetched_at;
  const serviceLabel = loadedService.state === "running" ? "运行中" : loadedService.state === "error" ? "异常" : "未运行";

  return (
    <div className="mx-auto w-full max-w-6xl overflow-auto py-6">
      <header className="border-b border-theme-outline pb-5">
        <p className="text-sm font-medium text-theme-accent">OPENALICE 数据工作台</p>
        <h1 className="mt-1 text-2xl font-semibold">首页</h1>
        <p className="mt-1 max-w-3xl text-sm text-theme-muted">从一个明确的数据源开始。原生和组合数据源都从同一份实时清单进入。</p>
      </header>

      <section className="mt-6" aria-labelledby="home-target-heading">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-theme-outline pb-3">
          <div>
            <h2 className="text-xl font-semibold" id="home-target-heading">选择数据源</h2>
            <p className="mt-1 text-sm text-theme-muted">原生数据源和组合数据源共用一个选择入口；不会根据服务状态替你决定下一步。</p>
          </div>
          <StudioLink className="rounded bg-theme-accent px-3 py-2 text-sm text-theme-primary-inverse" href="/data-sources">打开数据源</StudioLink>
        </div>

        {targets.length ? (
          <div className="mt-3 divide-y divide-theme-outline rounded border border-theme-outline bg-theme-primary" role="radiogroup" aria-label="可选择的数据源">
            {targets.map((target) => {
              const selected = selectedKey === target.key;
              const status = target.kind === "native" ? target.state : target.state;
              return (
                <label className={`flex cursor-pointer items-start gap-3 p-4 ${selected ? "bg-theme-secondary" : "hover:bg-theme-secondary"}`} key={target.key}>
                  <input
                    aria-label={target.kind === "native" ? `${target.providerName} / ${target.datasetName}` : `组合数据源 / ${target.name}`}
                    checked={selected}
                    className="mt-1"
                    name="home-target"
                    onChange={() => setSelectedKey(target.key)}
                    type="radio"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <strong>{targetTitle(target)}</strong>
                      <StatusPill value={status} />
                    </span>
                    <span className="mt-1 block text-sm text-theme-muted">{targetDescription(target)}</span>
                    {target.kind === "native" ? (
                      <span className="mt-1 block text-xs text-theme-muted">{target.stateDescription ?? statusLabel(target.state)} · {target.credentialState}</span>
                    ) : (
                      <span className="mt-1 block text-xs text-theme-muted">{target.stateDescription}</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 rounded border border-dashed border-theme-outline bg-theme-primary p-6">
            <p className="font-medium">还没有可选择的数据源。</p>
            <p className="mt-1 text-sm text-theme-muted">ODP 实时检查没有返回可选择的来源。可打开 Extensions 添加能力，或进入数据源清单重新检查。</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm"><StudioLink className="text-theme-accent" href="/data-sources">选择数据源</StudioLink><StudioLink className="text-theme-accent" href="/extensions">打开 Extensions</StudioLink></div>
          </div>
        )}
      </section>

      <section className="mt-4 rounded border border-theme-outline bg-theme-primary p-4" aria-live="polite">
        {selectedTarget ? (
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="text-xs font-medium text-theme-muted">已选择</p>
              <h2 className="mt-1 font-semibold">{targetTitle(selectedTarget)}</h2>
              <p className="mt-1 text-sm text-theme-muted">{targetDescription(selectedTarget)}</p>
              {selectedTarget.kind === "native" && loadedService.state !== "running" && (
                <p className="mt-2 text-sm text-theme-muted">
                  ODP 服务未运行，当前不能确认这个来源可用。{" "}
                  <StudioLink className="text-theme-accent" href="/backends">打开 ODP Backends</StudioLink>
                </p>
              )}
              {selectedTarget.kind === "workspace" && selectedTarget.state !== "available" && (
                <p className="mt-2 text-sm text-theme-muted">组合数据源当前没有可确认的可用成员。</p>
              )}
            </div>
            <StudioLink className="shrink-0 rounded bg-theme-accent px-4 py-2 text-sm text-theme-primary-inverse" href={selectedTarget.href}>
              {selectedTarget.kind === "native" ? "使用" : "详情"}
            </StudioLink>
          </div>
        ) : (
          <p className="text-sm text-theme-muted">请选择一个数据源后继续。</p>
        )}
      </section>

      <dl className="mt-5 grid grid-cols-2 border-y border-theme-outline py-4 text-sm sm:grid-cols-4">
        <div className="py-2"><dt className="text-xs text-theme-muted">OpenBB API</dt><dd className="mt-1 font-medium">{serviceLabel}</dd></div>
        <div className="py-2"><dt className="text-xs text-theme-muted">原生数据源</dt><dd className="mt-1 font-medium">{native.length} 个</dd></div>
        <div className="py-2"><dt className="text-xs text-theme-muted">组合数据源</dt><dd className="mt-1 font-medium">{workspaces.length} 个</dd></div>
        <div className="py-2"><dt className="text-xs text-theme-muted">最近检查</dt><dd className="mt-1 font-medium"><time dateTime={inspectedAt}>{new Date(inspectedAt).toLocaleString("zh-CN")}</time></dd></div>
      </dl>

      <section className="mt-6" aria-labelledby="recent-activity-heading">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-semibold" id="recent-activity-heading">最近活动</h2>
          <StudioLink className="text-sm text-theme-accent" href="/data-sources">打开数据源</StudioLink>
        </div>
        <ul className="mt-3 divide-y divide-theme-outline rounded border border-theme-outline bg-theme-primary">
          {activity.slice(0, 5).map((entry) => (
            <li key={`${entry.at}:${entry.providerId}:${entry.datasetId}`}>
              <StudioLink className="grid gap-1 p-4 hover:bg-theme-secondary sm:grid-cols-[minmax(0,1fr)_auto]" href={activityHref(entry)}>
                <span className="min-w-0">
                  <strong className="block truncate text-sm">{entry.succeeded ? "使用完成" : "使用失败"}：{entry.datasetId}</strong>
                  <span className="mt-1 block text-xs text-theme-muted">{entry.providerId}{entry.message ? ` · ${entry.message}` : ""}</span>
                </span>
                <span className="text-xs text-theme-muted sm:text-right">
                  {entry.succeeded && entry.rowCount !== undefined ? `${entry.rowCount} 行 · ` : ""}
                  <time dateTime={entry.at}>{new Date(entry.at).toLocaleString("zh-CN")}</time>
                </span>
              </StudioLink>
            </li>
          ))}
          {activity.length === 0 && <li className="p-4 text-sm text-theme-muted">还没有活动。使用数据源后，这里会保留数据集和 Provider 上下文。</li>}
        </ul>
      </section>
    </div>
  );
}

export const Route = createFileRoute("/home")({ component: HomePage });
