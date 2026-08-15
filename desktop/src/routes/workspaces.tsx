import { Outlet, createFileRoute } from "@tanstack/react-router";

export function WorkspacesLayout() {
  return <Outlet />;
}

export const Route = createFileRoute("/workspaces")({ component: WorkspacesLayout });
