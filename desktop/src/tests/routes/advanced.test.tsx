import { render, screen } from "@testing-library/react";
import { Route } from "../../routes/advanced";

const Advanced = Route.options.component as React.ComponentType;

describe("Advanced", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/advanced");
  });

  it("keeps non-primary system tools reachable without duplicating OpenBB functions", () => {
    render(<Advanced />);

    for (const heading of ["运行环境", "凭证", "扩展内部", "日志"]) {
      expect(screen.getByRole("heading", { name: heading, level: 2 })).toBeInTheDocument();
    }
    expect(screen.queryByRole("heading", { name: "服务", level: 2 })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "OpenBB 扩展安装器" })).toBeInTheDocument();
  });

  it("keeps original non-primary OpenBB handoffs reachable", () => {
    render(<Advanced />);

    expect(screen.getByRole("link", { name: /打开运行环境/ })).toHaveAttribute("href", "/environments");
    expect(screen.getByRole("link", { name: /打开完整凭证/ })).toHaveAttribute("href", "/api-keys");
    expect(screen.getByRole("link", { name: /打开扩展安装器/ })).toHaveAttribute("href", "/extensions");
    expect(screen.getByRole("link", { name: /打开诊断/ })).toHaveAttribute("href", "/diagnostics");
  });

  it("marks a deep-linked internal section without changing its handoff", () => {
    window.history.replaceState({}, "", "/advanced?section=extensions");
    render(<Advanced />);

    expect(screen.getByRole("link", { name: /打开扩展安装器/ })).toHaveAttribute("aria-current", "location");
    expect(screen.getByRole("link", { name: /打开扩展安装器/ })).toHaveAttribute("href", "/extensions");
  });

});
