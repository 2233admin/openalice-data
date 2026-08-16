import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { StudioLink } from "../studio/StudioLink";

export function FrontendsMigrationRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ to: "/environment-extensions", search: { tab: "extensions", directory: undefined, userDataDir: undefined, section: undefined }, replace: true });
  }, [navigate]);
  return <main className="mx-auto w-full max-w-4xl py-10"><p className="text-sm text-theme-muted">正在打开环境与扩展中的可启动扩展…</p><StudioLink className="mt-3 inline-block text-sm text-theme-accent" href="/environment-extensions?tab=extensions">继续</StudioLink></main>;
}

export const Route = createFileRoute("/frontends")({ component: FrontendsMigrationRedirect });
