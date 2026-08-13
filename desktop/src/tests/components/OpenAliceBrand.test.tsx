import { render, screen } from "@testing-library/react";
import { AliceMark, OpenAliceBrand } from "../../components/OpenAliceBrand";

describe("OpenAlice brand", () => {
	it("renders the product lockup", () => {
		render(<OpenAliceBrand />);
		expect(screen.getByText("OPENALICE DATA PLATFORM")).toBeInTheDocument();
		expect(screen.getByRole("img", { name: "OpenAlice Data Platform" })).toBeInTheDocument();
	});

	it("preserves caller classes on the provisional mark", () => {
		render(<AliceMark className="h-8" />);
		expect(screen.getByRole("img")).toHaveClass("alice-mark", "h-8");
	});
});
