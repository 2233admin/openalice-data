import { createFileRoute } from "@tanstack/react-router";
import { StudioPageHeader } from "../studio/StudioPageState";

const sections = [
  { id: "services", label: "查询服务", description: "启动、停止并查看 OpenBB API、MCP 和 Jupyter 服务。", route: "/backends" },
  { id: "runtimes", label: "运行环境", description: "管理 OpenBB Desktop 使用的 Python 环境。", route: "/environments" },
  { id: "credentials", label: "完整凭证设置", description: "查看或编辑 OpenBB 的完整凭证配置。", route: "/api-keys" },
  { id: "configuration", label: "OpenBB 配置", description: "打开原有的 OpenBB 用户配置工具。", route: "/api-keys" },
  { id: "extensions", label: "底层扩展管理", description: "在受管理的运行环境中安装、更新或删除扩展包。", route: "/environments" },
  { id: "logs", label: "运行日志", description: "查看服务和数据源进程的原始日志。", route: "/backend-logs" },
];
export function AdvancedPage() { const active = new URLSearchParams(window.location.search).get("section"); return <div className="mx-auto w-full max-w-5xl overflow-auto py-6"><StudioPageHeader title="高级设置" description="日常使用不需要进入这里；这些是保留的 OpenBB Desktop 底层控制。" /><div className="mt-5 divide-y divide-theme-outline rounded border border-theme-outline bg-theme-primary">{sections.map((section) => <a className={`flex items-center gap-4 p-5 hover:bg-theme-secondary ${active === section.id ? "bg-theme-secondary" : ""}`} href={section.route} key={section.id}><div className="flex-1"><strong>{section.label}</strong><p className="mt-1 text-sm text-theme-muted">{section.description}</p></div><span className="text-theme-accent">打开 →</span></a>)}</div></div>; }
export const Route = createFileRoute("/advanced")({ component: AdvancedPage });
