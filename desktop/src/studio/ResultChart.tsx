import { useEffect, useRef } from "react";
import { init, use, type EChartsType } from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

export default function ResultChart({ rows }: { rows: Record<string, unknown>[] }) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let chart: EChartsType | undefined;
    if (element.current) {
      chart = init(element.current);
      const labels = rows.map((row, index) => String(row.date ?? row.datetime ?? index));
      const numericKey = Object.keys(rows[0] ?? {}).find((key) => rows.some((row) => typeof row[key] === "number"));
      chart.setOption({ animation: false, tooltip: { trigger: "axis" }, xAxis: { type: "category", data: labels }, yAxis: { type: "value", scale: true }, series: [{ type: "line", showSymbol: false, data: rows.map((row) => numericKey ? row[numericKey] : null) }] });
    }
    return () => chart?.dispose();
  }, [rows]);
  return <div aria-label="Query result chart" className="h-80 w-full" ref={element} />;
}
