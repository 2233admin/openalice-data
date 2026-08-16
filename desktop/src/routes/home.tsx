import { invoke } from "@tauri-apps/api/core";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { StudioLink } from "../studio/StudioLink";
import {
  listLaunchableFrontends,
  startStudioService,
  stopStudioService,
  type BackendService,
} from "../studio/client";
import { useStudioState } from "../studio/queries";
import { useWorkspaceStore } from "../studio/workspace-hooks";
import type { Workspace } from "../studio/workspace-store";
import { useStartupPlanStore } from "../studio/startup-plan-hooks";
import { ensureOpenBbDefaultPlan, migrateLegacyAutoStartPlans, type StartupItem } from "../studio/startup-plan-store";

const selectionKey = "openalice.home-selection.v1";
const activeLaunchKey = "openalice.active-launch.v2";

type Selection = { environment: string; planId: string; sourceId: string; items: StartupItem[] };
type AppliedSelection = { provider_ids: string[]; workspace_id: string | null; mode: "fallback" | "batch" | null };
type Batch = {
  environment: string;
  started: string[];
  reused: string[];
  serviceFailed: string[];
  frontendFailed: string[];
  appliedSelection: AppliedSelection;
};
type CredentialsResult = { credentials?: Record<string, string | null | undefined> };

function isItem(value: unknown): value is StartupItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (item.kind === "service" || item.kind === "frontend") && typeof item.id === "string" && item.id.length > 0;
}

function readSelection(): Partial<Selection> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(selectionKey) ?? "null");
    if (!value || typeof value !== "object") return {};
    const record = value as Record<string, unknown>;
    return {
      environment: typeof record.environment === "string" ? record.environment : undefined,
      planId: typeof record.planId === "string" ? record.planId : undefined,
      sourceId: typeof record.sourceId === "string" ? record.sourceId : undefined,
      items: Array.isArray(record.items) ? record.items.filter(isItem) : undefined,
    };
  } catch {
    return {};
  }
}

function sourceValue(value: string): boolean {
  return value.startsWith("source:") || value.startsWith("workspace:");
}

function resolveAppliedSelection(sourceId: string, workspaces: Workspace[]): AppliedSelection | null {
  if (sourceId.startsWith("source:")) {
    const providerId = sourceId.slice("source:".length);
    return providerId ? { provider_ids: [providerId], workspace_id: null, mode: null } : null;
  }
  if (!sourceId.startsWith("workspace:")) return null;
  const workspace = workspaces.find((candidate) => candidate.id === sourceId.slice("workspace:".length));
  if (!workspace) return null;
  return {
    provider_ids: workspace.members.map((member) => member.providerId),
    workspace_id: workspace.id,
    mode: workspace.mode,
  };
}

function running(backend: BackendService): boolean {
  return backend.status === "running";
}

export function HomePage() {
  const query = useStudioState();
  const workspaceStore = useWorkspaceStore();
  const planStore = useStartupPlanStore();
  const previous = useMemo(readSelection, []);
  const [environment, setEnvironment] = useState(previous.environment ?? "");
  const [planId, setPlanId] = useState(previous.planId ?? "");
  const [sourceId, setSourceId] = useState(previous.sourceId ?? "");
  const [items, setItems] = useState<StartupItem[]>(previous.items ?? []);
  const [credentialNames, setCredentialNames] = useState<string[]>([]);
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState("");
  const [batch, setBatch] = useState<Batch | null>(null);
  const migrated = useRef(false);

  const runtimes = useMemo(() => {
    const names = query.data?.runtimes?.map((runtime) => runtime.name) ?? [];
    if (query.data?.runtime && !names.includes(query.data.runtime)) names.unshift(query.data.runtime);
    return names;
  }, [query.data?.runtime, query.data?.runtimes]);
  const selectedEnvironment = environment || runtimes[0] || "";
  const plans = useMemo(() => planStore.plans.filter((plan) => plan.environment === selectedEnvironment), [planStore.plans, selectedEnvironment]);
  const selectedPlan = plans.find((plan) => plan.id === planId) ?? plans[0];
  const backends = query.data?.backends ?? [];
  const services = useMemo(() => backends.filter((backend) => backend.environment === selectedEnvironment), [backends, selectedEnvironment]);
  const frontends = useMemo(() => listLaunchableFrontends(query.data?.extensions ?? []), [query.data?.extensions]);
  const providers = useMemo(() => [...(query.data?.snapshot.providers ?? [])].sort((left, right) => {
    const leftBuiltin = left.credential_fields.length === 0 ? 1 : 0;
    const rightBuiltin = right.credential_fields.length === 0 ? 1 : 0;
    return leftBuiltin - rightBuiltin || left.display_name.localeCompare(right.display_name, "zh-CN");
  }), [query.data?.snapshot.providers]);
  const credentialFieldNames = useMemo(
    () => new Set(providers.flatMap((provider) => provider.credential_fields.map((field) => field.name))),
    [providers],
  );
  const fallbackCredentialNames = useMemo(
    () => credentialNames.filter((name) => !credentialFieldNames.has(name) && !providers.some((provider) => provider.id === name)),
    [credentialFieldNames, credentialNames, providers],
  );
  useEffect(() => {
    let active = true;
    void invoke<CredentialsResult>("get_user_credentials")
      .then((result) => {
        if (!active) return;
        setCredentialNames(Object.keys(result?.credentials ?? {}).filter((name) => name.trim()));
      })
      .catch(() => {
        if (active) setCredentialNames([]);
      });
    return () => {
      active = false;
    };
  }, []);
  const selectedItems = selectedPlan?.id === planId ? items : selectedPlan?.items ?? [];
  const serviceItems = selectedItems.filter((item) => item.kind === "service");
  const frontendItems = selectedItems.filter((item) => item.kind === "frontend");
  const canStart = Boolean(selectedEnvironment && selectedPlan && sourceValue(sourceId) && !starting);

  useEffect(() => {
    if (!environment && runtimes.length) setEnvironment(previous.environment && runtimes.includes(previous.environment) ? previous.environment : runtimes[0]);
  }, [environment, previous.environment, runtimes]);

  useEffect(() => {
    const next = plans.find((plan) => plan.id === planId) ?? plans[0];
    if (next && next.id !== planId) {
      setPlanId(next.id);
      if (previous.planId !== next.id) setItems(next.items);
    }
    if (!next && planId) {
      setPlanId("");
      setItems([]);
    }
  }, [planId, plans, previous.planId]);

  useEffect(() => {
    localStorage.setItem(selectionKey, JSON.stringify({ environment: selectedEnvironment, planId: selectedPlan?.id ?? "", sourceId, items: selectedItems }));
  }, [items, selectedEnvironment, selectedPlan?.id, selectedItems, sourceId]);

  useEffect(() => {
    if (migrated.current || !query.data?.backends?.length) return;
    migrated.current = true;
    const result = migrateLegacyAutoStartPlans(query.data.backends);
    ensureOpenBbDefaultPlan(query.data.backends);
    if (!result.backendIdsToDisable.length) return;
    void Promise.all(query.data.backends.filter((backend) => result.backendIdsToDisable.includes(backend.id)).map((backend) => invoke("update_backend_service", { backend: { ...backend, auto_start: false, autoStart: false } }))).catch(() => { migrated.current = false; });
  }, [query.data?.backends]);

  function chooseEnvironment(next: string): void {
    setEnvironment(next);
    const nextPlan = planStore.plans.find((plan) => plan.environment === next);
    setPlanId(nextPlan?.id ?? "");
    setItems(nextPlan?.items ?? []);
    setMessage("");
  }

  function choosePlan(next: string): void {
    const plan = plans.find((candidate) => candidate.id === next);
    setPlanId(next);
    setItems(plan?.items ?? []);
    setMessage("");
  }
  function toggleItem(item: StartupItem): void {
    setItems((current) => current.some((candidate) => candidate.kind === item.kind && candidate.id === item.id)
      ? current.filter((candidate) => candidate.kind !== item.kind || candidate.id !== item.id)
      : [...current, item]);
  }
  async function start(): Promise<void> {
    if (!canStart || !selectedPlan) return;
    const appliedSelection = resolveAppliedSelection(sourceId, workspaceStore.workspaces);
    if (!appliedSelection) {
      setMessage("所选数据源或工作区已不存在。");
      return;
    }
    setStarting(true);
    setMessage("");
    const started: string[] = [];
    const reused: string[] = [];
    const serviceFailed: string[] = [];
    const frontendFailed: string[] = [];
    try {
      await invoke("apply_studio_selection", {
        environment: selectedEnvironment,
        ...appliedSelection,
      });
      for (const item of serviceItems) {
        const backend = services.find((candidate) => candidate.id === item.id);
        if (!backend) {
          serviceFailed.push(item.id);
          continue;
        }
        if (running(backend)) {
          reused.push(backend.id);
          continue;
        }
        try {
          const result = await startStudioService(backend.id);
          if (result.status === "error") serviceFailed.push(backend.id);
          else started.push(backend.id);
        } catch {
          serviceFailed.push(backend.id);
        }
      }
      for (const item of frontendItems) {
        const frontend = frontends.find((candidate) => candidate.id === item.id);
        if (!frontend) {
          frontendFailed.push(item.id);
          continue;
        }
        try {
          await invoke("open_url_in_window", { url: frontend.url });
        } catch {
          frontendFailed.push(item.id);
        }
      }
      const nextBatch: Batch = { environment: selectedEnvironment, started, reused, serviceFailed, frontendFailed, appliedSelection };
      localStorage.setItem(activeLaunchKey, JSON.stringify({
        ...nextBatch,
        failedServices: serviceFailed,
        failedFrontends: frontendFailed,
        ...appliedSelection,
        planId: selectedPlan.id,
        sourceId,
        items: selectedItems,
        startedAt: new Date().toISOString(),
      }));
      const failedCount = serviceFailed.length + frontendFailed.length;
      setMessage(`已执行 ${selectedItems.length} 个启动项：服务 ${started.length + reused.length} 个，前端 ${frontendItems.length} 个${failedCount ? `，${failedCount} 个失败` : ""}`);
      await query.refetch();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setStarting(false);
    }
  }

  async function stopThisLaunch(): Promise<void> {
    if (!batch) return;
    await Promise.all(batch.started.map((id) => stopStudioService(id)));
    setBatch(null);
    setMessage("已停止本次新启动的服务；本次复用的服务未停止。");
    await query.refetch();
  }

  async function stopOne(id: string): Promise<void> {
    await stopStudioService(id);
    await query.refetch();
    setMessage("服务已停止。");
  }

  async function retry(id: string): Promise<void> {
    try {
      const result = await startStudioService(id);
      if (result.status === "error") throw new Error("服务重试失败。");
      setBatch((current) => current ? {
        ...current,
        started: current.started.includes(id) ? current.started : [...current.started, id],
        serviceFailed: current.serviceFailed.filter((failedId) => failedId !== id),
      } : current);
      await query.refetch();
      setMessage("服务已重试。");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function retryFrontend(id: string): Promise<void> {
    const frontend = frontends.find((candidate) => candidate.id === id);
    if (!frontend) {
      setMessage("前端扩展不可用。");
      return;
    }
    try {
      await invoke("open_url_in_window", { url: frontend.url });
      setBatch((current) => current ? { ...current, frontendFailed: current.frontendFailed.filter((failedId) => failedId !== id) } : current);
      await query.refetch();
      setMessage("前端已重试。");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function restart(id: string): Promise<void> {
    try {
      await stopStudioService(id);
      const result = await startStudioService(id);
      if (result.status === "error") throw new Error("服务重启失败。");
      await query.refetch();
      setMessage("服务已重启。");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function stopAll(): Promise<void> {
    await Promise.all(backends.filter(running).map((backend) => stopStudioService(backend.id)));
    setBatch(null);
    await query.refetch();
    setMessage("已停止全部服务。");
  }

  if (query.isPending) return <main className="mx-auto w-full max-w-5xl py-10" role="status">正在读取运行环境与数据源…</main>;
  if (!query.data) return <main className="mx-auto w-full max-w-4xl py-10" role="alert"><h1 className="text-xl font-semibold">启动中心暂时不可用</h1><p className="mt-2 text-sm text-theme-muted">{query.error instanceof Error ? query.error.message : "无法读取 ODP 状态。"}</p><button className="mt-4 text-sm text-theme-accent" onClick={() => void query.refetch()} type="button">重新检查</button></main>;

  return (
    <main className="mx-auto w-full max-w-5xl overflow-auto py-7">
      <header className="border-b border-theme-outline pb-4">
        <p className="text-sm font-medium text-theme-accent">首页</p>
        <h1 className="mt-1 text-2xl font-semibold">启动中心</h1>
      </header>
      <section className="mt-5 border-y border-theme-outline py-4" aria-label="启动选择">
        <div className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="min-w-0 text-sm">
            <span className="mb-1 block font-medium">环境</span>
            <select aria-label="环境" className="h-9 w-full rounded border border-theme-outline bg-theme-primary px-2" onChange={(event) => chooseEnvironment(event.target.value)} value={selectedEnvironment}>
              <option value="">请选择环境</option>
              {runtimes.map((runtime) => <option key={runtime} value={runtime}>{runtime}</option>)}
            </select>
          </label>
          <label className="min-w-0 text-sm">
            <span className="mb-1 block font-medium">启动方案</span>
            <select aria-label="启动方案" className="h-9 w-full rounded border border-theme-outline bg-theme-primary px-2" disabled={!selectedEnvironment} onChange={(event) => choosePlan(event.target.value)} value={selectedPlan?.id ?? ""}>
              <option value="">请选择方案</option>
              {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
            </select>
          </label>
          <label className="min-w-0 text-sm">
            <span className="mb-1 block font-medium">数据源 / 工作区</span>
            <select aria-label="数据源 / 工作区" className="h-9 w-full rounded border border-theme-outline bg-theme-primary px-2" onChange={(event) => setSourceId(event.target.value)} value={sourceId}>
              <option value="">请选择</option>
              {workspaceStore.workspaces.length > 0 && <optgroup label="工作区">{workspaceStore.workspaces.map((workspace) => <option key={workspace.id} value={`workspace:${workspace.id}`}>{workspace.name}</option>)}</optgroup>}
              <optgroup label="API Key 数据源">
                {providers.filter((provider) => provider.credential_fields.length > 0).map((provider) => <option key={provider.id} value={`source:${provider.id}`}>{provider.display_name}</option>)}
                {fallbackCredentialNames.map((name) => <option key={`credential-${name}`} value={`source:${name}`}>{name}</option>)}
              </optgroup>
              <optgroup label="内置数据源">{providers.filter((provider) => provider.credential_fields.length === 0).map((provider) => <option key={provider.id} value={`source:${provider.id}`}>{provider.display_name}</option>)}</optgroup>
            </select>
          </label>
          <button aria-busy={starting} className="min-w-24 rounded bg-theme-accent px-4 py-2 text-sm font-medium text-theme-primary-inverse disabled:cursor-not-allowed disabled:opacity-50" disabled={!canStart} onClick={() => void start()} type="button">{starting ? "启动中…" : "Start"}</button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
          <span className="text-theme-muted">{selectedPlan ? `方案将启动 ${serviceItems.length} 个服务、打开 ${frontendItems.length} 个前端` : "请选择当前环境的启动方案"}</span>
          <StudioLink className="text-theme-accent" href="/environment-extensions?tab=plans">管理启动方案</StudioLink>
          <button className="text-theme-accent" onClick={() => setShowAdjustments((value) => !value)} type="button">{showAdjustments ? "收起本次调整" : "调整本次启动"}</button>
        </div>
        {message && <p className="mt-3 text-sm text-theme-accent" role="status" aria-live="polite">{message}</p>}
      </section>
      {showAdjustments && selectedPlan && (
        <section className="mt-4 border-b border-theme-outline pb-4" aria-label="本次启动项">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h2 className="text-sm font-semibold">服务</h2>
              <div className="mt-2 space-y-1">
                {services.map((service) => <label className="flex items-center gap-2 text-sm" key={service.id}><input checked={items.some((item) => item.kind === "service" && item.id === service.id)} onChange={() => toggleItem({ kind: "service", id: service.id })} type="checkbox" />{service.name}<span className="text-xs text-theme-muted">{service.status === "running" ? "运行中" : "已停止"}</span></label>)}
              </div>
            </div>
            <div>
              <h2 className="text-sm font-semibold">可视化前端</h2>
              <div className="mt-2 space-y-1">
                {frontends.map((frontend) => <label className="flex items-center gap-2 text-sm" key={frontend.id}><input checked={items.some((item) => item.kind === "frontend" && item.id === frontend.id)} onChange={() => toggleItem({ kind: "frontend", id: frontend.id })} type="checkbox" />{frontend.name}<span className="text-xs text-theme-muted">可启动扩展</span></label>)}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-theme-muted">这里只调整本次启动，不会修改已保存方案。</p>
        </section>
      )}
      {batch && (
        <section className="mt-4 border-b border-theme-outline pb-4" aria-label="本次启动">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">本次启动</h2>
              <p className="mt-1 text-xs text-theme-muted">新启动 {batch.started.length} 个，复用 {batch.reused.length} 个，失败 {batch.serviceFailed.length + batch.frontendFailed.length} 个。</p>
            </div>
            <div className="flex gap-3 text-sm">
              <button className="text-theme-accent" onClick={() => void stopThisLaunch()} type="button">停止本次</button>
              <button className="text-theme-danger" onClick={() => void stopAll()} type="button">停止全部</button>
            </div>
          </div>
          {batch.serviceFailed.map((id) => <div className="mt-2 flex gap-3 text-sm" key={`service-failed-${id}`}><span>{backends.find((backend) => backend.id === id)?.name ?? id}</span><button className="text-theme-accent" onClick={() => void retry(id)} type="button">重试</button><button className="text-theme-muted" onClick={() => void invoke("open_backend_logs_window", { id })} type="button">上下文日志</button></div>)}
          {batch.frontendFailed.map((id) => <div className="mt-2 flex gap-3 text-sm" key={`frontend-failed-${id}`}><span>{frontends.find((frontend) => frontend.id === id)?.name ?? id}</span><button className="text-theme-accent" onClick={() => void retryFrontend(id)} type="button">重试前端</button></div>)}
        </section>
      )}
      <section className="mt-4" aria-label="运行服务">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">当前运行服务</h2>
          <div className="flex gap-3 text-sm">
            <StudioLink className="text-theme-accent" href="/environment-extensions?tab=services">管理服务</StudioLink>
            {backends.some(running) && <button className="text-theme-danger" onClick={() => void stopAll()} type="button">停止全部</button>}
          </div>
        </div>
        {backends.filter(running).map((backend) => <div className="flex flex-wrap items-center justify-between gap-3 border-b border-theme-outline py-2 text-sm" key={backend.id}><span>{backend.name}<span className="ml-2 text-xs text-theme-muted">{backend.environment}</span></span><div className="flex gap-3"><button className="text-theme-accent" onClick={() => void stopOne(backend.id)} type="button">停止</button><button className="text-theme-accent" onClick={() => void restart(backend.id)} type="button">重启</button><button className="text-theme-muted" onClick={() => void invoke("open_backend_logs_window", { id: backend.id })} type="button">日志</button></div></div>)}
        {!backends.some(running) && <p className="border-y border-theme-outline py-3 text-sm text-theme-muted">没有正在运行的服务。</p>}
      </section>
    </main>
  );
}

export const Route = createFileRoute("/home")({ component: HomePage });
