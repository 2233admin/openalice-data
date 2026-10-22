import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import type * as Router from "@tanstack/react-router";
import { FrontendsMigrationRedirect } from "../../routes/frontends";

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof Router>("@tanstack/react-router");
  return { ...actual, useNavigate: () => vi.fn() };
});

describe("legacy frontend route", () => {
  it("redirects frontend management into the environment extension surface", () => {
    render(<FrontendsMigrationRedirect />);
    expect(screen.getByText("正在打开环境与扩展中的可启动扩展…")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "继续" })).toHaveAttribute("href", "/environment-extensions?tab=extensions");
  });
});
