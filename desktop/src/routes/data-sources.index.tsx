import { Link, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { StudioPageHeader } from "../studio/StudioPageState";
import { SourceInventoryTable } from "../studio/SourceInventoryTable";
import { StudioLink } from "../studio/StudioLink";
import type { StudioSnapshot } from "../studio/contracts";
import { useStudioState } from "../studio/queries";
import { useWorkspaceStore } from "../studio/workspace-hooks";
import { getWorkspaceMemberState, workspaceMemberStateLabel, type Workspace } from "../studio/workspace-store";
import { odpRecoveryHref } from "../studio/odp-routes";

export function DataSourcesPage({ workspaceId }: { workspaceId?: string } = {}) {
  const query = useStudioState();
  const workspaceStore = useWorkspaceStore();
  const snapshot = query.data?.snapshot;
  const activeWorkspace = workspaceId ? workspaceStore.workspaces.find((workspace) => workspace.id === workspaceId) : undefined;

  if (query.isPending) {
    return <section className="m-6 rounded border border-theme-outline bg-theme-primary p-6" role="status"><h1 className="text-xl font-semibold">正在检查数据源</h1><p className="mt-2 text-sm text-theme-muted">正在从 ODP 读取 Provider、数据集/API 身份和当前可用性，请稍候。</p></section>;
  }

  if (query.error) {
    return <section className="m-6 rounded border border-red-400 bg-theme-primary p-6" role="alert"><h1 className="text-xl font-semibold">数据源检查失败</h1><p className="mt-2 text-sm text-theme-muted">{query.error.message}</p><div className="mt-4 flex flex-wrap gap-4 text-sm"><button className="text-theme-accent" onClick={() => void query.refetch()} type="button">重新检查</button><StudioLink className="text-theme-accent" href="/diagnostics">打开 ODP Logs</StudioLink></div></section>;
  }

  return (
      <div className="mx-auto w-full max-w-6xl overflow-auto py-6">
        <StudioPageHeader
          title="数据源"
          description="原生和组合数据源共用这份实时清单。每个来源保留准确的 Provider、数据集/API 身份，并从这里进入使用、详情或组合。"
          action={<Link className="rounded bg-theme-accent px-4 py-2 text-sm text-theme-primary-inverse" to="/extensions">通过 Extensions 添加</Link>}
        />
        {snapshot ? (
          <>
            <InventoryEvidence onRefresh={() => void query.refetch()} serviceState={query.data?.service.state} snapshot={snapshot} />
            <SourceInventoryTable serviceState={query.data?.service.state} snapshot={snapshot} />
          </>
        ) : (
          <section className="mt-5 rounded border border-theme-outline bg-theme-primary p-6" role="status">
            <h2 className="font-semibold">数据源清单暂不可用</h2>
            <p className="mt-2 text-sm text-theme-muted">当前还没有从 ODP 读取到可确认的数据源身份。请检查 Backends 后返回重新读取。</p>
            <StudioLink className="mt-4 inline-block text-sm text-theme-accent" href="/backends">打开 ODP Backends</StudioLink>
          </section>
        )}
        {activeWorkspace && snapshot && <CompositionSourceDetail serviceState={query.data?.service.state} snapshot={snapshot} workspace={activeWorkspace} />}
      </div>
  );
}

function CompositionSourceDetail({ workspace, snapshot, serviceState }: { workspace: Workspace; snapshot: StudioSnapshot; serviceState?: "running" | "stopped" | "error" }) {
  return (
    <section className="mt-8 border-t border-theme-outline pt-6" aria-labelledby="composition-detail-heading">
      <p className="text-sm font-medium text-theme-accent">组合数据源详情</p>
      <h2 className="mt-1 text-xl font-semibold" id="composition-detail-heading">{workspace.name}</h2>
      <p className="mt-1 text-sm text-theme-muted">此处只展示已保存的准确成员身份和当前 ODP 可用性；成员维护与路由不在本入口中执行。</p>
      <div className="mt-4 divide-y divide-theme-outline rounded border border-theme-outline bg-theme-primary">
        {workspace.members.map((member) => {
          const state = getWorkspaceMemberState(member, snapshot, serviceState);
          return (
            <article className="grid gap-2 p-4 text-sm sm:grid-cols-[minmax(0,1fr)_auto]" key={`${member.providerId}:${member.datasetId}`}>
              <div className="min-w-0">
                <strong className="break-all">{member.providerId} / {member.datasetId}</strong>
                <p className="mt-1 break-all text-xs text-theme-muted">Native path: {member.nativePath ?? "未报告"}</p>
              </div>
              <span className="text-theme-muted">{workspaceMemberStateLabel(state)}</span>
            </article>
          );
        })}
        {!workspace.members.length && <p className="p-4 text-sm text-theme-muted">这个组合数据源尚未保存任何成员。</p>}
      </div>
    </section>
  );
}

function InventoryEvidence({ snapshot, serviceState, onRefresh }: { snapshot: StudioSnapshot; serviceState?: "running" | "stopped" | "error"; onRefresh: () => void }) {
  const freshness = snapshot.freshness;
  const inspectedAt = freshness.inspected_at ? new Date(freshness.inspected_at).toLocaleString("zh-CN") : "尚未完成";
  if (serviceState !== "running") {
    return <section className="mt-5 rounded border border-amber-400 bg-theme-primary p-4" role="status"><h2 className="font-semibold">ODP 服务不可用</h2><p className="mt-1 text-sm text-theme-muted">清单中的身份会保留，但当前不能据此确认来源可用。最近检查：{inspectedAt}。</p><StudioLink className="mt-3 inline-block text-sm text-theme-accent" href="/backends">打开 ODP Backends</StudioLink></section>;
  }
  if (freshness.status === "failed") {
    return <section className="mt-5 rounded border border-red-400 bg-theme-primary p-4" role="alert"><h2 className="font-semibold">实时数据源检查失败</h2><p className="mt-1 text-sm text-theme-muted">{freshness.error?.message ?? "ODP 未能完成本次数据源检查。"} 当前清单可能来自旧证据。</p><div className="mt-3 flex flex-wrap gap-4 text-sm"><button className="text-theme-accent" onClick={onRefresh} type="button">重新检查</button><StudioLink className="text-theme-accent" href={odpRecoveryHref(freshness.error?.action_route, "/diagnostics")}>打开负责的 ODP 控制</StudioLink></div></section>;
  }
  if (freshness.status === "stale") {
    return <section className="mt-5 rounded border border-amber-400 bg-theme-primary p-4" role="status"><h2 className="font-semibold">数据源状态待刷新</h2><p className="mt-1 text-sm text-theme-muted">当前显示缓存身份；最近检查于 {inspectedAt}，不把它声明为实时可用。</p><button className="mt-3 text-sm text-theme-accent" onClick={onRefresh} type="button">重新检查</button></section>;
  }
  if (freshness.status === "empty") {
    return <section className="mt-5 rounded border border-theme-outline bg-theme-primary p-4" role="status"><h2 className="font-semibold">实时检查完成，但没有数据源</h2><p className="mt-1 text-sm text-theme-muted">ODP 已于 {inspectedAt} 成功完成检查。可通过 Extensions 添加 Provider 后重新发现。</p><StudioLink className="mt-3 inline-block text-sm text-theme-accent" href="/extensions">打开 Extensions</StudioLink></section>;
  }
  return <p className="mt-5 text-sm text-theme-muted" role="status">实时 ODP 检查 · {inspectedAt}</p>;
}

function DataSourcesRoute() {
  const { workspaceId } = Route.useSearch();
  return <DataSourcesPage workspaceId={workspaceId} />;
}

export const Route = createFileRoute("/data-sources/")({
  validateSearch: z.object({ workspaceId: z.string().optional(), intent: z.enum(["use", "compose"]).optional(), source: z.string().optional() }),
  component: DataSourcesRoute,
});
