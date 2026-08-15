import { invoke } from "@tauri-apps/api/core";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AddExtensionSelector } from "../components/AddExtensionSelector";
import { StudioPageHeader, StudioPageState } from "../studio/StudioPageState";
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
    if (!context) return;
    try {
      await invoke("install_extensions", {
        extensions,
        environment: context.environment,
      });
      setContext(null);
      setMessage(`已提交 ${extensions.length} 个扩展到 ${context.environment}。`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <StudioPageState error={query.error} isPending={query.isPending}>
      <div className="mx-auto w-full max-w-6xl overflow-auto py-6">
        <StudioPageHeader
          title="扩展"
          description="使用 OpenBB 原生安装器管理 Provider、路由、工具和其他扩展；数据源页面提供按能力查看 Provider 的入口。"
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
            <p className="mt-1 text-sm text-theme-muted">这里保留 OpenBB 原生扩展能力；Provider 也可以从 Data Providers 分类或自定义 PyPI / Conda 包安装。</p>
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
          installedPackages={context.installedPackages}
          onCancel={() => setContext(null)}
          onInstallExtensions={(extensions) => void installExtensions(extensions)}
        />
      )}
    </StudioPageState>
  );
}

export const Route = createFileRoute("/extensions")({ component: ExtensionsPage });
