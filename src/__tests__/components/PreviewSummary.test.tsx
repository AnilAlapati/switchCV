import React from "react";
import { render, screen } from "../__support__/testUtils";
import { PreviewSummary } from "@/components/resume/PreviewSummary";

describe("PreviewSummary", () => {
  it("returns null when no summary is provided", () => {
    const { container } = render(<PreviewSummary profile={{ summary: "" }} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when summary is undefined", () => {
    const { container } = render(<PreviewSummary profile={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders summary correctly", () => {
    const mockSummary =
      "Highly motivated software engineer with 5 years of experience.";
    render(<PreviewSummary profile={{ summary: mockSummary }} />);

    expect(screen.getByText(mockSummary)).toBeInTheDocument();
  });

  it("renders the section heading with icon", () => {
    render(<PreviewSummary profile={{ summary: "Test" }} />);
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveTextContent("📝 Professional Summary");
  });

  it("renders with whitespace-pre-wrap style", () => {
    render(<PreviewSummary profile={{ summary: "Line 1\nLine 2" }} />);
    const summary = screen.getByText(/Line 1/);
    expect(summary).toHaveClass("whitespace-pre-wrap");
  });
});
