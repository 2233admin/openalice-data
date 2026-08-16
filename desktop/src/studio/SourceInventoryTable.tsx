import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { DatasetSummary, StudioSnapshot } from "./contracts";
import { latestProviderActivity, readStudioActivity } from "./activity";
import { StatusPill } from "./StudioPageState";
import { StudioLink } from "./StudioLink";
import { useWorkspaceStore } from "./workspace-hooks";
import { getWorkspaceMemberState, type NativeDatasetRef } from "./workspace-store";

type NativeSourceRow = {
  kind: "native";
  key: string;
  providerId: string;
  providerName: string;
  providerCredential: string;
  providerCredentialNeedsSetup: boolean;
  providerState: string;
  providerStateDescription?: string;
  dataset: DatasetSummary;
  lastTest?: { succeeded: boolean; at: string };
};

type CompositionSourceRow = {
  kind: "composition";
  key: string;
  workspaceId: string;
  name: string;
  memberCount: number;
  availableCount: number;
  members: NativeDatasetRef[];
};

type SourceRow = NativeSourceRow | CompositionSourceRow;

function sourceKey(providerId: string, datasetId: string): string {
  return `${providerId}:${datasetId}`;
}

export function SourceInventoryTable({ snapshot, serviceState }: { snapshot: StudioSnapshot; serviceState?: "running" | "stopped" | "error" }) {
  const store = useWorkspaceStore();
  const [search, setSearch] = useState("");

  const nativeRows = useMemo<NativeSourceRow[]>(() => {
    const activity = readStudioActivity();
    return snapshot.datasets.flatMap((dataset) => dataset.providers.map((datasetProvider) => {
      const provider = snapshot.providers.find((item) => item.id === datasetProvider.provider_id);
      const required = provider?.credential_fields.filter((field) => field.required) ?? [];
      const configured = required.filter((field) => field.configured);
      const providerCredentialNeedsSetup = required.length > configured.length;
      const last = latestProviderActivity(datasetProvider.provider_id, activity);
      return {
        kind: "native" as const,
        key: sourceKey(datasetProvider.provider_id, dataset.id),
        providerId: datasetProvider.provider_id,
        providerName: provider?.display_name ?? datasetProvider.provider_id,
        providerCredential: required.length ? `${configured.length}/${required.length} 项凭证` : "无需凭证",
        providerCredentialNeedsSetup,
        providerState: provider?.status === "partial" ? "partial" : datasetProvider.state,
        providerStateDescription: provider?.status === "partial" ? provider.state_description : datasetProvider.state_description ?? provider?.state_description,
        dataset,
        lastTest: last ? { succeeded: last.succeeded, at: last.at } : undefined,
      };
    }));
  }, [snapshot]);

  const compositionRows = useMemo<CompositionSourceRow[]>(
    () => store.workspaces.map((workspace) => {
      const availableCount = workspace.members.filter((member) => getWorkspaceMemberState(member, snapshot, serviceState) === "available").length;
      return {
        kind: "composition" as const,
        key: `composition:${workspace.id}`,
        workspaceId: workspace.id,
        name: workspace.name,
        memberCount: workspace.members.length,
        availableCount,
        members: workspace.members,
      };
    }),
    [serviceState, snapshot, store.workspaces],
  );

  const allRows = useMemo<SourceRow[]>(() => [...nativeRows, ...compositionRows], [compositionRows, nativeRows]);
  const rows = useMemo(
    () => allRows.filter((row) => {
      if (!search.trim()) return true;
      const haystack = row.kind === "native"
        ? `${row.dataset.display_name} ${row.dataset.id} ${row.providerName} ${row.providerId}`
        : `${row.name} 组合 ${row.workspaceId}`;
      return haystack.toLowerCase().includes(search.trim().toLowerCase());
    }),
    [allRows, search],
  );
  function nativeSourceState(row: NativeSourceRow): string {
    if (serviceState !== "running") return "unavailable";
    if (["stale", "failed", "not_inspected"].includes(snapshot.freshness.status)) return "stale";
    if (row.providerCredentialNeedsSetup) return "credential_required";
    return row.providerState;
  }

  function sourceStateLabel(row: NativeSourceRow): string {
    if (serviceState !== "running") return "ODP 服务不可用，不能确认来源可用";
    if (["stale", "failed", "not_inspected"].includes(snapshot.freshness.status)) return "实时状态待重新检查";
    if (row.providerCredentialNeedsSetup) return "需要配置凭证后测试";
    if (row.providerStateDescription) return row.providerStateDescription;
    if (row.lastTest) return row.lastTest.succeeded ? "最近测试通过" : "最近测试失败";
    return "尚未测试";
  }
  const emptyMessage = search.trim()
    ? "没有匹配的数据源。"
    : serviceState === "stopped"
      ? "数据源清单暂不可用；请到 ODP Backends 查看运行状态。"
      : snapshot.freshness?.status === "empty"
        ? "OpenBB 已完成实时检查，但没有报告数据源。"
        : "还没有数据源。可通过右上角的 Extensions 入口添加 Provider。";

  return (
    <section className="mt-5" aria-labelledby="source-table-heading" data-testid="source-inventory">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-theme-outline pb-3">
        <div>
          <h2 className="text-lg font-semibold" id="source-table-heading">全部数据源</h2>
          <p className="mt-1 text-sm text-theme-muted">每一行都是一个可识别的数据源。原生来源可直接进入使用、详情或组合上下文。</p>
        </div>
        <label className="w-full max-w-xs">
          <span className="sr-only">搜索数据源</span>
          <input aria-label="搜索数据源" className="w-full rounded border border-theme-outline bg-theme-primary px-3 py-2 text-sm" onChange={(event) => setSearch(event.target.value)} placeholder="搜索名称、Provider 或数据集" value={search} />
        </label>
      </div>

      <div className="relative mt-3 overflow-x-auto rounded border border-theme-outline bg-theme-primary">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className="border-b border-theme-outline bg-theme-secondary text-xs text-theme-muted">
            <tr><th className="p-3">数据源</th><th className="p-3">类型</th><th className="p-3">状态</th><th className="p-3">最近活动</th><th className="p-3 text-right">操作</th></tr>
          </thead>
          <tbody className="divide-y divide-theme-outline">
            {rows.map((row) => row.kind === "native" ? (
              <tr className="group hover:bg-theme-secondary" key={row.key}>
                <td className="p-3 align-top"><div className="flex items-start gap-3"><span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-theme-outline text-xs font-semibold text-theme-accent">源</span><div className="min-w-0"><StudioLink className="font-semibold text-theme-accent" href={`/data-sources/${encodeURIComponent(row.providerId)}?dataset=${encodeURIComponent(row.dataset.id)}`}>{row.dataset.display_name}</StudioLink><p className="mt-1 break-all text-xs text-theme-muted">Provider: {row.providerName} · {row.providerId}</p><p className="mt-1 break-all text-xs text-theme-muted">Dataset/API: {row.dataset.id}</p><p className="mt-1 break-all text-xs text-theme-muted">API path: {row.dataset.api_path || "未报告"}</p></div></div></td>
                <td className="p-3 align-top"><span className="rounded-full border border-theme-outline px-2 py-1 text-xs">原生</span></td>
                <td className="p-3 align-top"><div className="flex flex-wrap items-center gap-2"><StatusPill value={nativeSourceState(row)} /><span className="text-xs text-theme-muted">{sourceStateLabel(row)}</span>{row.providerStateDescription && <span className="text-xs text-theme-muted">{row.providerStateDescription}</span>}</div><p className="mt-2 text-xs text-theme-muted">{row.providerCredential}</p>{row.providerCredentialNeedsSetup && <StudioLink className="mt-2 block text-xs text-theme-accent" href="/api-keys">打开 ODP API Keys</StudioLink>}</td>
                <td className="p-3 align-top text-xs text-theme-muted">{row.lastTest ? `${row.lastTest.succeeded ? "通过" : "失败"} · ${new Date(row.lastTest.at).toLocaleString("zh-CN")}` : "尚未测试"}</td>
                <td className="p-3 align-top"><div className="flex flex-wrap justify-end gap-3"><StudioLink className="text-sm text-theme-accent" href={`/data-sources/${encodeURIComponent(row.providerId)}?dataset=${encodeURIComponent(row.dataset.id)}&intent=use`}>使用</StudioLink><StudioLink className="text-sm text-theme-accent" href={`/data-sources/${encodeURIComponent(row.providerId)}?dataset=${encodeURIComponent(row.dataset.id)}`}>详情</StudioLink><StudioLink className="text-sm text-theme-accent" href={`/data-sources?intent=compose&source=${encodeURIComponent(row.key)}`}>组合</StudioLink></div></td>
              </tr>
            ) : (
              <tr className="group hover:bg-theme-secondary" data-testid="composition-row" key={row.key}>
                <td className="p-3 align-top"><div className="flex items-start gap-3"><span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-theme-accent text-xs font-semibold text-theme-accent">组</span><div className="min-w-0"><Link className="font-semibold text-theme-accent" search={{ workspaceId: row.workspaceId }} to="/data-sources">{row.name}</Link><p className="mt-1 text-xs text-theme-muted">组合数据源 · {row.memberCount} 个成员</p><p className="mt-1 break-all text-xs text-theme-muted">成员：{row.members.map((member) => `${member.providerId}/${member.datasetId}`).join("；") || "无"}</p></div></div></td>
                <td className="p-3 align-top"><span className="rounded-full border border-theme-accent px-2 py-1 text-xs text-theme-accent">组合</span></td>
                <td className="p-3 align-top"><div className="flex flex-wrap items-center gap-2"><StatusPill value={serviceState !== "running" || ["stale", "failed", "not_inspected"].includes(snapshot.freshness.status) ? "stale" : row.availableCount > 0 ? "available" : "unavailable"} /><span className="text-xs text-theme-muted">{row.availableCount}/{row.memberCount} 个成员当前可用</span></div><p className="mt-2 text-xs text-theme-muted">成员身份已明确保存；可用性来自当前 ODP 检查。</p></td>
                <td className="p-3 align-top text-xs text-theme-muted">成员身份来自已保存的组合记录</td>
                <td className="p-3 align-top"><div className="flex flex-wrap justify-end gap-3"><StudioLink className="text-sm text-theme-accent" href={`/data-sources?workspaceId=${encodeURIComponent(row.workspaceId)}&intent=use`}>使用</StudioLink><Link className="text-sm text-theme-accent" search={{ workspaceId: row.workspaceId }} to="/data-sources">详情</Link></div></td>
              </tr>
            ))}
            {!rows.length && <tr><td className="p-8 text-center text-sm text-theme-muted" colSpan={5}><span>{emptyMessage}</span>{serviceState === "stopped" ? <StudioLink className="ml-2 text-theme-accent" href="/backends">打开 ODP Backends</StudioLink> : !search.trim() && <StudioLink className="ml-2 text-theme-accent" href="/extensions">打开 Extensions</StudioLink>}</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-theme-muted">组合入口保留准确来源上下文；本清单不会自动合并或修改原生数据源。</p>
    </section>
  );
}
