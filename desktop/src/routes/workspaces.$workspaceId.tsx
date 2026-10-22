import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useStudioState } from "../studio/queries";
import { useWorkspaceStore } from "../studio/workspace-hooks";
import { attachDatasetFromSummary, detachNativeDataset, getWorkspaceMemberState, moveNativeDataset, removeWorkspace, renameWorkspace, workspaceMemberStateLabel } from "../studio/workspace-store";

export function WorkspaceDetailPage({ workspaceId: requestedWorkspaceId, embedded = false }: { workspaceId?: string; embedded?: boolean } = {}) {
  const workspaceId = requestedWorkspaceId ?? Route.useParams().workspaceId;
  const store = useWorkspaceStore();
  const query = useStudioState();
  const workspace = store.workspaces.find((item) => item.id === workspaceId);
  const [name, setName] = useState("");
  const [selectedDataset, setSelectedDataset] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const options = useMemo(() => {
    if (!query.data) return [];
    return query.data.snapshot.datasets.flatMap((dataset) => dataset.providers.map((provider) => ({
      key: `${provider.provider_id}:${dataset.id}`,
      providerId: provider.provider_id,
      dataset,
      providerState: provider.state,
      providerName: query.data?.snapshot.providers.find((item) => item.id === provider.provider_id)?.display_name ?? provider.provider_id,
    })));
  }, [query.data]);

  if (!workspace) return <main className="mx-auto w-full max-w-4xl py-10"><h1 className="text-xl font-semibold">找不到这个组合数据源</h1><p className="mt-2 text-sm text-theme-muted">它可能已被移除，或本地存储尚未恢复。</p><Link className="mt-4 inline-block text-sm text-theme-accent" to="/data-sources">返回数据源</Link></main>;
  const currentWorkspace = workspace;

  function rename(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    try {
      renameWorkspace(currentWorkspace.id, name);
      setName("");
      setError("");
      setMessage("名称已保存。成员和来源身份保持不变。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  function attach(): void {
    const option = options.find((item) => item.key === selectedDataset);
    if (!option) {
      setError("请选择一个已发现的数据集和 Provider 后再附加。");
      return;
    }
    try {
      attachDatasetFromSummary(currentWorkspace.id, option.providerId, option.dataset);
      setSelectedDataset("");
      setError("");
      setMessage("已明确附加原生数据集；原生成员尚未验证统一使用。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  function detach(providerId: string, datasetId: string): void {
    try {
      detachNativeDataset(currentWorkspace.id, providerId, datasetId);
      setError("");
      setMessage("已移除组合成员；原始 Provider 和数据集不受影响。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }
  function move(providerId: string, datasetId: string, direction: "up" | "down"): void {
    try {
      moveNativeDataset(currentWorkspace.id, providerId, datasetId, direction);
      setError("");
      setMessage("成员顺序已保存；原生来源身份保持不变。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  function dissolve(): void {
    try {
      removeWorkspace(currentWorkspace.id);
      setError("");
      setMessage("组合数据源已解散；原生 Provider 和数据集未被删除。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return <main className="mx-auto w-full max-w-6xl overflow-auto py-6" data-testid="workspace-detail-page">
    {!embedded && <Link className="text-sm text-theme-accent" to="/data-sources">← 返回数据源</Link>}
    <header className={`${embedded ? "" : "mt-4 "}flex items-start justify-between border-b border-theme-outline pb-5`}><div><p className="text-sm font-medium text-theme-accent">组合数据源</p><h1 className="mt-1 text-2xl font-semibold">{workspace.name}</h1><p className="mt-1 text-theme-muted">成员是明确附加的 Provider 原生身份；原生来源可独立使用，组合不会删除或修改成员。</p></div><div className="flex items-center gap-4">{!embedded && <Link className="text-sm text-theme-accent" to="/data-sources">选择数据源 →</Link>}<button className="text-sm text-red-500" onClick={dissolve} type="button">解散组合</button></div></header>
    <form className="mt-6 flex max-w-xl gap-3" onSubmit={rename}><label className="min-w-0 flex-1"><span className="sr-only">新组合数据源名称</span><input aria-label="新组合数据源名称" className="w-full rounded border border-theme-outline bg-theme-primary p-2" value={name} onChange={(event) => setName(event.target.value)} placeholder="输入新名称" /></label><button className="rounded border border-theme-outline px-4 py-2 text-sm" type="submit">保存名称</button></form>
    {message && <p aria-live="polite" className="mt-3 text-sm text-green-600">{message}</p>}
    {error && <p aria-live="polite" className="mt-3 text-sm text-red-500">{error}</p>}
    <section className="mt-8 rounded border border-theme-outline bg-theme-primary p-5" aria-labelledby="attach-heading"><h2 className="font-semibold" id="attach-heading">明确附加原生数据集</h2><p className="mt-1 text-sm text-theme-muted">请逐项选择并确认。相似名称、字段或市场标签不会自动建立成员关系。</p>{query.isPending ? <p className="mt-4 text-sm text-theme-muted">正在读取当前 OpenBB 数据源…</p> : query.error || !query.data ? <p className="mt-4 text-sm text-amber-600">当前来源状态无法读取。组合数据源仍保留，恢复服务后可重新检查。</p> : <div className="mt-4 flex gap-3"><label className="min-w-0 flex-1"><span className="sr-only">选择 Provider 原生数据集</span><select aria-label="选择 Provider 原生数据集" className="w-full rounded border border-theme-outline bg-theme-primary p-2" value={selectedDataset} onChange={(event) => setSelectedDataset(event.target.value)}><option value="">选择数据集…</option>{options.map((option) => <option key={option.key} value={option.key}>{option.providerName} / {option.dataset.display_name} ({option.dataset.id}) · {option.providerState}</option>)}</select></label><button className="rounded bg-theme-accent px-4 py-2 text-sm text-theme-primary-inverse" type="button" onClick={attach}>附加</button></div>}</section>
    <section className="mt-8" aria-labelledby="members-heading"><div className="flex items-center justify-between"><h2 className="font-semibold" id="members-heading">成员与来源状态</h2><span className="text-sm text-theme-muted">{workspace.members.length} 个成员</span></div>{!workspace.members.length ? <div className="mt-3 rounded border border-dashed border-theme-outline bg-theme-primary p-6" data-testid="workspace-member-empty"><p className="font-medium">组合数据源为空</p><p className="mt-1 text-sm text-theme-muted">下一步：从上方选择一个已发现的数据集并点击“附加”。成员身份必须由你明确确认。</p></div> : <div className="mt-3 divide-y divide-theme-outline rounded border border-theme-outline bg-theme-primary">{workspace.members.map((member, index) => { const state = getWorkspaceMemberState(member, query.data?.snapshot, query.data?.service.state); const dataset = query.data?.snapshot.datasets.find((item) => item.id === member.datasetId); const provider = query.data?.snapshot.providers.find((item) => item.id === member.providerId); return <article className="p-4" key={`${member.providerId}:${member.datasetId}`}><div className="flex items-start gap-4"><div className="min-w-0 flex-1"><strong>{provider?.display_name ?? member.providerId} / {dataset?.display_name ?? member.datasetId}</strong><p className="mt-1 text-xs text-theme-muted">Provider: {member.providerId} · Dataset: {member.datasetId} · Native path: {member.nativePath ?? "未报告"}</p><p className="mt-1 text-xs text-theme-muted">附加于 {new Date(member.attachedAt).toLocaleString("zh-CN")} · 成员身份已保存，统一使用仍需当前 ODP 路由确认。</p></div><span className={state === "available" ? "text-sm text-green-600" : state === "unavailable" ? "text-sm text-red-500" : "text-sm text-amber-600"}>{workspaceMemberStateLabel(state)}</span><div className="flex items-center gap-3"><button className="text-sm text-theme-accent disabled:opacity-40" disabled={index === 0} onClick={() => move(member.providerId, member.datasetId, "up")} type="button">上移</button><button className="text-sm text-theme-accent disabled:opacity-40" disabled={index === workspace.members.length - 1} onClick={() => move(member.providerId, member.datasetId, "down")} type="button">下移</button><button className="text-sm text-red-500" onClick={() => detach(member.providerId, member.datasetId)} type="button">移除</button></div></div></article>; })}</div>}</section>
  </main>;
}

function WorkspaceRouteRedirect() {
  const navigate = useNavigate();
  const { workspaceId } = Route.useParams();

  useEffect(() => {
    void navigate({ to: "/data-sources", search: { workspaceId } });
  }, [navigate, workspaceId]);

  return <main className="mx-auto w-full max-w-4xl py-10"><p className="text-sm text-theme-muted">正在打开数据源中的组合数据源…</p></main>;
}

export const Route = createFileRoute("/workspaces/$workspaceId")({ component: WorkspaceRouteRedirect });
