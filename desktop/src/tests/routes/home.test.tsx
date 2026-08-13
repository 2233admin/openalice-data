import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { Route } from "../../routes/home";
import { useStudioState } from "../../studio/queries";

vi.mock("../../studio/queries", () => ({ useStudioState: vi.fn() }));

const Home = Route.options.component as React.ComponentType;

describe("Home", () => {
  it("renders the live action center", () => {
    vi.mocked(useStudioState).mockReturnValue({
      data: {
        runtime: "openbb",
        service: { state: "running" },
        extensions: [],
        snapshot: {
          providers: [{ id: "fmp", name: "fmp", display_name: "FMP", status: "credential_required", capability_count: 12, capabilities: [], credential_fields: [] }],
          datasets: Array.from({ length: 4 }, (_, index) => ({ id: `dataset-${index}` })),
          actions: [{ id: "credential:fmp", severity: "warning", title: "FMP needs credentials", description: "Add credentials.", entity_type: "credential", entity_id: "fmp", action_label: "Add credential", action_route: "/data-sources/fmp?tab=credentials" }],
          fetched_at: "2026-08-14T00:00:00+00:00",
        },
      },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    render(<Home />);
    expect(screen.getByRole("heading", { name: "从数据源到查询，只需三步" })).toBeInTheDocument();
    expect(screen.getByText("FMP needs credentials")).toBeInTheDocument();
    expect(screen.getByText("1 个")).toBeInTheDocument();
    expect(screen.getByText("4 个")).toBeInTheDocument();
    expect(screen.getByText("运行中")).toBeInTheDocument();
  });

  it("shows an actionable recovery state", () => {
    vi.mocked(useStudioState).mockReturnValue({
      data: undefined,
      isPending: false,
      error: { message: "Runtime missing", actionRoute: "/advanced?section=runtimes" },
      refetch: vi.fn(),
    } as never);
    render(<Home />);
    expect(screen.getByRole("link", { name: "检查运行环境" })).toHaveAttribute("href", "/advanced?section=runtimes");
  });
});
