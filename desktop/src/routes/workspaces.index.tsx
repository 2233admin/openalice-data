import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { useWorkspaceStore } from "../studio/workspace-hooks";
import { createWorkspace, removeWorkspace, renameWorkspace } from "../studio/workspace-store";

export function WorkspacesPage() {
  const navigate = useNavigate();
  const store = useWorkspaceStore();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function create(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    try {
      const workspace = createWorkspace(name);
      setName("");
      setError("");
      void navigate({ to: "/workspaces/$workspaceId", params: { workspaceId: workspace.id } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  function rename(id: string, currentName: string): void {
    const next = window.prompt("重命名工作区", currentName);
    if (next === null) return;
    try {
      renameWorkspace(id, next);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  function remove(id: string): void {
    if (!window.confirm("确定要移除这个工作区吗？其本地比较证据也会被移除。")) return;
    try {
      removeWorkspace(id);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return <main className="mx-auto w-full max-w-6xl overflow-auto py-6" data-testid="workspaces-page">
    <header className="flex items-start justify-between border-b border-theme-outline pb-5">
      <div><p className="text-sm font-medium text-theme-accent">STUDIO</p><h1 className="mt-1 text-2xl font-semibold">工作区</h1><p className="mt-1 text-theme-muted">用名称保存你明确选择的数据集。工作区不会保存凭证或密钥。</p></div>
      <Link className="text-sm text-theme-accent" to="/data-sources">查看数据源 →</Link>
    </header>
    <form className="mt-6 flex max-w-xl gap-3" onSubmit={create}>
      <label className="min-w-0 flex-1"><span className="sr-only">工作区名称</span><input aria-label="工作区名称" className="w-full rounded border border-theme-outline bg-theme-primary p-2" value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：美股基本面" /></label>
      <button className="rounded bg-theme-accent px-4 py-2 text-sm text-theme-primary-inverse" type="submit">创建工作区</button>
    </form>
    {error && <p aria-live="polite" className="mt-3 text-sm text-red-500">{error}</p>}
    {!store.workspaces.length ? <section className="mt-8 rounded border border-dashed border-theme-outline bg-theme-primary p-8" data-testid="workspace-empty-state"><h2 className="font-semibold">还没有工作区</h2><p className="mt-2 text-sm text-theme-muted">先创建一个工作区，再从已发现的数据源中明确附加 Provider 原生数据集。相似名称不会自动添加。</p></section> : <section className="mt-8" aria-label="工作区列表"><div className="divide-y divide-theme-outline rounded border border-theme-outline bg-theme-primary">{store.workspaces.map((workspace) => <article className="flex items-center gap-4 p-4" key={workspace.id}><div className="min-w-0 flex-1"><a className="font-semibold text-theme-accent" href={"/workspaces/${workspace.id}"}>{workspace.name}</a><p className="mt-1 text-sm text-theme-muted">{workspace.members.length} 个原生数据集 · {workspace.members.length ? "成员尚未验证" : "尚未附加数据集"}</p></div><time className="text-xs text-theme-muted" dateTime={workspace.updatedAt}>{new Date(workspace.updatedAt).toLocaleString("zh-CN")}</time><button className="text-sm text-theme-accent" type="button" onClick={() => rename(workspace.id, workspace.name)}>重命名</button><button className="text-sm text-red-500" type="button" onClick={() => remove(workspace.id)}>移除</button></article>)}</div></section>}
  </main>;
}

export const Route = createFileRoute("/workspaces/")({ component: WorkspacesPage });
