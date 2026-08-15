import { Outlet, createFileRoute } from "@tanstack/react-router";

export function DataSourcesLayout() {
  return <Outlet />;
}

export const Route = createFileRoute("/data-sources")({ component: DataSourcesLayout });
