import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { StudioLink } from "../studio/StudioLink";

type LegacyDestination =
  | { path: "/data-sources"; tab?: never }
  | { path: "/environment-extensions"; tab: "environment" | "extensions" | "services" };

function legacyDestination(): LegacyDestination {
  const section = new URLSearchParams(window.location.search).get("section");
  if (section === "credentials") return { path: "/data-sources" };
  if (section === "extensions") return { path: "/environment-extensions", tab: "extensions" };
  if (section === "logs") return { path: "/environment-extensions", tab: "services" };
  return { path: "/environment-extensions", tab: "environment" };
}

export function AdvancedPage() {
  const navigate = useNavigate();
  const destination = useMemo(legacyDestination, []);

  useEffect(() => {
    if (destination.path === "/data-sources") void navigate({ to: destination.path });
    else void navigate({ to: destination.path, search: { tab: destination.tab, directory: undefined, userDataDir: undefined, section: undefined } });
  }, [destination, navigate]);

  const href = destination.path === "/data-sources" ? destination.path : `${destination.path}?tab=${destination.tab}`;
  return <main className="mx-auto w-full max-w-4xl py-10"><p className="text-sm text-theme-muted">正在打开环境与扩展中的维护入口…</p><StudioLink className="mt-3 inline-block text-sm text-theme-accent" href={href}>继续</StudioLink></main>;
}

export const Route = createFileRoute("/advanced")({ component: AdvancedPage });
