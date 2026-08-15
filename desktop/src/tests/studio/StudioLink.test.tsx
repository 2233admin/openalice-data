import { fireEvent, render, screen } from "@testing-library/react";
import type * as TanStackRouter from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";
import { StudioLink } from "../../studio/StudioLink";

const navigate = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof TanStackRouter>("@tanstack/react-router");
  return { ...actual, useRouter: () => ({ navigate }) };
});
describe("StudioLink", () => {
  it("uses the SPA router for internal links while preserving href", () => {
    render(<StudioLink href="/query?provider=fmp">Run query</StudioLink>);
    const link = screen.getByRole("link", { name: "Run query" });

    expect(link).toHaveAttribute("href", "/query?provider=fmp");
    fireEvent.click(link);

    expect(navigate).toHaveBeenCalledWith({ to: "/query?provider=fmp" });
  });

});
