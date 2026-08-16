import { createFileRoute, useSearch } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { AddExtensionSelector } from "../components/AddExtensionSelector";
import {
  isOpenBbRuntime,
  listLaunchableFrontends,
  type BackendService,
  type InstalledExtension,
} from "../studio/client";
import { useStudioState } from "../studio/queries";
import { useStartupPlanStore } from "../studio/startup-plan-hooks";
import {
  createStartupPlan,
  ensureOpenBbDefaultPlan,
  migrateLegacyAutoStartPlans,
  removeStartupPlan,
  updateStartupPlan,
  type StartupItem,
  type StartupPlan,
} from "../studio/startup-plan-store";

const tabs = [
  { id: "plans", label: "启动方案" },
  { id: "services", label: "服务" },
  { id: "extensions", label: "扩展" },
  { id: "environment", label: "环境" },
] as const;
type TabId = (typeof tabs)[number]["id"];

function statusLabel(status: string): string {
  if (status === "running") return "运行中";
  if (status === "error") return "失败";
  if (status === "starting") return "启动中";
  if (status === "stopping") return "停止中";
  return "已停止";
}

type ManagedExtension = InstalledExtension & {
  role?: "frontend" | "notebook";
  display_name?: string;
  frontend?: { id: string; name: string; url: string };
  notebook?: { name?: string };
};

function isManagedExtension(extension: InstalledExtension): extension is ManagedExtension {
  const role = (extension as ManagedExtension).role;
  return role === "frontend" || role === "notebook";
}

function extensionDisplayName(extension: ManagedExtension): string {
  return extension.display_name ?? extension.frontend?.name ?? extension.notebook?.name ?? extension.package;
}

function StartupPlansPanel({ environment, services, extensions }: { environment: string; services: BackendService[]; extensions: InstalledExtension[] }) {
  const store = useStartupPlanStore();
  const [editing, setEditing] = useState<StartupPlan | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [items, setItems] = useState<StartupItem[]>([]);
  const [message, setMessage] = useState("");
  const frontends = listLaunchableFrontends(extensions);
  const plans = store.plans.filter((plan) => plan.environment === environment);
  useEffect(() => {
    if (services.length > 0) ensureOpenBbDefaultPlan(services);
  }, [services]);

  function openCreate(): void {
    setEditing(null);
    setName("");
    setItems([]);
    setAdding(true);
    setMessage("");
  }

  function openEdit(plan: StartupPlan): void {
    setEditing(plan);
    setName(plan.name);
    setItems(plan.items);
    setAdding(true);
    setMessage("");
  }

  function toggle(item: StartupItem): void {
    setItems((current) => current.some((candidate) => candidate.kind === item.kind && candidate.id === item.id)
      ? current.filter((candidate) => candidate.kind !== item.kind || candidate.id !== item.id)
      : [...current, item]);
  }

  function save(): void {
    try {
      if (editing) updateStartupPlan(editing.id, { name, items });
      else createStartupPlan(environment, name, items);
      setAdding(false);
      setMessage("启动方案已保存。");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    }
  }

  if (!environment) return <p className="mt-4 text-sm text-theme-muted">请先选择运行环境。</p>;

  return <section aria-labelledby="startup-plans-heading">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold" id="startup-plans-heading">启动方案</h2><button className="rounded bg-theme-accent px-3 py-2 text-sm text-theme-primary-inverse" onClick={openCreate} type="button">添加启动方案</button></div>
    {message && <p className="mt-3 text-sm text-theme-accent" role="status">{message}</p>}
    <div className="mt-4 divide-y divide-theme-outline border-y border-theme-outline">{plans.map((plan) => <div className="flex flex-wrap items-center justify-between gap-3 py-3" key={plan.id}><div><strong>{plan.name}</strong><p className="mt-1 text-xs text-theme-muted">服务 {plan.items.filter((item) => item.kind === "service").length} 个 · 前端 {plan.items.filter((item) => item.kind === "frontend").length} 个</p></div><div className="flex gap-3 text-sm"><button className="text-theme-accent" onClick={() => openEdit(plan)} type="button">编辑</button><button className="text-theme-danger" onClick={() => { removeStartupPlan(plan.id); setMessage("启动方案已删除。"); }} type="button">删除</button></div></div>)}{plans.length === 0 && <p className="py-5 text-sm text-theme-muted">当前环境还没有启动方案。</p>}</div>
    {adding && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" role="dialog" aria-modal="true" aria-labelledby="startup-plan-form-title"><form className="w-full max-w-xl rounded border border-theme-outline bg-theme-primary p-5" onSubmit={(event) => { event.preventDefault(); save(); }}><h2 className="text-lg font-semibold" id="startup-plan-form-title">{editing ? "编辑启动方案" : "添加启动方案"}</h2><label className="mt-4 block text-sm">名称<input autoFocus className="mt-1 w-full rounded border border-theme-outline bg-theme-secondary px-3 py-2" onChange={(event) => setName(event.target.value)} required value={name} /></label><div className="mt-5 grid gap-5 md:grid-cols-2"><fieldset><legend className="text-sm font-semibold">服务</legend><div className="mt-2 space-y-2">{services.map((service) => <label className="flex items-center gap-2 text-sm" key={service.id}><input checked={items.some((item) => item.kind === "service" && item.id === service.id)} onChange={() => toggle({ kind: "service", id: service.id })} type="checkbox" />{service.name}</label>)}{services.length === 0 && <p className="text-xs text-theme-muted">当前环境没有服务。</p>}</div></fieldset><fieldset><legend className="text-sm font-semibold">可视化前端</legend><div className="mt-2 space-y-2">{frontends.map((frontend) => <label className="flex items-center gap-2 text-sm" key={frontend.id}><input checked={items.some((item) => item.kind === "frontend" && item.id === frontend.id)} onChange={() => toggle({ kind: "frontend", id: frontend.id })} type="checkbox" />{frontend.name}</label>)}</div></fieldset></div><p className="mt-4 text-xs text-theme-muted">启动方案可以只包含服务、只包含前端，也可以暂时不选服务。</p><div className="mt-5 flex justify-end gap-3"><button className="text-sm text-theme-muted" onClick={() => setAdding(false)} type="button">取消</button><button className="rounded bg-theme-accent px-3 py-2 text-sm text-theme-primary-inverse" type="submit">保存</button></div></form></div>}
  </section>;
}

function ServicesPanel({ environment, services, refresh }: { environment: string; services: BackendService[]; refresh: () => Promise<unknown> }) {
  const [editing, setEditing] = useState<BackendService | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [workingDirectory, setWorkingDirectory] = useState("");
  const [envFile, setEnvFile] = useState("");
  const [envVars, setEnvVars] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  function openCreate(): void {
    setEditing(null);
    setName("");
    setCommand("");
    setWorkingDirectory("");
    setEnvFile("");
    setEnvVars("");
    setHost("");
    setPort("");
    setUrl("");
    setError("");
    setFormOpen(true);
  }

  function openEdit(service: BackendService): void {
    setEditing(service);
    setName(service.name);
    setCommand(service.command ?? "");
    setWorkingDirectory(service.working_directory ?? "");
    setEnvFile(typeof service.envFile === "string" ? service.envFile : typeof service.env_file === "string" ? service.env_file : "");
    const values = service.envVars ?? service.env_vars;
    setEnvVars(values && typeof values === "object" ? Object.entries(values as Record<string, string>).map(([key, value]) => `${key}=${value}`).join("\n") : "");
    setHost(service.host ?? "");
    setPort(service.port == null ? "" : String(service.port));
    setUrl(service.url ?? "");
    setError("");
    setFormOpen(true);
  }

  async function action(service: BackendService, commandName: "start_backend_service" | "stop_backend_service"): Promise<boolean> {
    setError("");
    try {
      await invoke(commandName, { id: service.id });
      await refresh();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      return false;
    }
  }

  async function restart(service: BackendService): Promise<void> {
    if (!(await action(service, "stop_backend_service"))) return;
    await action(service, "start_backend_service");
  }

  async function save(): Promise<void> {
    if (!name.trim() || !command.trim() || !environment) return;
    setError("");
    const parsedVars = Object.fromEntries(
      envVars.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
        const separator = line.indexOf("=");
        return separator < 0 ? [line, ""] : [line.slice(0, separator).trim(), line.slice(separator + 1)];
      }).filter(([key]) => key),
    );
    const backend = {
      ...(editing ?? {}),
      id: editing?.id ?? `backend-${Date.now()}`,
      name: name.trim(),
      command: command.trim(),
      environment,
      status: editing?.status ?? "stopped",
      auto_start: editing?.auto_start ?? false,
      autoStart: editing?.autoStart ?? false,
      working_directory: workingDirectory.trim() || undefined,
      envFile: envFile.trim() || undefined,
      envVars: Object.keys(parsedVars).length ? parsedVars : undefined,
      host: host.trim() || undefined,
      port: port.trim() ? Number(port) : undefined,
      url: url.trim() || undefined,
      apiUrl: url.trim() || undefined,
    };
    try {
      await invoke(editing ? "update_backend_service" : "create_backend_service", { backend });
      setFormOpen(false);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function remove(service: BackendService): Promise<void> {
    setError("");
    try {
      await invoke("delete_backend_service", { id: service.id });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return <section aria-labelledby="services-heading"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold" id="services-heading">服务</h2><button className="rounded bg-theme-accent px-3 py-2 text-sm text-theme-primary-inverse" onClick={openCreate} type="button">添加服务</button></div>{error && <p className="mt-3 text-sm text-theme-danger" role="alert">{error}</p>}<div className="mt-4 divide-y divide-theme-outline border-y border-theme-outline">{services.map((service) => <div className="flex flex-wrap items-center justify-between gap-3 py-3" key={service.id}><div><strong>{service.name}</strong><span className="ml-2 text-xs text-theme-muted">{statusLabel(service.status)}</span><p className="mt-1 text-xs text-theme-muted">{service.command ?? "未显示命令"}</p></div><div className="flex flex-wrap gap-3 text-sm"><button className="text-theme-accent" onClick={() => void action(service, service.status === "running" ? "stop_backend_service" : "start_backend_service")} type="button">{service.status === "running" ? "停止" : service.status === "error" ? "重试" : "启动"}</button><button className="text-theme-accent" onClick={() => void restart(service)} type="button">重启</button><button className="text-theme-accent" onClick={() => openEdit(service)} type="button">编辑</button><button className="text-theme-muted" onClick={() => void invoke("open_backend_logs_window", { id: service.id })} type="button">日志</button><button className="text-theme-danger" onClick={() => void remove(service)} type="button">删除</button></div></div>)}{services.length === 0 && <p className="py-5 text-sm text-theme-muted">当前环境没有服务。</p>}</div>{formOpen && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="service-form-title"><form className="w-full max-w-xl rounded border border-theme-outline bg-theme-primary p-5" onSubmit={(event) => { event.preventDefault(); void save(); }}><h2 className="text-lg font-semibold" id="service-form-title">{editing ? "编辑服务" : "添加服务"}</h2><div className="grid gap-3 md:grid-cols-2"><label className="mt-4 block text-sm">名称<input className="mt-1 w-full rounded border border-theme-outline bg-theme-secondary px-3 py-2" onChange={(event) => setName(event.target.value)} required value={name} /></label><label className="mt-4 block text-sm">启动命令<input className="mt-1 w-full rounded border border-theme-outline bg-theme-secondary px-3 py-2" onChange={(event) => setCommand(event.target.value)} required value={command} /></label><label className="block text-sm">工作目录<input className="mt-1 w-full rounded border border-theme-outline bg-theme-secondary px-3 py-2" onChange={(event) => setWorkingDirectory(event.target.value)} value={workingDirectory} /></label><label className="block text-sm">环境变量文件<input className="mt-1 w-full rounded border border-theme-outline bg-theme-secondary px-3 py-2" onChange={(event) => setEnvFile(event.target.value)} value={envFile} /></label><label className="block text-sm md:col-span-2">环境变量<textarea aria-label="环境变量" className="mt-1 min-h-20 w-full rounded border border-theme-outline bg-theme-secondary px-3 py-2" onChange={(event) => setEnvVars(event.target.value)} placeholder="KEY=value" value={envVars} /></label><label className="block text-sm">主机<input className="mt-1 w-full rounded border border-theme-outline bg-theme-secondary px-3 py-2" onChange={(event) => setHost(event.target.value)} value={host} /></label><label className="block text-sm">端口<input className="mt-1 w-full rounded border border-theme-outline bg-theme-secondary px-3 py-2" inputMode="numeric" onChange={(event) => setPort(event.target.value)} type="number" value={port} /></label><label className="block text-sm md:col-span-2">HTTPS URL<input className="mt-1 w-full rounded border border-theme-outline bg-theme-secondary px-3 py-2" onChange={(event) => setUrl(event.target.value)} placeholder="https://127.0.0.1:port" value={url} /></label></div><div className="mt-5 flex justify-end gap-3"><button className="text-sm text-theme-muted" onClick={() => setFormOpen(false)} type="button">取消</button><button className="rounded bg-theme-accent px-3 py-2 text-sm text-theme-primary-inverse" type="submit">保存</button></div></form></div>}</section>;
}

function ExtensionsPanel({ environment }: { environment: string }) {
  const [extensions, setExtensions] = useState<InstalledExtension[]>([]);
  const [installDirectory, setInstallDirectory] = useState<string | null>(null);
  const [workingDirectory, setWorkingDirectory] = useState("");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [notebookStatus, setNotebookStatus] = useState<"stopped" | "starting" | "running" | "stopping">("stopped");
  const [notebookUrl, setNotebookUrl] = useState<string | null>(null);
  const visible = extensions.filter(isManagedExtension);
  const notebook = visible.find((extension) => extension.role === "notebook");

  async function refresh(): Promise<void> {
    if (!environment) return;
    const result = await invoke<{ extensions: InstalledExtension[] }>("get_environment_extensions", { name: environment });
    setExtensions(result.extensions);
  }

  async function refreshNotebookStatus(): Promise<void> {
    if (!environment || !notebook) {
      setNotebookStatus("stopped");
      setNotebookUrl(null);
      return;
    }
    try {
      const status = await invoke<{ running?: boolean; url?: string }>("check_jupyter_server", { environment });
      setNotebookStatus(status.running ? "running" : "stopped");
      setNotebookUrl(status.url ?? null);
    } catch (cause) {
      setNotebookStatus("stopped");
      setNotebookUrl(null);
      setMessage(cause instanceof Error ? cause.message : String(cause));
    }
  }

  useEffect(() => {
    let active = true;
    async function load(): Promise<void> {
      try {
        const installation = await invoke<{ installation_directory?: string | null }>("get_installation_state");
        const directory = installation.installation_directory ?? null;
        const [working, result] = await Promise.all([
          invoke<unknown>("get_working_directory", { defaultDir: directory ?? "" }),
          invoke<{ extensions: InstalledExtension[] }>("get_environment_extensions", { name: environment }),
        ]);
        if (!active) return;
        setInstallDirectory(directory);
        setWorkingDirectory(typeof working === "string" ? working : directory ?? "");
        setExtensions(result.extensions);
      } catch (cause) {
        if (active) setMessage(cause instanceof Error ? cause.message : String(cause));
      }
    }
    void load();
    return () => { active = false; };
  }, [environment]);

  useEffect(() => {
    void refreshNotebookStatus();
  }, [environment, notebook?.package]);

  async function install(extensionIds: string[]): Promise<void> {
    if (!installDirectory || !environment) return;
    try {
      await invoke("install_extensions", { directory: installDirectory, extensions: extensionIds, environment });
      setAdding(false);
      await refresh();
      setMessage("扩展已安装。");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function update(extension: ManagedExtension): Promise<void> {
    if (!installDirectory) return;
    try {
      await invoke("update_extension", { package: extension.package, environment, directory: installDirectory });
      await refresh();
      setMessage(`${extensionDisplayName(extension)} 已更新。`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function remove(extension: ManagedExtension): Promise<void> {
    if (!installDirectory) return;
    try {
      await invoke("remove_extension", { package: extension.package, environment, directory: installDirectory });
      await refresh();
      setMessage(`${extensionDisplayName(extension)} 已移除。`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function startNotebook(): Promise<void> {
    if (!notebook || !environment || !installDirectory) {
      setMessage("缺少运行环境安装目录。");
      return;
    }
    setNotebookStatus("starting");
    setMessage("");
    try {
      const status = await invoke<{ url?: string }>("start_jupyter_server", { environment, directory: installDirectory, working: workingDirectory });
      setNotebookUrl(status.url ?? null);
      setNotebookStatus("running");
    } catch (cause) {
      setNotebookStatus("stopped");
      setMessage(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function stopNotebook(): Promise<void> {
    if (!environment) return;
    setNotebookStatus("stopping");
    try {
      await invoke("stop_jupyter_server", { environment });
      setNotebookStatus("stopped");
      setNotebookUrl(null);
    } catch (cause) {
      setNotebookStatus("running");
      setMessage(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function openNotebook(): Promise<void> {
    if (!notebookUrl) {
      await refreshNotebookStatus();
      return;
    }
    try {
      await invoke("open_url_in_window", { url: notebookUrl });
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function openNotebookLogs(): Promise<void> {
    try {
      await invoke("open_jupyter_logs_window", { environment });
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return <section aria-labelledby="extensions-heading"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold" id="extensions-heading">扩展</h2><button className="rounded bg-theme-accent px-3 py-2 text-sm text-theme-primary-inverse" onClick={() => setAdding(true)} type="button">添加扩展</button></div>{message && <p className="mt-3 text-sm text-theme-accent" role="status">{message}</p>}<div className="mt-4 divide-y divide-theme-outline border-y border-theme-outline"><div className="flex items-center justify-between py-3"><div><strong>OpenBB 标准扩展</strong><p className="mt-1 text-xs text-theme-muted">系统组件</p></div><span className="text-xs text-theme-muted">内置</span></div>{visible.map((extension) => <div className="flex flex-wrap items-center justify-between gap-3 py-3" key={`${extension.package}:${extension.version}`}><div><strong>{extensionDisplayName(extension)}</strong><span className="ml-2 text-xs text-theme-muted">{extension.version}</span><p className="mt-1 text-xs text-theme-muted">{extension.role === "notebook" ? "Notebook" : "前端"}</p></div>{extension.role === "notebook" ? <div className="flex flex-wrap gap-3 text-sm">{notebookStatus === "running" ? <button className="text-theme-accent" onClick={() => void openNotebook()} type="button">打开</button> : <button className="text-theme-accent" disabled={notebookStatus === "starting" || notebookStatus === "stopping"} onClick={() => void startNotebook()} type="button">启动</button>}{notebookStatus === "running" && <button className="text-theme-accent" onClick={() => void stopNotebook()} type="button">停止</button>}<button className="text-theme-muted" onClick={() => void openNotebookLogs()} type="button">日志</button><button className="text-theme-accent" onClick={() => void update(extension)} type="button">更新</button><button className="text-theme-danger" onClick={() => void remove(extension)} type="button">删除</button></div> : <div className="flex gap-3 text-sm"><button className="text-theme-accent" onClick={() => void update(extension)} type="button">更新</button><button className="text-theme-danger" onClick={() => void remove(extension)} type="button">删除</button></div>}</div>)}{visible.length === 0 && <p className="py-4 text-sm text-theme-muted">当前环境没有已声明角色的扩展。</p>}</div>{adding && <AddExtensionSelector excludeCategories={["provider", "router", "other-openbb"]} installedPackages={new Set(extensions.map((extension) => extension.package.toLowerCase()))} onCancel={() => setAdding(false)} onInstallExtensions={(ids) => void install(ids)} />}</section>;
}

function EnvironmentPanel({ environment, runtimes, onEnvironmentChange, refresh }: { environment: string; runtimes: { name: string; pythonVersion?: string }[]; onEnvironmentChange: (name: string) => void; refresh: () => Promise<unknown> }) {
  const [installDirectory, setInstallDirectory] = useState("");
  const [newName, setNewName] = useState("");
  const [pythonVersion, setPythonVersion] = useState("3.11");
  const [importPath, setImportPath] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void invoke<{ installation_directory?: string | null }>("get_installation_state").then((state) => {
      setInstallDirectory(state.installation_directory ?? "");
    }).catch((cause) => setMessage(cause instanceof Error ? cause.message : String(cause)));
  }, []);

  async function create(): Promise<void> {
    if (!newName.trim() || !installDirectory) return;
    try {
      await invoke("create_environment", { name: newName.trim(), pythonVersion, extensions: [], directory: installDirectory, processId: `environment-create-${Date.now()}` });
      onEnvironmentChange(newName.trim());
      setNewName("");
      setMessage("环境已创建。");
      await refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function chooseImportFile(): Promise<void> {
    try {
      const path = await invoke<string>("select_requirements_file");
      if (path) setImportPath(path);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function importEnvironment(): Promise<void> {
    if (!newName.trim() || !importPath || !installDirectory) return;
    try {
      await invoke("create_environment_from_requirements", { name: newName.trim(), filePath: importPath, directory: installDirectory, processId: `environment-import-${Date.now()}` });
      onEnvironmentChange(newName.trim());
      setNewName("");
      setImportPath("");
      setMessage("环境已导入。");
      await refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function update(): Promise<void> {
    if (!environment || !installDirectory) return;
    try {
      await invoke("update_environment", { environment, directory: installDirectory });
      setMessage("环境已更新。");
      await refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function remove(): Promise<void> {
    if (!environment || !installDirectory) return;
    try {
      await invoke("remove_environment", { name: environment, directory: installDirectory });
      const next = runtimes.find((runtime) => runtime.name !== environment)?.name ?? "";
      onEnvironmentChange(next);
      setMessage("环境已删除。");
      await refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <section aria-labelledby="environment-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold" id="environment-heading">环境管理</h2>
        <div className="flex gap-3">
          <button className="text-theme-accent text-sm" onClick={() => void update()} type="button">更新环境</button>
          <button className="text-theme-danger text-sm" onClick={() => void remove()} type="button">删除环境</button>
        </div>
      </div>
      {message && <p className="mt-3 text-sm text-theme-accent" role="status">{message}</p>}
      <section aria-label="已安装环境" className="mt-4 divide-y divide-theme-outline rounded border border-theme-outline">
        <div className="px-4 py-3">
          <h3 className="text-sm font-semibold">已安装环境</h3>
          <p className="mt-1 text-xs text-theme-muted">沿用 ODP 受管 Conda 环境；选择环境后管理其扩展和服务。</p>
        </div>
        {runtimes.map((runtime) => {
          const isCurrent = runtime.name === environment;
          const isDefault = isOpenBbRuntime(runtime.name);
          return (
            <button
              aria-pressed={isCurrent}
              className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${isCurrent ? "bg-theme-tertiary" : "hover:bg-theme-secondary"}`}
              key={runtime.name}
              onClick={() => onEnvironmentChange(runtime.name)}
              type="button"
            >
              <span className="min-w-0">
                <strong className="block truncate">{isDefault ? "OpenBB 默认环境" : runtime.name}</strong>
                <span className="mt-1 block text-xs text-theme-muted">{runtime.name}{runtime.pythonVersion ? ` · Python ${runtime.pythonVersion}` : ""}</span>
              </span>
              <span className="shrink-0 text-xs text-theme-muted">{isCurrent ? "当前使用" : "选择"}</span>
            </button>
          );
        })}
        {runtimes.length === 0 && <p className="px-4 py-4 text-sm text-theme-muted">暂未发现受管环境。</p>}
      </section>
      <div className="mt-4 grid gap-3 rounded border border-theme-outline p-4 md:grid-cols-2">
        <label className="text-sm">环境名称<input className="mt-1 w-full rounded border border-theme-outline bg-theme-secondary px-3 py-2" onChange={(event) => setNewName(event.target.value)} value={newName} /></label>
        <label className="text-sm">Python 版本<input className="mt-1 w-full rounded border border-theme-outline bg-theme-secondary px-3 py-2" onChange={(event) => setPythonVersion(event.target.value)} value={pythonVersion} /></label>
        <div className="flex items-end gap-2"><button className="rounded bg-theme-accent px-3 py-2 text-sm text-theme-primary-inverse" disabled={!newName.trim() || !installDirectory} onClick={() => void create()} type="button">创建环境</button></div>
        <div className="flex items-end gap-2"><button className="rounded border border-theme-outline px-3 py-2 text-sm" onClick={() => void chooseImportFile()} type="button">选择导入文件</button><button className="rounded bg-theme-accent px-3 py-2 text-sm text-theme-primary-inverse" disabled={!newName.trim() || !importPath || !installDirectory} onClick={() => void importEnvironment()} type="button">导入环境</button></div>
        {importPath && <p className="text-xs text-theme-muted md:col-span-2">{importPath}</p>}
      </div>
    </section>
  );
}

export function EnvironmentExtensionsPage() {
  const query = useStudioState();
  const search = useSearch({ from: "/environment-extensions" });
  const runtimes = useMemo(() => {
    const reported = query.data?.runtimes ?? [];
    const current = query.data?.runtime ? [{ name: query.data.runtime }] : [];
    const unique = new Map<string, { name: string }>();
    for (const runtime of [...reported, ...current]) {
      const key = runtime.name.trim().toLowerCase();
      if (key && !unique.has(key)) unique.set(key, runtime);
    }
    return [...unique.values()].sort((left, right) => {
      const defaultOrder = Number(isOpenBbRuntime(right.name)) - Number(isOpenBbRuntime(left.name));
      return defaultOrder || left.name.localeCompare(right.name, "zh-CN");
    });
  }, [query.data?.runtime, query.data?.runtimes]);
  const [environment, setEnvironment] = useState(query.data?.runtime ?? "");
  const [tab, setTab] = useState<TabId>(search.tab ?? "plans");
  const services = (query.data?.backends ?? []).filter((backend) =>
    backend.environment.trim().toLowerCase() === environment.trim().toLowerCase());
  const autoStartMigration = useRef(false);

  useEffect(() => {
    if (autoStartMigration.current || !query.data?.backends?.length) return;
    autoStartMigration.current = true;
    const migration = migrateLegacyAutoStartPlans(query.data.backends);
    if (!migration.backendIdsToDisable.length) return;
    void Promise.all(
      query.data.backends
        .filter((backend) => migration.backendIdsToDisable.includes(backend.id))
        .map((backend) => invoke("update_backend_service", { backend: { ...backend, auto_start: false, autoStart: false } })),
    ).catch(() => {
      autoStartMigration.current = false;
    });
  }, [query.data?.backends]);

  async function refresh(): Promise<unknown> {
    return query.refetch();
  }

  if (query.isPending) return <main className="mx-auto w-full max-w-6xl py-8" role="status">正在读取环境与扩展…</main>;
  if (!query.data) return <main className="mx-auto w-full max-w-4xl py-8" role="alert"><h1 className="text-xl font-semibold">环境与扩展暂时不可用</h1><p className="mt-2 text-sm text-theme-muted">{query.error instanceof Error ? query.error.message : "无法读取 ODP 状态。"}</p><button className="mt-4 text-sm text-theme-accent" onClick={() => void query.refetch()} type="button">重新检查</button></main>;

  return <main className="mx-auto w-full max-w-7xl overflow-auto py-6"><header className="flex flex-wrap items-end justify-between gap-4 border-b border-theme-outline pb-4"><h1 className="text-2xl font-semibold">环境与扩展</h1><label className="text-sm">当前环境<select aria-label="当前环境" className="ml-2 h-9 rounded border border-theme-outline bg-theme-primary px-2" onChange={(event) => setEnvironment(event.target.value)} value={environment}>{runtimes.map((runtime) => <option key={runtime.name} value={runtime.name}>{runtime.name}</option>)}</select></label></header><nav aria-label="环境与扩展页签" className="mt-4 flex gap-4 border-b border-theme-outline" role="tablist">{tabs.map((item) => <button aria-selected={tab === item.id} className={`border-b-2 px-1 pb-2 text-sm ${tab === item.id ? "tab-border-active font-medium text-theme-accent" : "border-transparent text-theme-muted"}`} key={item.id} onClick={() => setTab(item.id)} role="tab" type="button">{item.label}</button>)}</nav><div className="py-5">{tab === "plans" && <StartupPlansPanel environment={environment} services={services} extensions={query.data.extensions} />}{tab === "services" && <ServicesPanel environment={environment} services={services} refresh={refresh} />}{tab === "extensions" && <ExtensionsPanel environment={environment} />}{tab === "environment" && <EnvironmentPanel environment={environment} runtimes={runtimes} onEnvironmentChange={setEnvironment} refresh={refresh} />}</div></main>;
}

export const Route = createFileRoute("/environment-extensions")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === "string" && tabs.some((item) => item.id === search.tab) ? search.tab as TabId : "plans",
    directory: typeof search.directory === "string" ? search.directory : undefined,
    userDataDir: typeof search.userDataDir === "string" ? search.userDataDir : undefined,
    section: search.section === "jupyter" ? "jupyter" as const : undefined,
  }),
  component: EnvironmentExtensionsPage,
});
