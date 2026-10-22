import { useRouter } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

type StudioLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
};

export function StudioLink({ children, href, onClick, ...props }: StudioLinkProps) {
  const router = useRouter();
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
      || !href.startsWith("/")
    ) {
      return;
    }
    event.preventDefault();
    void router.navigate({ to: href as never });
  }

  return <a {...props} href={href} onClick={handleClick}>{children}</a>;
}
