import { invoke } from "@tauri-apps/api/core";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AddDataSourceSelector } from "../components/AddDataSourceSelector";
import { StudioPageHeader, StudioPageState } from "../studio/StudioPageState";
import { useStudioState } from "../studio/queries";

type InstallationState = {
  installation_directory: string | null;
};

type Runtime = {
  name: string;
};

export function AddDataSourcePage() {
  const query = useStudioState();
  const installedPackages = useMemo(
    () => new Set(query.data?.extensions.map((extension) => extension.package.toLowerCase()) ?? []),
    [query.data?.extensions],
  );

  const installProvider = async (packageName: string) => {
    const installation = await invoke<InstallationState>("get_installation_state");
    if (!installation.installation_directory) throw new Error("找不到 OpenBB 安装目录，请先完成安装。");
    const runtimes = await invoke<Runtime[]>("list_conda_environments", { directory: installation.installation_directory });
    const environment = query.data?.runtime && runtimes.some((runtime) => runtime.name === query.data?.runtime)
      ? query.data.runtime
      : runtimes[0]?.name;
    if (!environment) throw new Error("找不到可用的 OpenBB 运行环境，请先创建运行环境。");
    await invoke("install_extensions", { extensions: [packageName], environment });
  };

  return (
    <StudioPageState error={query.error} isPending={query.isPending}>
      <div className="mx-auto w-full max-w-6xl overflow-auto py-6">
        <StudioPageHeader
          title="添加数据源"
          description="选择并安装一个 OpenBB 数据源 Provider；官方目录适合快速开始，OpenBB 原生扩展安装器支持自定义 Provider、PyPI 和 Conda 包。"
          action={<a className="rounded border border-theme-outline px-4 py-2 text-sm text-theme-accent" href="/extensions">打开 OpenBB 安装器</a>}
        />
        <section className="mt-6 rounded border border-theme-outline bg-theme-primary p-5" aria-labelledby="custom-provider-heading">
          <h2 className="font-semibold" id="custom-provider-heading">不在官方目录中的 Provider</h2>
          <p className="mt-1 text-sm text-theme-muted">从包名、PyPI 或 Conda 添加 Provider，请使用 OpenBB 原生扩展安装器。这里不会限制你只能选择预制数据源。</p>
          <a className="mt-4 inline-flex rounded bg-theme-accent px-4 py-2 text-sm text-theme-primary-inverse" href="/extensions">添加自定义 Provider</a>
        </section>
        <AddDataSourceSelector installedPackages={installedPackages} onInstallProvider={installProvider} />
      </div>
    </StudioPageState>
  );
}

export const Route = createFileRoute("/data-sources/add")({ component: AddDataSourcePage });
