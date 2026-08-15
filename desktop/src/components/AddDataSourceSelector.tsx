import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
const PROVIDER_CATALOG_URL = "https://raw.githubusercontent.com/OpenBB-finance/OpenBB/main/assets/extensions/provider.json";

export interface DataSourceCatalogEntry {
  packageName: string;
  reprName?: string;
  description?: string;
  credentials?: string[];
  instructions?: string | null;
}

interface AddDataSourceSelectorProps {
  installedPackages: Set<string>;
  onInstallProvider: (packageName: string) => Promise<void>;
}

export function AddDataSourceSelector({ installedPackages, onInstallProvider }: AddDataSourceSelectorProps) {
  const [providers, setProviders] = useState<DataSourceCatalogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(PROVIDER_CATALOG_URL);
        if (!response.ok) throw new Error(`无法读取数据源目录（${response.status}）。`);
        const payload: unknown = await response.json();
        if (!Array.isArray(payload)) throw new Error("数据源目录格式无效。");
        const entries = payload.filter((entry): entry is DataSourceCatalogEntry => (
          typeof entry === "object"
          && entry !== null
          && typeof (entry as DataSourceCatalogEntry).packageName === "string"
        ));
        if (!cancelled) setProviders(entries);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const availableProviders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return providers.filter((provider) => {
      if (installedPackages.has(provider.packageName.toLowerCase())) return false;
      if (!query) return true;
      return `${provider.packageName} ${provider.reprName ?? ""} ${provider.description ?? ""}`.toLowerCase().includes(query);
    });
  }, [installedPackages, providers, search]);

  const install = async (provider: DataSourceCatalogEntry) => {
    setInstalling(provider.packageName);
    setError(null);
    setMessage(null);
    try {
      await onInstallProvider(provider.packageName);
      setMessage(`${provider.reprName ?? provider.packageName} 已提交安装。服务重启并重新发现数据能力后，再配置凭证和运行测试。`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setInstalling(null);
    }
  };

  if (isLoading) {
    return <p className="mt-6 rounded border border-theme-outline p-5 text-sm text-theme-muted" role="status">正在读取可添加的数据源…</p>;
  }

  return (
    <section className="mt-6" aria-labelledby="add-data-source-heading">
      <div className="rounded border border-theme-outline bg-theme-primary p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold" id="add-data-source-heading">选择数据源</h2>
            <p className="mt-1 max-w-2xl text-sm text-theme-muted">
              这里安装的是 OpenBB Provider。安装后，回到数据源页面配置凭证、查看数据能力并运行测试；不会自动加入工作区。
            </p>
          </div>
          <Link className="text-sm text-theme-accent" to="/data-sources">返回数据源</Link>
        </div>

        <label className="mt-5 block max-w-md">
          <span className="sr-only">搜索可添加数据源</span>
          <input
            className="w-full rounded border border-theme-outline bg-theme-secondary px-3 py-2 text-sm"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索数据源名称或 Provider"
            value={search}
          />
        </label>

        {message && (
          <>
            <p className="mt-4 text-sm text-theme-accent" role="status">{message}</p>
            <p className="mt-2 text-sm text-theme-muted"><a className="text-theme-accent" href="/backends">前往服务管理重启 OpenBB 服务 →</a></p>
          </>
        )}
        {error && <p className="mt-4 text-sm text-theme-danger" role="alert">{error}</p>}

        {availableProviders.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {availableProviders.map((provider) => {
              const displayName = provider.reprName ?? provider.packageName;
              return (
                <article className="rounded border border-theme-outline bg-theme-secondary p-4" key={provider.packageName}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{displayName}</h3>
                      <p className="mt-1 break-all text-xs text-theme-muted">Provider · {provider.packageName}</p>
                    </div>
                    <span className="rounded-full border border-theme-outline px-2 py-1 text-xs text-theme-muted">数据源</span>
                  </div>
                  <p className="mt-3 min-h-10 text-sm text-theme-muted">{provider.description || "OpenBB Provider 数据源。"}</p>
                  <p className="mt-3 text-xs text-theme-muted">
                    {provider.credentials?.length ? `需要凭证：${provider.credentials.join("、")}` : "凭证要求将在安装后由 OpenBB 报告"}
                  </p>
                  <button
                    className="mt-4 rounded bg-theme-accent px-3 py-2 text-sm text-theme-primary-inverse disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={installing !== null}
                    onClick={() => void install(provider)}
                    type="button"
                  >
                    {installing === provider.packageName ? "正在安装…" : "安装数据源"}
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-5 rounded border border-dashed border-theme-outline p-5 text-sm text-theme-muted" role="status">
            {search.trim() ? "没有匹配的数据源。" : "当前目录没有可添加的数据源。"}
          </p>
        )}
      </div>

      <ol className="mt-5 grid gap-3 text-sm text-theme-muted md:grid-cols-5" aria-label="添加数据源流程">
        <li className="rounded border border-theme-outline p-3"><strong className="block text-theme-primary">1. 安装 Provider</strong>使用现有 OpenBB 安装器。</li>
        <li className="rounded border border-theme-outline p-3"><strong className="block text-theme-primary">2. 应用变更</strong>更新当前运行环境。</li>
        <li className="rounded border border-theme-outline p-3"><strong className="block text-theme-primary">3. 重启服务</strong>让 OpenBB 重新加载 Provider。</li>
        <li className="rounded border border-theme-outline p-3"><strong className="block text-theme-primary">4. 发现能力</strong>查看原生数据集和字段。</li>
        <li className="rounded border border-theme-outline p-3"><strong className="block text-theme-primary">5. 配置并测试</strong>保存凭证后运行代表性查询。</li>
      </ol>
    </section>
  );
}
