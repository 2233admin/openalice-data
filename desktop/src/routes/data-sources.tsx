import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { latestProviderActivity, readStudioActivity } from "../studio/activity";
import { StatusPill, StudioPageHeader, StudioPageState } from "../studio/StudioPageState";
import { useStudioState } from "../studio/queries";

export function DataSourcesPage() {
  const query = useStudioState();
  const [search, setSearch] = useState("");
  const providers = useMemo(() => query.data?.snapshot.providers.filter((provider) => `${provider.display_name} ${provider.id}`.toLowerCase().includes(search.toLowerCase())) ?? [], [query.data, search]);
  const activity = readStudioActivity();
  return <StudioPageState error={query.error} isPending={query.isPending}><div className="mx-auto w-full max-w-6xl overflow-auto py-6"><StudioPageHeader title="数据源" description="这些数据源由当前 OpenBB 运行环境自动发现，无需手工维护目录。" action={<a className="rounded bg-theme-accent px-4 py-2 text-sm text-theme-primary-inverse" href="/extensions">管理扩展</a>} /><label className="mt-5 block max-w-md"><span className="sr-only">搜索数据源</span><input className="w-full rounded border border-theme-outline bg-theme-primary px-3 py-2 text-sm" onChange={(event) => setSearch(event.target.value)} placeholder="按名称搜索数据源" value={search} /></label><div className="mt-4 divide-y divide-theme-outline rounded border border-theme-outline bg-theme-primary">{providers.map((provider) => { const last = latestProviderActivity(provider.id, activity); return <div className="grid grid-cols-[minmax(12rem,1fr)_8rem_7rem_10rem_10rem] items-center gap-3 p-4" key={provider.id}><div><strong className="text-sm">{provider.display_name}</strong><p className="text-xs text-theme-muted">{provider.version ?? provider.id}</p></div><StatusPill value={last?.succeeded ? "available" : provider.status} /><span className="text-sm">{provider.capability_count} 项能力</span><span className="text-xs text-theme-muted">{last ? `${last.succeeded ? "通过" : "失败"} · ${new Date(last.at).toLocaleString("zh-CN")}` : "尚未测试"}</span><span className="flex gap-3 text-sm"><a className="text-theme-accent" href={`/data-sources/${provider.id}`}>配置</a><a className="text-theme-accent" href={`/playground?provider=${provider.id}`}>测试</a></span></div>; })}</div></div></StudioPageState>;
}

export const Route = createFileRoute("/data-sources")({ component: DataSourcesPage });
