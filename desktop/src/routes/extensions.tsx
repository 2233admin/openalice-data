import { invoke } from "@tauri-apps/api/core";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AddExtensionSelector } from "../components/AddExtensionSelector";
import { StudioPageHeader, StudioPageState } from "../studio/StudioPageState";
import { startStudioServiceAndWait, restartStudioService } from "../studio/client";
import { useStudioState } from "../studio/queries";
interface InstallationState {
  installation_directory: string | null;
}

interface Runtime {
  name: string;
}

interface InstalledExtension {
  package: string;
}

interface ExtensionContext {
  environment: string;
  directory: string;
  installedPackages: Set<string>;
}
export function ExtensionsPage() {
  const query = useStudioState();
  const [context, setContext] = useState<ExtensionContext | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const extensions = query.data?.extensions ?? [];
  const openExtensionCatalog = async () => {
    setIsLoadingContext(true);
    setError(null);
    setMessage(null);
    try {
      const installation = await invoke<InstallationState>("get_installation_state");
      if (!installation.installation_directory) throw new Error("找不到 OpenBB 安装目录，请先完成安装。");
      const runtimes = await invoke<Runtime[]>("list_conda_environments", { directory: installation.installation_directory });
      const environment = query.data?.runtime && runtimes.some((runtime) => runtime.name === query.data?.runtime)
        ? query.data.runtime
        : runtimes[0]?.name;
      if (!environment) throw new Error("找不到可用的 OpenBB 运行环境，请先创建运行环境。");
      const installed = await invoke<{ extensions: InstalledExtension[] }>("get_environment_extensions", { name: environment });
      setContext({
        directory: installation.installation_directory,
        environment,
        installedPackages: new Set(installed.extensions.map((extension) => extension.package.toLowerCase())),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsLoadingContext(false);
    }
  };

  const installExtensions = async (extensions: string[]) => {
    const target = context;
    if (!target) return;
    setError(null);
    setMessage(`正在将 ${extensions.length} 个扩展安装到 ${target.environment}…`);
    try {
      await invoke("install_extensions", {
        directory: target.directory,
        extensions,
        environment: target.environment,
      });
      const backend = query.data?.service.backend;
      if (!backend) {
        await query.refetch();
        setContext(null);
        setMessage(`已安装 ${extensions.length} 个扩展，但当前没有配置 OpenBB 服务。配置并启动服务后才能重新发现数据能力。`);
        return;
      }
      setMessage("扩展已安装，正在重启 OpenBB 服务并重新发现 Provider 和数据能力…");
      if (query.data?.service.state === "running") {
        await restartStudioService(backend.id);
      } else {
        await startStudioServiceAndWait(backend.id);
      }
      await query.refetch();
      setContext(null);
      setMessage(`已安装 ${extensions.length} 个扩展，OpenBB 服务已重启并重新发现 Provider 和数据能力。`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <StudioPageState error={query.error} isPending={query.isPending}>
      <div className="mx-auto w-full max-w-6xl overflow-auto py-6">
        <StudioPageHeader
          title="扩展"
          description="使用 OpenBB 原生安装器安装、更新或移除 Provider、Router、PyPI/Conda 包和其他运行组件；数据源凭证请在 ODP API Keys 中管理。"
          action={(
            <button className="rounded bg-theme-accent px-4 py-2 text-sm text-theme-primary-inverse disabled:opacity-60" disabled={isLoadingContext} onClick={() => void openExtensionCatalog()} type="button">
              {isLoadingContext ? "正在读取运行环境…" : "添加扩展"}
            </button>
          )}
        />
        {message && <p className="mt-4 text-sm text-theme-accent" role="status">{message}</p>}
        {error && <p className="mt-4 text-sm text-theme-danger" role="alert">{error}</p>}

        <section className="mt-6" aria-labelledby="installed-extensions-heading">
          <div>
            <h2 className="font-semibold" id="installed-extensions-heading">已安装扩展</h2>
            <p className="mt-1 text-sm text-theme-muted">这里显示当前环境已安装的 OpenBB 运行包；Provider、Router 和其他扩展都在此入口安装、更新或移除，数据源凭证请在 ODP API Keys 中维护。</p>
          </div>
          <div className="mt-3 rounded border border-theme-outline bg-theme-primary">
            {extensions.length ? extensions.map((extension) => (
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-theme-outline p-4 last:border-0" key={`${extension.package}:${extension.version}`}>
                <strong>{extension.package}</strong><span>{extension.version}</span><span>{extension.install_method}</span>
              </div>
            )) : <p className="p-4 text-sm text-theme-muted">没有已安装扩展。</p>}
          </div>
        </section>
      </div>
      {context && (
        <AddExtensionSelector
          excludeCategories={[]}
          installedPackages={context.installedPackages}
          onCancel={() => setContext(null)}
          onInstallExtensions={(extensions) => void installExtensions(extensions)}
        />
      )}
    </StudioPageState>
  );
}
function ExtensionsMigration() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ to: "/environment-extensions", search: { tab: "extensions", directory: undefined, userDataDir: undefined, section: undefined }, replace: true });
  }, [navigate]);
  return <main className="mx-auto w-full max-w-4xl py-10"><p className="text-sm text-theme-muted">正在打开环境与扩展中的扩展管理…</p><a className="mt-3 inline-block text-sm text-theme-accent" href="/environment-extensions?tab=extensions">继续</a></main>;
}

export const Route = createFileRoute("/extensions")({ component: ExtensionsMigration });
