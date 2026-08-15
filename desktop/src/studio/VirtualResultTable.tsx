import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, type SortingState, useReactTable } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState } from "react";

export function VirtualResultTable({ rows }: { rows: Record<string, unknown>[] }) {
  const parent = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = useMemo(() => Object.keys(rows[0] ?? {}).map((key) => createColumnHelper<Record<string, unknown>>().accessor((row) => row[key], { id: key, header: key, cell: (info) => String(info.getValue() ?? "") })), [rows]);
  const table = useReactTable({ data: rows, columns, state: { globalFilter: filter, sorting }, onGlobalFilterChange: setFilter, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getSortedRowModel: getSortedRowModel() });
  const tableRows = table.getRowModel().rows;
  const virtualizer = useVirtualizer({ count: tableRows.length, getScrollElement: () => parent.current, estimateSize: () => 36, overscan: 8 });
  return <div><label className="mb-2 block"><span className="sr-only">筛选查询结果</span><input className="w-full max-w-xs rounded border border-theme-outline bg-theme-secondary px-3 py-2 text-xs" onChange={(event) => setFilter(event.target.value)} placeholder="筛选返回的数据" value={filter} /></label><div className="max-h-96 overflow-auto rounded border border-theme-outline" ref={parent}><table className="w-full text-left text-xs"><thead className="sticky top-0 z-10 bg-theme-tertiary"><tr>{table.getHeaderGroups()[0]?.headers.map((header) => <th className="p-2" key={header.id}><button onClick={header.column.getToggleSortingHandler()} type="button">{flexRender(header.column.columnDef.header, header.getContext())}{header.column.getIsSorted() === "asc" ? " ↑" : header.column.getIsSorted() === "desc" ? " ↓" : ""}</button></th>)}</tr></thead><tbody style={{ height: virtualizer.getTotalSize(), position: "relative" }}>{virtualizer.getVirtualItems().map((virtualRow) => { const row = tableRows[virtualRow.index]; return <tr className="absolute left-0 grid w-full grid-flow-col auto-cols-fr border-b border-theme-outline" key={row.id} style={{ transform: `translateY(${virtualRow.start}px)` }}>{row.getVisibleCells().map((cell) => <td className="truncate p-2" key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>; })}</tbody></table></div></div>;
}
