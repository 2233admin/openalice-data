import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import type * as Router from "@tanstack/react-router";
import { AdvancedPage } from "../../routes/advanced";

const navigate = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof Router>("@tanstack/react-router");
  return { ...actual, useNavigate: () => navigate };
});

describe("legacy advanced route", () => {
  it("redirects credential maintenance into the unified data source surface", async () => {
    window.history.pushState({}, "", "/advanced?section=credentials");
    render(<AdvancedPage />);
    expect(screen.getByText("正在打开环境与扩展中的维护入口…")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "继续" })).toHaveAttribute("href", "/data-sources");
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/data-sources" }));
  });
});
