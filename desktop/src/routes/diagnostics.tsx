import { createFileRoute } from "@tanstack/react-router";
import { StudioLink } from "../studio/StudioLink";
import { StudioPageHeader } from "../studio/StudioPageState";

const logEntries = [
  {
    title: "OpenBB API 日志",
    description: "查看查询服务的启动、请求和错误原文。",
    route: "/backend-logs",
  },
  {
    title: "Jupyter 日志",
    description: "查看 Notebook 服务的启动和运行记录。",
    route: "/jupyter-logs",
  },
] as const;

export function DiagnosticsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl overflow-auto py-6">
      <StudioPageHeader
        title="日志"
        description="只在排查启动、查询或 Notebook 问题时查看原始运行记录。"
      />
      <section className="mt-6 divide-y divide-theme-outline rounded border border-theme-outline bg-theme-primary" aria-label="日志入口">
        {logEntries.map((entry) => (
          <StudioLink className="flex items-center justify-between gap-4 p-5 hover:bg-theme-secondary" href={entry.route} key={entry.route}>
            <span>
              <strong className="block font-medium">{entry.title}</strong>
              <span className="mt-1 block text-sm text-theme-muted">{entry.description}</span>
            </span>
            <span className="shrink-0 text-sm text-theme-accent">打开 →</span>
          </StudioLink>
        ))}
      </section>
    </div>
  );
}

export const Route = createFileRoute("/diagnostics")({ component: DiagnosticsPage });
