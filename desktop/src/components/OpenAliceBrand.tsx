import type { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

export const AliceMark = ({ className, ...props }: ComponentProps<"svg">) => (
	<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="OpenAlice Data Platform" className={twMerge("alice-mark", className)} {...props}>
		<path d="M7 39 24 9l17 30" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
		<circle cx="15.5" cy="31" r="2.6" fill="currentColor" />
		<circle cx="24" cy="25" r="2.6" fill="currentColor" />
		<circle cx="32.5" cy="31" r="2.6" fill="currentColor" />
		<path d="m15.5 31 8.5-6 8.5 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
	</svg>
);

export const OpenAliceBrand = ({ compact = false }: { compact?: boolean }) => (
	<div className={twMerge("alice-brand", compact && "alice-brand-compact")}>
		<AliceMark />
		<div className="alice-brand-copy"><strong>OPENALICE DATA PLATFORM</strong></div>
	</div>
);
