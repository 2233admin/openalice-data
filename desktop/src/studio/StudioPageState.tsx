import type { ReactNode } from "react";
import { StudioLink } from "./StudioLink";

export function StudioPageState({
  isPending,
  error,
  children,
}: {
  isPending: boolean;
  error: Error | null;
  children: ReactNode;
}) {
  if (isPending) return <div className="flex flex-1 items-center justify-center text-theme-muted">正在读取 OpenBB 运行环境…</div>;
  if (error) return <div className="m-6 rounded border border-red-400 p-5"><strong>OpenBB 需要处理</strong><p className="mt-2 text-sm text-theme-muted">{error.message}</p><StudioLink className="mt-4 inline-block text-theme-accent" href="/advanced?section=runtimes">检查运行环境</StudioLink></div>;
  return children;
}

export function StudioPageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <header className="flex items-start justify-between border-b border-theme-outline pb-5"><div><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-1 text-sm text-theme-muted">{description}</p></div>{action}</header>;
}

export function StatusPill({ value }: { value: string }) {
  const labels: Record<string, string> = { not_installed: "未安装", setup_required: "需要设置", credential_required: "需要凭证", ready_to_test: "等待测试", available: "可用", partial: "部分可用", failed: "异常", updating: "更新中" };
  return <span className="rounded-full border border-theme-outline px-2 py-1 text-xs">{labels[value] ?? value}</span>;
}
