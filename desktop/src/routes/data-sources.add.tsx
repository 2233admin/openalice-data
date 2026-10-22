import { createFileRoute } from "@tanstack/react-router";
import { DataSourcesPage } from "./data-sources.index";

export function AddDataSourcePage() {
  return <DataSourcesPage />;
}

export const Route = createFileRoute("/data-sources/add")({ component: AddDataSourcePage });
