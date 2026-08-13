import { Outlet, createRootRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AliceMark, OpenAliceBrand } from "../components/OpenAliceBrand";
import ShowVersion from "../components/ShowVersion";
import { EnvironmentCreationProvider, useEnvironmentCreation } from "../contexts/EnvironmentCreationContext";

export const Route = createRootRoute({ component: RootWithProvider });

interface NavLinkProps {
	to: string;
	children: React.ReactNode;
	selectedTab: string;
	setSelectedTab: (tab: string) => void;
}

function NavLink({ to, children, selectedTab, setSelectedTab }: NavLinkProps) {
	const { isCreatingEnvironment } = useEnvironmentCreation();
	const router = useRouter();
	const currentPath = router.state.location.pathname;
	const active = selectedTab === to;

	if (isCreatingEnvironment && currentPath !== to) {
		return <div className="px-3 py-2 text-theme-muted opacity-50" role="tab" aria-selected={active}>{children}</div>;
	}

	return (
		<button
			type="button"
			role="tab"
			aria-selected={active}
			className={`mr-3 pb-2 text-sm ${active ? "border-b-2 tab-border-active font-medium text-theme-accent" : "text-theme-muted"}`}
			onClick={() => { setSelectedTab(to); router.navigate({ to }); }}
		>
			{children}
		</button>
	);
}

function Root() {
	const router = useRouter();
	const currentPath = router.state.location.pathname;
	const [selectedTab, setSelectedTab] = useState(currentPath);
	const isLogsView = currentPath === "/jupyter-logs" || currentPath === "/backend-logs";
	const shouldHideNav = isLogsView || currentPath === "/setup" || currentPath === "/installation-progress";

	useEffect(() => setSelectedTab(currentPath), [currentPath]);
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement;
			if (event.key === "Backspace" && !["input", "textarea", "select"].includes(target.tagName.toLowerCase()) && !target.isContentEditable) event.preventDefault();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const links = [
		["/home", "首页"], ["/backends", "服务"], ["/environments", "运行环境"],
		["/api-keys", "API 凭证"], ["/data-sources", "数据源"], ["/data-catalog", "数据目录"],
		["/playground", "查询"], ["/extensions", "扩展"], ["/advanced", "高级设置"],
	] as const;

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
				{!shouldHideNav && <nav className="flex flex-row gap-1 overflow-x-auto" role="tablist" aria-label="主导航">
					{links.map(([to, label]) => <NavLink key={to} to={to} selectedTab={selectedTab} setSelectedTab={setSelectedTab}>{label}</NavLink>)}
				</nav>}
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
