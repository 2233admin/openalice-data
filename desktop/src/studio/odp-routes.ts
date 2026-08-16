const directRecoveryRoutes = [
  "/backends",
  "/environments",
  "/api-keys",
  "/diagnostics",
  "/backend-logs",
  "/jupyter-logs",
  "/extensions",
] as const;

export function odpRecoveryHref(actionRoute: string | undefined, fallback: "/backends" | "/diagnostics"): string {
  if (!actionRoute) return fallback;
  if (actionRoute.startsWith("/advanced")) {
    if (actionRoute.includes("credentials")) return "/api-keys";
    if (actionRoute.includes("extensions")) return "/extensions";
    if (actionRoute.includes("logs")) return "/diagnostics";
    return "/backends";
  }
  return directRecoveryRoutes.some((route) => actionRoute.startsWith(route)) ? actionRoute : fallback;
}
