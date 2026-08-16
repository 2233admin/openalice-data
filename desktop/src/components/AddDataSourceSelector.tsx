import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { StatusPill } from "../studio/StudioPageState";
import { StudioLink } from "../studio/StudioLink";
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
  discoveredProviderIds?: Set<string>;
  onInstallProvider: (packageName: string) => Promise<ProviderInstallResult | void>;
}

export interface ProviderInstallResult {
  service: "rediscovered" | "started" | "not_configured" | "failed";
  detail?: string;
}

export function AddDataSourceSelector({
  installedPackages,
  discoveredProviderIds,
  onInstallProvider,
}: AddDataSourceSelectorProps) {
  const [providers, setProviders] = useState<DataSourceCatalogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customPackage, setCustomPackage] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [requiresServiceAction, setRequiresServiceAction] = useState(false);


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

  const catalogProviders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return providers.filter((provider) => {
      if (!query) return true;
      return `${provider.packageName} ${provider.reprName ?? ""} ${provider.description ?? ""}`.toLowerCase().includes(query);
    });
  }, [providers, search]);

  const availableProviders = useMemo(
    () => catalogProviders.filter((provider) => !installedPackages.has(provider.packageName.toLowerCase())),
    [catalogProviders, installedPackages],
  );
  const installedNotDiscoveredProviders = useMemo(
    () => catalogProviders.filter((provider) => {
      if (!installedPackages.has(provider.packageName.toLowerCase())) return false;
      const packageStem = provider.packageName.toLowerCase().replace(/^openbb-/, "");
      return !discoveredProviderIds?.has(provider.packageName.toLowerCase())
        && !discoveredProviderIds?.has(packageStem);
    }),
    [catalogProviders, discoveredProviderIds, installedPackages],
  );


  const installPackage = async (packageName: string, displayName: string): Promise<boolean> => {
    setInstalling(packageName);
    setError(null);
    setMessage(null);
    setRequiresServiceAction(false);
    try {
      const result = await onInstallProvider(packageName);
      if (result?.service === "rediscovered") {
        setMessage(`${displayName} 安装完成，OpenBB 服务已重启并重新发现 Provider 和数据能力。现在可以在 ODP API Keys 配置凭证并运行测试。`);
      } else if (result?.service === "started") {
        setMessage(`${displayName} 安装完成，OpenBB 服务已启动并重新发现 Provider 和数据能力。现在可以在 ODP API Keys 配置凭证并运行测试。`);
      } else if (result?.service === "failed") {
        setMessage(`${displayName} 已安装，但 OpenBB 服务未能自动重启。`);
        setError(result.detail ?? "请到服务管理检查 OpenBB 服务，然后重新发现数据能力。");
        setRequiresServiceAction(true);
      } else if (result?.service === "not_configured") {
        setMessage(`${displayName} 已安装，但尚未配置 OpenBB 服务。配置并启动服务后才能重新发现数据能力。`);
        setRequiresServiceAction(true);
      } else {
        setMessage(`${displayName} 已提交扩展安装。服务重启并重新发现 Provider 和数据能力后，再到 ODP API Keys 配置凭证并运行测试。`);
        setRequiresServiceAction(true);
      }
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      return false;
    } finally {
      setInstalling(null);
    }
  };


  const install = async (provider: DataSourceCatalogEntry) => {
    await installPackage(provider.packageName, provider.reprName ?? provider.packageName);
  };

  const installCustomProvider = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const packageName = customPackage.trim();
    if (!packageName) {
      setError("请输入 Provider 包名。");
      return;
    }
    if (await installPackage(packageName, packageName)) {
      setCustomPackage("");
    }
  };

  if (isLoading) {
    return <p className="mt-6 rounded border border-theme-outline p-5 text-sm text-theme-muted" role="status">正在读取可安装的 Provider 扩展…</p>;
  }

  return (
    <section className="mt-6" aria-labelledby="install-extension-heading">
      <div className="rounded border border-theme-outline bg-theme-primary p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold" id="install-extension-heading">安装扩展</h2>
            <p className="mt-1 max-w-2xl text-sm text-theme-muted">
              这里安装的是 OpenBB Provider 扩展。安装后，回到数据源页面配置凭证、查看数据能力并运行测试；不会自动加入工作区。
            </p>
          </div>
          <Link className="text-sm text-theme-accent" to="/extensions">返回扩展</Link>
        </div>

        <label className="mt-5 block max-w-md">
          <span className="sr-only">搜索可安装的 Provider 扩展</span>
          <input
            className="w-full rounded border border-theme-outline bg-theme-secondary px-3 py-2 text-sm"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索 Provider 扩展名称"
            value={search}
          />
        </label>
        <div className="mt-5 rounded border border-theme-outline bg-theme-secondary p-4" aria-labelledby="custom-provider-heading">
          <h3 className="font-semibold" id="custom-provider-heading">安装自定义 Provider 扩展</h3>
          <p className="mt-1 text-sm text-theme-muted">
            输入已发布的 Provider Python 包名，直接安装到当前 OpenBB 运行环境。
          </p>
          <form className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(event) => void installCustomProvider(event)}>
            <label className="block min-w-0 flex-1">
              <span className="text-sm">Provider 包名</span>
              <input
                aria-label="Provider 包名"
                className="mt-1 w-full rounded border border-theme-outline bg-theme-primary px-3 py-2 text-sm"
                onChange={(event) => setCustomPackage(event.target.value)}
                placeholder="例如：openbb-yfinance"
                required
                value={customPackage}
              />
            </label>
            <button
              className="rounded bg-theme-accent px-3 py-2 text-sm text-theme-primary-inverse disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!customPackage.trim() || installing !== null}
              type="submit"
            >
              {installing === customPackage.trim() ? "正在安装…" : "安装扩展"}
            </button>
          </form>
        </div>

        {message && (
          <p className="mt-4 text-sm text-theme-accent" role="status">{message}</p>
        )}
        {message && requiresServiceAction && (
          <p className="mt-2 text-sm text-theme-muted"><StudioLink className="text-theme-accent" href="/advanced?section=runtimes">前往系统维护处理 OpenBB 服务 →</StudioLink></p>
        )}
        {error && <p className="mt-4 text-sm text-theme-danger" role="alert">{error}</p>}

        {installedNotDiscoveredProviders.length > 0 && (
          <section className="mt-5 rounded border border-theme-outline bg-theme-secondary p-4" aria-labelledby="installed-provider-heading">
            <h3 className="font-semibold" id="installed-provider-heading">已安装但尚未发现</h3>
            <p className="mt-1 text-sm text-theme-muted">这些 Provider 已经安装到当前环境，但 OpenBB 还没有在运行服务中报告它们。重启服务后会自动重新发现。</p>
            <div className="mt-3 divide-y divide-theme-outline rounded border border-theme-outline bg-theme-primary">
              {installedNotDiscoveredProviders.map((provider) => (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3" key={provider.packageName}>
                  <div>
                    <strong>{provider.reprName ?? provider.packageName}</strong>
                    <p className="text-xs text-theme-muted">Provider · {provider.packageName}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <StatusPill value="installed_not_applied" />
                    <StudioLink className="text-theme-accent" href="/advanced?section=runtimes">重启并发现</StudioLink>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

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
                    <StatusPill value="not_installed" />
                  </div>
                  <p className="mt-3 min-h-10 text-sm text-theme-muted">{provider.description || "OpenBB Provider 扩展。"}</p>
                  <p className="mt-3 text-xs text-theme-muted">
                    {provider.credentials?.length ? `需要凭证：${provider.credentials.join("、")}` : "凭证要求将在安装后由 OpenBB 报告"}
                  </p>
                  <button
                    className="mt-4 rounded bg-theme-accent px-3 py-2 text-sm text-theme-primary-inverse disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={installing !== null}
                    onClick={() => void install(provider)}
                    type="button"
                  >
                    {installing === provider.packageName ? "正在安装…" : "安装扩展"}
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-5 rounded border border-dashed border-theme-outline p-5 text-sm text-theme-muted" role="status">
            {search.trim() ? "没有匹配的 Provider 扩展。" : "当前目录没有可安装的 Provider 扩展。"}
          </p>
        )}
      </div>

      <ol className="mt-5 grid gap-3 text-sm text-theme-muted md:grid-cols-5" aria-label="安装扩展流程">
        <li className="rounded border border-theme-outline p-3"><strong className="block text-theme-primary">1. 安装并应用</strong>只把选中的 Provider 扩展安装到当前运行环境。</li>
        <li className="rounded border border-theme-outline p-3"><strong className="block text-theme-primary">2. 自动重启服务</strong>安装成功后重启已配置的 OpenBB 服务。</li>
        <li className="rounded border border-theme-outline p-3"><strong className="block text-theme-primary">3. 重新发现</strong>等待 OpenBB coverage 重新报告 Provider 和数据能力。</li>
        <li className="rounded border border-theme-outline p-3"><strong className="block text-theme-primary">4. 配置凭证</strong>按 OpenBB 实时报告的字段在 ODP API Keys 保存凭证。</li>
        <li className="rounded border border-theme-outline p-3"><strong className="block text-theme-primary">5. 测试查询</strong>运行代表性查询确认数据源可用。</li>
      </ol>
    </section>
  );
}
