import { createFileRoute } from "@tanstack/react-router";
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, useReactTable } from "@tanstack/react-table";
import { useState } from "react";
import type { DatasetSummary } from "../studio/contracts";
import { latestDatasetSuccess, readStudioActivity } from "../studio/activity";
import { StudioPageHeader, StudioPageState } from "../studio/StudioPageState";
import { useStudioState } from "../studio/queries";

const column = createColumnHelper<DatasetSummary>();
const columns = [
  column.accessor("display_name", { header: "数据集", cell: (info) => <div><a className="font-semibold text-theme-accent" href={`/playground?dataset=${info.row.original.id}`}>{info.getValue()}</a><p className="text-xs text-theme-muted">{info.row.original.description ?? info.row.original.api_path}</p><p className="text-xs text-theme-muted">{info.row.original.standard_model} · {info.row.original.python_path}</p></div> }),
  column.accessor("category", { header: "分类" }),
  column.accessor("providers", { header: "数据源", cell: (info) => info.getValue().map((provider) => provider.provider_id).join(", ") }),
  column.accessor("common_data_fields", { header: "公共字段", cell: (info) => info.getValue().slice(0, 6).map((field) => field.name).join(", ") || "—" }),
  column.accessor("provider_specific_fields", { header: "数据源特有字段", cell: (info) => Object.values(info.getValue()).flat().slice(0, 6).map((field) => field.name).join(", ") || "—" }),
  column.display({ id: "last_success", header: "最近成功", cell: (info) => { const entry = latestDatasetSuccess(info.row.original.id, readStudioActivity()); return entry ? new Date(entry.at).toLocaleString("zh-CN") : "尚未查询"; } }),
];

export function DataCatalogPage() {
  const query = useStudioState();
  const [filter, setFilter] = useState("");
  const table = useReactTable({ data: query.data?.snapshot.datasets ?? [], columns, state: { globalFilter: filter }, onGlobalFilterChange: setFilter, getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel() });
  return <StudioPageState error={query.error} isPending={query.isPending}><div className="mx-auto w-full max-w-7xl overflow-auto py-6"><StudioPageHeader title="数据目录" description="浏览当前 OpenBB 运行环境实际提供的数据集、字段和数据源覆盖。" action={<a className="rounded bg-theme-accent px-4 py-2 text-sm text-theme-primary-inverse" href="/playground">开始查询</a>} /><input className="mt-5 w-full max-w-md rounded border border-theme-outline bg-theme-primary px-3 py-2 text-sm" onChange={(event) => setFilter(event.target.value)} placeholder="搜索数据集、字段或数据源" value={filter} /><div className="mt-4 overflow-auto rounded border border-theme-outline bg-theme-primary"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-theme-tertiary text-xs text-theme-muted"><tr>{table.getHeaderGroups()[0].headers.map((header) => <th className="p-3" key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr></thead><tbody className="divide-y divide-theme-outline">{table.getRowModel().rows.map((row) => <tr className="hover:bg-theme-secondary" key={row.id}>{row.getVisibleCells().map((cell) => <td className="max-w-xs p-3 align-top" key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table></div></div></StudioPageState>;
}
export const Route = createFileRoute("/data-catalog")({ component: DataCatalogPage });
