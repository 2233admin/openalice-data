import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { StudioLink } from "../studio/StudioLink";
import { useStudioState } from "../studio/queries";
import { useWorkspaceStore } from "../studio/workspace-hooks";
import { attachNativeDataset, createWorkspaceFromMembers, removeWorkspace } from "../studio/workspace-store";
import { ApiKeysPage, type ApiKey, type BuiltInSource, type CredentialSourceGroup } from "./api-keys";

const sourceRef = (sourceId: string, datasetId: string) => ({
  providerId: sourceId,
  datasetId,
  nativePath: null,
  attachedAt: new Date().toISOString(),
});

const keyRef = (key: string) => sourceRef(key, "__credential__");
const builtInRef = (sourceId: string) => sourceRef(sourceId, "__provider__");

type DataSourcesPageProps = {
  initialCategoryId?: string;
  /** Legacy URL compatibility; visible UI uses 分类 only. */
  initialWorkspaceId?: string;
};

export function DataSourcesPage({ initialCategoryId, initialWorkspaceId }: DataSourcesPageProps = {}) {
  const query = useStudioState();
  const store = useWorkspaceStore();
  const [scope, setScope] = useState(
    initialCategoryId || initialWorkspaceId ? `category:${initialCategoryId ?? initialWorkspaceId}` : "all",
  );
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [targetCategoryId, setTargetCategoryId] = useState("");

  const builtInSources = useMemo<BuiltInSource[]>(
    () => (query.data?.snapshot.providers ?? [])
      .filter((provider) => !provider.credential_fields.some((field) => field.required))
      .map((provider) => ({ id: provider.id, displayName: provider.display_name })),
    [query.data?.snapshot.providers],
  );
  const credentialSources = useMemo<CredentialSourceGroup[]>(
    () => (query.data?.snapshot.providers ?? [])
      .filter((provider) => provider.credential_fields.some((field) => field.required))
      .map((provider) => ({
        id: provider.id,
        displayName: provider.display_name,
        credentialKeys: provider.credential_fields.filter((field) => field.required).map((field) => field.name),
      })),
    [query.data?.snapshot.providers],
  );
  const builtInSourceIds = useMemo(() => new Set(builtInSources.map((source) => source.id)), [builtInSources]);
  const canonicalSourceId = (sourceId: string) =>
    credentialSources.find((source) => source.id === sourceId || source.credentialKeys.includes(sourceId))?.id ?? sourceId;
  const sourceStatuses = useMemo<Record<string, string>>(() => {
    const statuses: Record<string, string> = {};
    for (const provider of query.data?.snapshot.providers ?? []) {
      statuses[provider.id] = provider.status;
      for (const field of provider.credential_fields) statuses[field.name] = provider.status;
    }
    return statuses;
  }, [query.data?.snapshot.providers]);

  const activeCategoryId = scope.startsWith("category:") ? scope.slice("category:".length) : "";
  const activeCategory = store.workspaces.find((category) => category.id === activeCategoryId);
  const assignedKeys = useMemo(
    () => new Set(store.workspaces.flatMap((category) => category.members.map((member) => canonicalSourceId(member.providerId)))),
    [credentialSources, store.workspaces],
  );
  const categoryKeyIds = useMemo(() => {
    if (scope === "all") return null;
    if (scope === "unclassified") {
      return [
        ...credentialSources.filter((source) => !assignedKeys.has(source.id)).map((source) => source.id),
        ...apiKeys
          .filter((key) => !credentialSources.some((source) => source.credentialKeys.includes(key.key)))
          .filter((key) => !assignedKeys.has(canonicalSourceId(key.key)))
          .map((key) => key.key),
        ...builtInSources.filter((source) => !assignedKeys.has(source.id)).map((source) => source.id),
      ];
    }
    return activeCategory?.members.map((member) => canonicalSourceId(member.providerId)) ?? [];
  }, [activeCategory?.members, apiKeys, assignedKeys, builtInSources, credentialSources, scope]);
  const currentTitle = activeCategory?.name ?? (scope === "unclassified" ? "未分类" : "全部数据源");

  function sourceRefForId(sourceId: string) {
    const canonicalId = canonicalSourceId(sourceId);
    return builtInSourceIds.has(canonicalId) ? builtInRef(canonicalId) : keyRef(canonicalId);
  }

  function createCategory(): void {
    try {
      const category = createWorkspaceFromMembers(name, [...selectedKeys].map(sourceRefForId));
      setName("");
      setSelectedKeys(new Set());
      setCreating(false);
      setScope(`category:${category.id}`);
      setMessage(`已创建分类：${category.name}`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    }
  }

  function addToCategory(): void {
    const categoryId = activeCategory?.id || targetCategoryId;
    const category = store.workspaces.find((item) => item.id === categoryId);
    if (!category) return;
    for (const sourceId of selectedKeys) attachNativeDataset(category.id, sourceRefForId(sourceId));
    setSelectedKeys(new Set());
    setMessage(`已加入分类：${category.name}`);
  }

  if (query.isPending) return <main className="mx-auto w-full max-w-6xl py-6" role="status">正在读取数据源…</main>;
  if (!query.data) return <main className="mx-auto w-full max-w-4xl py-6" role="alert"><h1 className="text-xl font-semibold">数据源检查失败</h1><p className="mt-2 text-sm text-theme-muted">{query.error instanceof Error ? query.error.message : "无法读取数据源。"}</p><button className="mt-3 text-sm text-theme-accent" onClick={() => void query.refetch()} type="button">重新检查</button></main>;

  const freshness = query.data.snapshot.freshness;
  const serviceUnavailable = query.data.service.state !== "running";
  const evidenceLabel = serviceUnavailable
    ? "数据服务未运行，来源状态暂不可确认。"
    : freshness.status === "stale" ? "当前显示缓存来源，等待刷新。"
      : freshness.status === "failed" ? "实时来源检查失败，请重新检查。"
        : freshness.status === "empty" ? "检查完成，当前没有数据源。"
          : "数据源已同步。";

  return (
    <div className="mx-auto w-full max-w-7xl overflow-auto py-4">
      <header className="flex items-end justify-between gap-4 border-b border-theme-outline pb-3">
        <h1 className="text-2xl font-semibold">数据源</h1>
        <div className="flex gap-3">
          <StudioLink className="text-sm text-theme-accent" href="/environment-extensions?tab=extensions">安装扩展</StudioLink>
          <button className="rounded bg-theme-accent px-3 py-2 text-sm text-theme-primary-inverse" onClick={() => { setCreating(true); setName(""); setMessage(""); }} type="button">新建分类</button>
        </div>
      </header>
      <div className={`flex items-center justify-between gap-4 border-b border-theme-outline py-1.5 text-sm ${freshness.status === "failed" ? "text-theme-danger" : "text-theme-muted"}`} role={freshness.status === "failed" ? "alert" : "status"}>
        <span>{evidenceLabel}</span>
        <span className="flex gap-3">
          {(serviceUnavailable || freshness.status === "failed" || freshness.status === "stale") && <button className="text-theme-accent" onClick={() => void query.refetch()} type="button">重新检查</button>}
          {serviceUnavailable && <StudioLink className="text-theme-accent" href="/environment-extensions?tab=services">检查服务</StudioLink>}
        </span>
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="border-r border-theme-outline pr-4" aria-label="数据源分类">
          <nav className="space-y-1">
            <button className={`block w-full rounded px-3 py-2 text-left text-sm ${scope === "all" ? "bg-theme-tertiary font-medium" : "hover:bg-theme-secondary"}`} onClick={() => { setScope("all"); setSelectedKeys(new Set()); }} type="button">全部数据源</button>
            <button className={`block w-full rounded px-3 py-2 text-left text-sm ${scope === "unclassified" ? "bg-theme-tertiary font-medium" : "hover:bg-theme-secondary"}`} onClick={() => { setScope("unclassified"); setSelectedKeys(new Set()); }} type="button">未分类</button>
            {store.workspaces.length > 0 && <p className="px-3 pb-1 pt-3 text-xs font-semibold text-theme-muted">分类</p>}
            {store.workspaces.map((category) => <button className={`block w-full truncate rounded px-3 py-2 text-left text-sm ${activeCategoryId === category.id ? "bg-theme-tertiary font-medium" : "hover:bg-theme-secondary"}`} key={category.id} onClick={() => { setScope(`category:${category.id}`); setSelectedKeys(new Set()); }} title={category.name} type="button">{category.name}</button>)}
          </nav>
        </aside>

        <main className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
            <h2 className="font-semibold">{currentTitle}</h2>
            <div className="flex gap-3 text-sm">
              {selectedKeys.size > 0 && store.workspaces.length > 0 && <>
                <select aria-label="目标分类" className="rounded border border-theme-outline bg-theme-primary px-2 py-1" onChange={(event) => setTargetCategoryId(event.target.value)} value={activeCategory?.id || targetCategoryId}>
                  <option value="">选择分类</option>
                  {store.workspaces.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <button className="text-theme-accent disabled:opacity-50" disabled={!(activeCategory?.id || targetCategoryId)} onClick={addToCategory} type="button">加入分类</button>
              </>}
              {selectedKeys.size > 0 && <button className="text-theme-accent" onClick={() => setCreating(true)} type="button">用所选创建分类</button>}
              {activeCategory && <button className="text-theme-danger" onClick={() => { removeWorkspace(activeCategory.id); setScope("all"); }} type="button">删除分类</button>}
            </div>
          </div>

          <ApiKeysPage
            embedded
            categoryKeyIds={categoryKeyIds}
            builtInSources={builtInSources}
            credentialSources={credentialSources}
            sourceStatuses={sourceStatuses}
            selectable
            selectedKeyNames={selectedKeys}
            onKeysChange={setApiKeys}
            onSelectedKeyNamesChange={setSelectedKeys}
          />
          {message && <p className="mt-2 text-sm text-theme-accent" role="status">{message}</p>}
        </main>
      </div>

      {creating && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" role="dialog" aria-modal="true" aria-labelledby="category-form-title"><form className="w-full max-w-sm rounded border border-theme-outline bg-theme-primary p-5" onSubmit={(event) => { event.preventDefault(); createCategory(); }}><h2 className="text-lg font-semibold" id="category-form-title">新建分类</h2><label className="mt-4 block text-sm">名称<input aria-label="分类名称" autoFocus className="mt-1 w-full rounded border border-theme-outline bg-theme-secondary px-3 py-2" onChange={(event) => setName(event.target.value)} required value={name} /></label><div className="mt-5 flex justify-end gap-3"><button className="text-sm text-theme-muted" onClick={() => setCreating(false)} type="button">取消</button><button className="rounded bg-theme-accent px-3 py-2 text-sm text-theme-primary-inverse" type="submit">创建分类</button></div></form></div>}
    </div>
  );
}

function DataSourcesRoute() {
  const { categoryId, workspaceId } = Route.useSearch();
  return <DataSourcesPage initialCategoryId={categoryId} initialWorkspaceId={workspaceId} />;
}

export const Route = createFileRoute("/data-sources/")({
  validateSearch: z.object({
    categoryId: z.string().optional(),
    /** Legacy URL compatibility. */
    workspaceId: z.string().optional(),
    intent: z.enum(["use", "compose"]).optional(),
    source: z.string().optional(),
  }),
  component: DataSourcesRoute,
});
