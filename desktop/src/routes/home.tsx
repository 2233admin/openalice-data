import { Button } from "@openbb/ui-pro";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { readStudioActivity } from "../studio/activity";
import { useStudioState } from "../studio/queries";

function HomePage() {
  const { data, error, isPending, refetch } = useStudioState();
  const [activity, setActivity] = useState(readStudioActivity);
  useEffect(() => { const refresh = () => setActivity(readStudioActivity()); window.addEventListener("studio-activity", refresh); return () => window.removeEventListener("studio-activity", refresh); }, []);
  if (isPending) return <div className="flex flex-1 items-center justify-center text-theme-muted">正在读取 OpenBB 运行环境…</div>;
  if (!data) {
    const actionRoute = error && typeof error === "object" && "actionRoute" in error ? String(error.actionRoute) : "/advanced?section=runtimes";
    return <section className="mx-auto my-12 w-full max-w-3xl rounded border border-red-400 bg-theme-primary p-6"><p className="text-sm font-medium text-red-500">暂时无法使用</p><h1 className="mt-2 text-xl font-semibold">没有找到可用的 OpenBB 运行环境</h1><p className="mt-2 text-theme-muted">{error instanceof Error ? error.message : "请检查 OpenBB 是否安装完整。"}</p><div className="mt-5 flex gap-3"><a className="rounded bg-theme-accent px-4 py-2 text-sm" href={actionRoute}>检查运行环境</a><Button onClick={() => void refetch()}>重新检查</Button></div></section>;
  }
  const { snapshot, service } = data;
  const successful = activity.filter((entry) => entry.succeeded);
  const steps = [
    { title: "确认服务", detail: service.state === "running" ? "OpenBB API 已运行" : "需要先启动 OpenBB API", done: service.state === "running", href: "/backends", action: service.state === "running" ? "查看服务" : "去启动" },
    { title: "选择数据源", detail: `已发现 ${snapshot.providers.length} 个数据源`, done: snapshot.providers.length > 0, href: "/data-sources", action: "选择数据源" },
    { title: "运行查询", detail: successful.length ? `已成功查询 ${successful.length} 次` : "选好数据源后运行一次真实查询", done: successful.length > 0, href: "/playground", action: "开始查询" },
  ];
  return <div className="mx-auto w-full max-w-6xl overflow-auto py-6">
    <header className="flex items-start justify-between border-b border-theme-outline pb-5"><div><p className="text-sm font-medium text-theme-accent">OPENALICE 数据工作台</p><h1 className="mt-1 text-2xl font-semibold">从数据源到查询，只需三步</h1><p className="mt-1 text-theme-muted">环境、服务和凭证保留在顶部导航，可随时进入原有 Desktop 功能。</p></div><a className="rounded bg-theme-accent px-4 py-2 text-sm text-theme-primary-inverse" href="/data-sources">选择数据源</a></header>
    <section className="mt-6 grid grid-cols-3 gap-4">{steps.map((step, index) => <a className="rounded border border-theme-outline bg-theme-primary p-5 hover:bg-theme-secondary" href={step.href} key={step.title}><div className="flex items-center justify-between"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-theme-tertiary text-xs">{index + 1}</span><span className={`text-xs ${step.done ? "text-green-500" : "text-amber-500"}`}>{step.done ? "已完成" : "待处理"}</span></div><h2 className="mt-4 font-semibold">{step.title}</h2><p className="mt-1 text-sm text-theme-muted">{step.detail}</p><span className="mt-4 block text-sm text-theme-accent">{step.action} →</span></a>)}</section>
    {service.state !== "running" && <section className="mt-6 flex items-center gap-4 rounded border border-amber-500/50 bg-theme-primary p-4"><span className="h-2 w-2 rounded-full bg-amber-500" /><div className="flex-1"><strong className="text-sm">查询服务尚未启动</strong><p className="text-sm text-theme-muted">数据源和目录可以浏览，但真实查询必须通过 OpenBB API。</p></div><a className="text-sm text-theme-accent" href="/backends">启动服务 →</a></section>}
    <section className="mt-6 grid grid-cols-4 divide-x divide-theme-outline rounded border border-theme-outline bg-theme-primary"><Status label="API 服务" value={service.state === "running" ? "运行中" : "未启动"} /><Status label="数据源" value={`${snapshot.providers.length} 个`} /><Status label="数据集" value={`${snapshot.datasets.length} 个`} /><Status label="待处理" value={`${snapshot.actions.length} 项`} /></section>
    <section className="mt-6"><div className="flex items-center justify-between"><h2 className="font-semibold">需要处理</h2><a className="text-sm text-theme-accent" href="/data-sources">查看全部数据源</a></div><div className="mt-3 divide-y divide-theme-outline rounded border border-theme-outline bg-theme-primary">{snapshot.actions.slice(0, 5).map((action) => <div className="flex items-center gap-4 p-4" key={action.id}><span className="h-2 w-2 rounded-full bg-amber-500" /><div className="min-w-0 flex-1"><strong className="text-sm">{action.title}</strong><p className="text-sm text-theme-muted">{action.description}</p></div>{action.action_route && <a className="text-sm text-theme-accent" href={action.action_route}>{action.action_label}</a>}</div>)}{!snapshot.actions.length && <p className="p-4 text-sm text-theme-muted">当前没有阻塞项，可以直接运行查询。</p>}</div></section>
    <section className="mt-6"><div className="flex items-center justify-between"><h2 className="font-semibold">最近成功查询</h2><a className="text-sm text-theme-accent" href="/playground">打开查询</a></div><div className="mt-3 divide-y divide-theme-outline rounded border border-theme-outline bg-theme-primary">{successful.slice(0, 5).map((entry) => <a className="grid grid-cols-[1fr_10rem_8rem_11rem] gap-3 p-3 text-sm hover:bg-theme-secondary" href={`/playground?dataset=${entry.datasetId}&provider=${entry.providerId}`} key={`${entry.at}:${entry.datasetId}`}><strong>{entry.datasetId}</strong><span>{entry.providerId}</span><span>{entry.rowCount ?? 0} 行</span><time className="text-theme-muted">{new Date(entry.at).toLocaleString("zh-CN")}</time></a>)}{!successful.length && <p className="p-4 text-sm text-theme-muted">还没有查询记录。完成上面的第三步后会显示在这里。</p>}</div></section>
  </div>;
}

function Status({ label, value }: { label: string; value: string }) { return <div className="p-4"><p className="text-xs text-theme-muted">{label}</p><strong className="mt-1 block text-sm">{value}</strong></div>; }
export const Route = createFileRoute("/home")({ component: HomePage });
