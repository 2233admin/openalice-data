import { Outlet, createRootRoute, useLocation, useRouter } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { AliceMark, OpenAliceBrand } from "../components/OpenAliceBrand";
import ShowVersion from "../components/ShowVersion";
import { EnvironmentCreationProvider, useEnvironmentCreation } from "../contexts/EnvironmentCreationContext";

export const Route = createRootRoute({ component: RootWithProvider });

const normalNavigation = [
	{ to: "/home", label: "首页" },
	{ to: "/workspaces", label: "工作区" },
	{ to: "/data-sources", label: "数据源" },
	{ to: "/query", label: "查询" },
	{ to: "/extensions", label: "扩展" },
	{ to: "/diagnostics", label: "日志" },
] as const;


function activeIntent(pathname: string) {
	if (pathname === "/home") return "/home";
	if (pathname === "/workspaces" || pathname.startsWith("/workspaces/")) return "/workspaces";
	if (pathname === "/data-sources" || pathname.startsWith("/data-sources/") || pathname === "/data-catalog") return "/data-sources";
	if (pathname === "/query" || pathname === "/playground") return "/query";
	if (pathname === "/extensions") return "/extensions";
	if (pathname === "/diagnostics" || pathname === "/backend-logs" || pathname === "/jupyter-logs") return "/diagnostics";
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
	const { pathname: currentPath } = useLocation();
	const selectedIntent = activeIntent(currentPath);
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
					<nav className="flex flex-row gap-1 overflow-x-auto" aria-label="主导航">
						{normalNavigation.map(({ to, label }) => (
							<NavLink key={to} to={to} active={selectedIntent === to}>{label}</NavLink>
						))}
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
