import { Outlet, createRootRoute, useLocation, useRouter } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { AliceMark, OpenAliceBrand } from "../components/OpenAliceBrand";
import ShowVersion from "../components/ShowVersion";
import { EnvironmentCreationProvider, useEnvironmentCreation } from "../contexts/EnvironmentCreationContext";

export const Route = createRootRoute({ component: RootWithProvider });

const openAliceNavigation = [
	{ to: "/home", label: "首页" },
	{ to: "/data-sources", label: "数据源" },
] as const;

const odpNavigation = [
	{ to: "/backends", label: "Backends", activeKey: "/backends" },
	{ to: "/environments", label: "Environments", activeKey: "/environments" },
	{ to: "/api-keys", label: "API Keys", activeKey: "/api-keys" },
	{ to: "/environments?section=jupyter", label: "Jupyter", activeKey: "/jupyter" },
	{ to: "/diagnostics", label: "Logs", activeKey: "/diagnostics" },
] as const;


function activeIntent(pathname: string, search: string) {
	if (pathname === "/home") return "/home";
	if (pathname === "/data-sources" || pathname.startsWith("/data-sources/") || pathname === "/data-catalog" || pathname === "/workspaces" || pathname.startsWith("/workspaces/")) return "/data-sources";
	if (pathname === "/extensions") return "/extensions";
	if (pathname === "/backends" || pathname === "/backend-logs") return "/backends";
	if (pathname === "/environments") return search.includes("section=jupyter") ? "/jupyter" : "/environments";
	if (pathname === "/api-keys") return "/api-keys";
	if (pathname === "/diagnostics" || pathname === "/jupyter-logs") return "/diagnostics";
	return "";
}

function NavLink({ to, children, active }: { to: string; children: ReactNode; active: boolean }) {
	const { isCreatingEnvironment } = useEnvironmentCreation();
	const router = useRouter();

	if (isCreatingEnvironment && !active) {
		return <span className="px-1 pb-2 text-sm text-theme-muted opacity-50" aria-disabled="true">{children}</span>;
	}

	return (
		<a
			href={to}
			aria-current={active ? "page" : undefined}
			className={`mr-3 border-b-2 px-1 pb-2 text-sm ${active ? "tab-border-active font-medium text-theme-accent" : "border-transparent text-theme-muted"}`}
			onClick={(event) => {
				event.preventDefault();
				void router.navigate({ to });
			}}
		>
			{children}
		</a>
	);
}

function Root() {
	const { pathname: currentPath, searchStr = "" } = useLocation();
	const selectedIntent = activeIntent(currentPath, searchStr);
	const isLogsView = currentPath === "/jupyter-logs" || currentPath === "/backend-logs";
	const shouldHideNav = currentPath === "/setup" || currentPath === "/installation-progress";

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement;
			if (event.key === "Backspace" && !["input", "textarea", "select"].includes(target.tagName.toLowerCase()) && !target.isContentEditable) event.preventDefault();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	return (
		<div className="flex h-screen flex-col overflow-hidden bg-theme-primary text-theme-primary">
			<header className={`bg-theme-primary px-5 pt-3 ${isLogsView ? "logs-page-header" : ""}`}>
				<div className="flex w-full items-center justify-between pb-3">
					<OpenAliceBrand />
					<div className="flex items-center gap-2">
						<div className="text-right text-theme-muted"><ShowVersion /></div>
						<AliceMark className="h-9 w-9 text-theme-accent" aria-hidden="true" aria-label={undefined} />
					</div>
				</div>
			</header>
			<div className="border-b-2 border-theme-outline px-5">
				{!shouldHideNav && (
					<nav className="flex flex-row items-end gap-1 overflow-x-auto" aria-label="主导航">
						{openAliceNavigation.map(({ to, label }) => (
							<NavLink key={to} to={to} active={selectedIntent === to}>{label}</NavLink>
						))}
						<NavLink to="/extensions" active={selectedIntent === "/extensions"}>扩展</NavLink>
						<div className="flex items-end gap-1 border-l border-theme-outline pl-3" role="group" aria-label="ODP">
							<span className="px-1 pb-2 text-sm font-medium text-theme-primary">ODP</span>
							{odpNavigation.map(({ to, label, activeKey }) => (
								<NavLink key={label} to={to} active={selectedIntent === activeKey}>{label}</NavLink>
							))}
						</div>
					</nav>
				)}
			</div>
			<div className="flex min-h-0 flex-1 bg-theme-secondary">
				<main className={`flex flex-1 flex-col ${isLogsView ? "pl-5" : "px-5"}`}><Outlet /></main>
			</div>
			<footer className="w-full bg-theme-secondary py-1 text-center text-xs text-theme-muted">OpenAlice Data Platform · Powered by OpenBB</footer>
		</div>
	);
}

export function RootWithProvider() {
	return <EnvironmentCreationProvider><Root /></EnvironmentCreationProvider>;
}
