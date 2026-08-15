import { createFileRoute } from "@tanstack/react-router";
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import type { DatasetSummary } from "../studio/contracts";
import { StudioLink } from "../studio/StudioLink";
import { latestDatasetSuccess, readStudioActivity } from "../studio/activity";
import { StatusPill, StudioPageHeader, StudioPageState } from "../studio/StudioPageState";
import { useStudioState } from "../studio/queries";

type SchemaField = DatasetSummary["common_data_fields"][number];

const column = createColumnHelper<DatasetSummary>();
const columns = [
  column.accessor("display_name", {
    header: "原生数据集",
    cell: (info) => {
      const dataset = info.row.original;
      return (
        <div className="min-w-64">
          <strong>{info.getValue()}</strong>
          <p className="mt-1 break-all text-xs text-theme-muted">{dataset.id}</p>
          <p className="mt-2 break-all text-xs">{dataset.api_path}</p>
          <p className="mt-1 break-all text-xs text-theme-muted">Python：{dataset.python_path ?? "未报告"}</p>
          {dataset.description && <p className="mt-2 text-xs text-theme-muted">{dataset.description}</p>}
        </div>
      );
    },
  }),
  column.accessor("category", {
    header: "分类 / 标准模型",
    cell: (info) => <div><span>{info.getValue()}</span><p className="mt-1 text-xs text-theme-muted">{info.row.original.standard_model ?? "标准模型未报告"}</p></div>,
  }),
  column.accessor("providers", {
    header: "Provider 覆盖",
    cell: (info) => (
      <ul className="space-y-2">
        {info.getValue().map((provider) => (
          <li className="flex flex-wrap items-center gap-2" key={provider.provider_id}>
            <StudioLink className="text-theme-accent" href={`/data-sources/${encodeURIComponent(provider.provider_id)}`}>{provider.provider_id}</StudioLink>
            <StatusPill value={provider.state} />
            {provider.state_description && <span className="text-xs text-theme-muted">{provider.state_description}</span>}
          </li>
        ))}
      </ul>
    ),
  }),
  column.display({
    id: "query_fields",
    header: "查询字段",
    cell: (info) => (
      <div className="min-w-52 space-y-3">
        <FieldList emptyLabel="未报告公共查询字段" fields={info.row.original.common_query_fields} />
        {Object.entries(info.row.original.provider_specific_query_fields).map(([providerId, fields]) => (
          <details key={providerId}>
            <summary className="cursor-pointer text-xs">{providerId} 特有查询字段 · {fields.length}</summary>
            <div className="mt-2"><FieldList emptyLabel="无特有查询字段" fields={fields} /></div>
          </details>
        ))}
      </div>
    ),
  }),
  column.accessor("common_data_fields", {
    header: "公共数据字段",
    cell: (info) => <div className="min-w-52"><FieldList emptyLabel="未报告公共数据字段" fields={info.getValue()} /></div>,
  }),
  column.accessor("response_fields", {
    header: "声明响应字段",
    cell: (info) => {
      const fields = info.getValue();
      return fields === null || fields === undefined
        ? <span className="text-xs text-theme-muted">OpenBB 未声明响应 schema</span>
        : <div className="min-w-52"><FieldList emptyLabel="响应 schema 未包含字段" fields={fields} /></div>;
    },
  }),
  column.accessor("provider_specific_fields", {
    header: "Provider 特有字段",
    cell: (info) => (
      <div className="min-w-52 space-y-2">
        {Object.entries(info.getValue()).length ? Object.entries(info.getValue()).map(([providerId, fields]) => (
          <details key={providerId} open={fields.length > 0}>
            <summary className="cursor-pointer text-xs">{providerId} · {fields.length} 个字段</summary>
            <div className="mt-2"><FieldList emptyLabel="无特有字段" fields={fields} /></div>
          </details>
        )) : <span className="text-xs text-theme-muted">未报告 Provider 特有字段</span>}
      </div>
    ),
  }),
  column.display({
    id: "last_success",
    header: "最近成功",
    cell: (info) => {
      const entry = latestDatasetSuccess(info.row.original.id, readStudioActivity());
      return entry ? new Date(entry.at).toLocaleString("zh-CN") : "尚未查询";
    },
  }),
  column.display({
    id: "actions",
    header: "操作",
    cell: (info) => (
      <div className="flex min-w-32 flex-col items-start gap-2">
        {info.row.original.providers.map((provider) => (
          <StudioLink
            className="text-theme-accent"
            href={`/query?dataset=${encodeURIComponent(info.row.original.id)}&provider=${encodeURIComponent(provider.provider_id)}`}
            key={provider.provider_id}
          >
            用 {provider.provider_id} 查询
          </StudioLink>
        ))}
      </div>
    ),
  }),
];

export function DataCatalogPage() {
  const query = useStudioState();
  const [filter, setFilter] = useState("");
  const snapshot = query.data?.snapshot;
  const datasets = useMemo(() => {
    const all = snapshot?.datasets ?? [];
    const term = filter.trim().toLowerCase();
    if (!term) return all;
    return all.filter((dataset) => JSON.stringify(dataset).toLowerCase().includes(term));
  }, [filter, snapshot]);
  const table = useReactTable({
    data: datasets,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  const serviceAction = snapshot?.actions.find((action) => action.entity_type === "service");

  return (
    <StudioPageState error={query.error} isPending={query.isPending}>
      <div className="mx-auto w-full max-w-7xl overflow-auto py-6">
        <StudioPageHeader
          title="数据目录"
          description="浏览当前 OpenBB 实时报告的原生数据集、标准模型、字段 schema 和 Provider 覆盖。"
          action={<StudioLink className="rounded bg-theme-accent px-4 py-2 text-sm text-theme-primary-inverse" href="/query">开始查询</StudioLink>}
        />
        {snapshot && (
          <section className="mt-5 flex flex-wrap items-center gap-4 rounded border border-theme-outline bg-theme-primary p-4" aria-label="OpenBB 目录检查状态">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                服务：{query.data?.service.state === "running" ? "运行中" : query.data?.service.state === "error" ? "异常" : "已停止"}
                {" · "}
                检查：{snapshot.freshness.status === "fresh" ? "实时" : snapshot.freshness.status === "empty" ? "成功但为空" : snapshot.freshness.status === "stale" ? "缓存已过期" : "尚未检查"}
              </p>
              <p className="mt-1 text-sm text-theme-muted">
                {snapshot.freshness.inspected_at ? `最近检查：${new Date(snapshot.freshness.inspected_at).toLocaleString("zh-CN")}` : "当前没有成功检查时间。"}
              </p>
            </div>
            {snapshot.freshness.status === "not_inspected" && serviceAction?.action_route && (
              <StudioLink className="text-sm text-theme-accent" href={serviceAction.action_route}>{serviceAction.action_label}</StudioLink>
            )}
          </section>
        )}
        <label className="mt-5 block max-w-md">
          <span className="sr-only">搜索数据目录</span>
          <input
            className="w-full rounded border border-theme-outline bg-theme-primary px-3 py-2 text-sm"
            onChange={(event) => setFilter(event.target.value)}
            placeholder="搜索数据集、字段或 Provider"
            value={filter}
          />
        </label>
        {snapshot?.datasets.length ? (
          datasets.length ? (
            <div className="mt-4 overflow-auto rounded border border-theme-outline bg-theme-primary">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-theme-tertiary text-xs text-theme-muted">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th className="whitespace-nowrap p-3" key={header.id} scope="col">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-theme-outline">
                  {table.getRowModel().rows.map((row) => (
                    <tr className="hover:bg-theme-secondary" key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <td className="p-3 align-top" key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <section className="mt-4 rounded border border-theme-outline bg-theme-primary p-5" role="status">
              <h2 className="font-semibold">没有匹配的原生数据集</h2>
              <p className="mt-2 text-sm text-theme-muted">请修改搜索词；当前实时目录仍报告 {snapshot.datasets.length} 个数据集。</p>
            </section>
          )
        ) : (
          <section className="mt-4 rounded border border-theme-outline bg-theme-primary p-6" role="status">
            <h2 className="font-semibold">{snapshot?.freshness.status === "empty" ? "OpenBB 没有报告原生数据集" : "尚未检查原生数据集"}</h2>
            <p className="mt-2 text-sm text-theme-muted">
              {snapshot?.freshness.status === "empty"
                ? "实时检查已成功完成，但 OpenBB 没有返回数据集。这不是检查失败。"
                : query.data?.service.state === "stopped"
                  ? "OpenBB 服务已停止。启动后会从 coverage 和 OpenAPI 读取原生目录。"
                  : "当前没有可显示的实时目录数据。"}
            </p>
            {serviceAction?.action_route && <StudioLink className="mt-4 inline-block text-sm text-theme-accent" href={serviceAction.action_route}>处理 OpenBB 服务</StudioLink>}
          </section>
        )}
      </div>
    </StudioPageState>
  );
}

function FieldList({ fields, emptyLabel }: { fields: SchemaField[]; emptyLabel: string }) {
  if (!fields.length) return <span className="text-xs text-theme-muted">{emptyLabel}</span>;
  return (
    <ul className="space-y-2">
      {fields.map((field) => (
        <li key={field.name}>
          <code className="break-all text-xs">{field.name}</code>
          <span className="ml-2 text-xs text-theme-muted">{field.type}{field.required ? " · 必填" : " · 可选"}</span>
          {field.description && <p className="mt-1 text-xs text-theme-muted">{field.description}</p>}
        </li>
      ))}
    </ul>
  );
}
export const Route = createFileRoute("/data-catalog")({ component: DataCatalogPage });
