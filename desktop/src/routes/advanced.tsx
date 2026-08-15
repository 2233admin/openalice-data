import { createFileRoute } from "@tanstack/react-router";
import { StudioPageHeader } from "../studio/StudioPageState";

const advancedGroups = [
  {
    label: "运行环境",
    description: "管理 OpenBB 使用的 Python / Conda 运行环境。",
    items: [{
      id: "runtimes",
      label: "运行环境",
      description: "创建、修复和查看 OpenBB 环境及其安装包。",
      links: [{ label: "打开运行环境", route: "/environments" }],
    }],
  },
  {
    label: "凭证",
    description: "维护未绑定到具体数据源的完整底层凭证存储。",
    items: [{
      id: "credentials",
      label: "完整凭证存储",
      description: "仅用于迁移或维护底层 API Key；数据源凭证仍可从对应 Provider 进入。",
      links: [{ label: "打开完整凭证", route: "/api-keys" }],
    }],
  },
  {
    label: "扩展内部",
    description: "保留 OpenBB 原生 Provider、PyPI、Conda、路由和其他扩展安装能力。",
    items: [{
      id: "extensions",
      label: "OpenBB 扩展安装器",
      description: "不限制为官方预制目录，可安装自定义 Provider 和其他 OpenBB 扩展。",
      links: [{ label: "打开扩展安装器", route: "/extensions" }],
    }],
  },
  {
    label: "日志",
    description: "查看服务检查、后端进程和 Notebook 运行日志。",
    items: [{
      id: "logs",
      label: "诊断与日志",
      description: "排查服务启动、查询失败和运行环境问题。",
      links: [{ label: "打开诊断", route: "/diagnostics" }],
    }],
  },
] as const;

export function AdvancedPage() {
  const active = new URLSearchParams(window.location.search).get("section");

  return (
    <div className="mx-auto w-full max-w-5xl overflow-auto py-6">
      <StudioPageHeader
        title="高级工具"
        description="这里集中放置运行环境、凭证、扩展和日志等系统工具；OpenBB API 与 MCP 请从首页功能卡直接进入。"
      />
      <div className="mt-6 space-y-8">
        {advancedGroups.map((group) => (
          <section aria-labelledby={`advanced-${group.label}`} key={group.label}>
            <h2 className="font-semibold" id={`advanced-${group.label}`}>{group.label}</h2>
            <p className="mt-1 text-sm text-theme-muted">{group.description}</p>
            <div className="mt-3 divide-y divide-theme-outline border-y border-theme-outline">
              {group.items.map((item) => (
                <article className={`grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] ${active === item.id ? "bg-theme-secondary" : ""}`} id={item.id} key={item.id}>
                  <div>
                    <h3 className="font-medium">{item.label}</h3>
                    <p className="mt-1 text-sm text-theme-muted">{item.description}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:justify-end">
                    {item.links.map((link) => (
                      <a
                        aria-current={active === item.id ? "location" : undefined}
                        className="text-sm text-theme-accent"
                        href={link.route}
                        key={link.label}
                      >
                        {link.label} →
                      </a>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/advanced")({ component: AdvancedPage });
