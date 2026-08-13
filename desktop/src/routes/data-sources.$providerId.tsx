import { Button } from "@openbb/ui-pro";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { latestProviderActivity, readStudioActivity } from "../studio/activity";
import { saveProviderCredentials } from "../studio/actions";
import { StatusPill, StudioPageHeader, StudioPageState } from "../studio/StudioPageState";
import { studioStateQueryKey, useStudioState } from "../studio/queries";

type ProviderTab = "overview" | "capabilities" | "credentials" | "health" | "advanced";

export function ProviderDetailPage({ providerId }: { providerId: string }) {
  const query = useStudioState();
  const queryClient = useQueryClient();
  const provider = query.data?.snapshot.providers.find((item) => item.id === providerId);
  const requestedTab = new URLSearchParams(window.location.search).get("tab") as ProviderTab | null;
  const [tab, setTab] = useState<ProviderTab>(requestedTab ?? "overview");
  const [message, setMessage] = useState("");
  const { register, handleSubmit, reset } = useForm<Record<string, string>>();
  const last = latestProviderActivity(providerId, readStudioActivity());
  const save = handleSubmit(async (values) => {
    setMessage("正在保存…");
    try {
      await saveProviderCredentials(values);
      await queryClient.invalidateQueries({ queryKey: studioStateQueryKey });
      reset();
      setMessage("凭证已保存。请运行一次代表性查询验证是否可用。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  });
  if (!provider && !query.isPending) return <div className="m-6">没有找到这个数据源。</div>;
  const tabLabels: Record<ProviderTab, string> = { overview: "概览", capabilities: "数据能力", credentials: "凭证", health: "健康检查", advanced: "高级" };
  return <StudioPageState error={query.error} isPending={query.isPending}>{provider && <div className="mx-auto w-full max-w-6xl overflow-auto py-6"><StudioPageHeader title={provider.display_name} description={`OpenBB 已发现 ${provider.capability_count} 项数据能力。`} action={<a className="rounded bg-theme-accent px-4 py-2 text-sm text-theme-primary-inverse" href={`/playground?provider=${provider.id}`}>运行测试查询</a>} /><nav aria-label="数据源设置" className="mt-5 flex gap-1 border-b border-theme-outline">{(["overview", "capabilities", "credentials", "health", "advanced"] as ProviderTab[]).map((item) => <button className={`px-4 py-2 text-sm ${tab === item ? "border-b-2 border-theme-accent" : "text-theme-muted"}`} key={item} onClick={() => setTab(item)} type="button">{tabLabels[item]}</button>)}</nav><section className="mt-5 rounded border border-theme-outline bg-theme-primary p-5">
    {tab === "overview" && <><div className="flex items-center justify-between"><h2 className="font-semibold">概览</h2><StatusPill value={last?.succeeded ? "available" : provider.status} /></div><dl className="mt-4 grid grid-cols-3 gap-4 text-sm"><Item label="版本" value={provider.version ?? "由运行环境报告"} /><Item label="数据能力" value={String(provider.capability_count)} /><Item label="最近测试" value={last ? new Date(last.at).toLocaleString("zh-CN") : "尚未测试"} /></dl></>}
    {tab === "capabilities" && <><h2 className="font-semibold">可查询的数据</h2><ul className="mt-3 divide-y divide-theme-outline">{provider.capabilities.map((capability) => <li className="flex justify-between py-3 text-sm" key={capability}><span>{capability}</span><a className="text-theme-accent" href={`/playground?dataset=${capability}&provider=${provider.id}`}>查询</a></li>)}</ul></>}
    {tab === "credentials" && <><h2 className="font-semibold">访问凭证</h2>{provider.credential_fields.length ? <form className="mt-4 max-w-xl space-y-4" onSubmit={(event) => void save(event)}>{provider.credential_fields.map((field) => <label className="block" key={field.name}><span className="text-sm">{field.name}</span><input autoComplete="off" className="mt-1 w-full rounded border border-theme-outline bg-theme-secondary p-2" placeholder={field.configured ? "已配置；输入新值可替换" : "必填"} type="password" {...register(field.name, { required: !field.configured })} /></label>)}<Button type="submit">保存凭证</Button><p aria-live="polite" className="text-sm text-theme-muted">{message}</p></form> : <p className="mt-3 text-sm text-theme-muted">这个数据源不需要凭证。</p>}</>}
    {tab === "health" && <><h2 className="font-semibold">健康检查</h2><div className="mt-3 divide-y divide-theme-outline"><Health label="扩展已安装" ok={Boolean(provider.version || provider.capability_count)} detail="已在当前运行环境中发现" /><Health label="数据源已加载" ok detail="由 OpenBB ProviderInterface 报告" /><Health label="查询服务" ok={query.data?.service.state === "running"} detail={query.data?.service.state === "running" ? "OpenBB API 正在运行" : "请到高级设置 → 查询服务中启动"} /><Health label="代表性查询" ok={last?.succeeded} detail={last ? `${last.succeeded ? "通过" : "失败"} · ${new Date(last.at).toLocaleString("zh-CN")}` : "尚未测试"} /></div>{!last?.succeeded && <a className="mt-4 inline-block text-sm text-theme-accent" href={`/playground?provider=${provider.id}`}>运行测试查询 →</a>}</>}
    {tab === "advanced" && <><h2 className="font-semibold">高级设置</h2><p className="mt-2 text-sm text-theme-muted">仅在排查问题时使用原有 Desktop 的运行环境、凭证和日志工具。</p><div className="mt-4 flex gap-4 text-sm"><a className="text-theme-accent" href="/advanced?section=extensions">底层扩展</a><a className="text-theme-accent" href="/advanced?section=credentials">完整凭证</a><a className="text-theme-accent" href="/advanced?section=logs">日志</a></div></>}
  </section></div>}</StudioPageState>;
}

function Item({ label, value }: { label: string; value: string }) { return <div><dt className="text-theme-muted">{label}</dt><dd>{value}</dd></div>; }
function Health({ label, ok, detail }: { label: string; ok?: boolean; detail: string }) { return <div className="flex items-center gap-4 py-3 text-sm"><span className={`h-2 w-2 rounded-full ${ok ? "bg-green-500" : "bg-amber-500"}`} /><strong className="w-44">{label}</strong><span className="text-theme-muted">{detail}</span></div>; }

function ProviderDetailRoute() { const { providerId } = Route.useParams(); return <ProviderDetailPage providerId={providerId} />; }
export const Route = createFileRoute("/data-sources/$providerId")({ component: ProviderDetailRoute });
