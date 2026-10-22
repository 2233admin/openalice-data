import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

function WorkspacesRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({ to: "/data-sources" });
  }, [navigate]);

  return <main className="mx-auto w-full max-w-4xl py-10"><p className="text-sm text-theme-muted">正在打开数据源中的 Workspace…</p></main>;
}

export const Route = createFileRoute("/workspaces/")({ component: WorkspacesRedirect });
