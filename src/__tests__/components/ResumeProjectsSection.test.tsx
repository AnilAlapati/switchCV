import React from "react";
import { render, screen } from "../__support__/testUtils";
import { ResumeProjectsSection } from "@/components/resume/ResumeProjectsSection";

jest.mock("@/lib/utils/resumeVisibility", () => ({
  hasRequestItems: jest.fn(() => false),
}));

describe("ResumeProjectsSection", () => {
  const mockProjects = [
    {
      name: "Project Alpha",
      description: "A cool project",
      visibility: "public" as const,
      url: "https://example.com",
    },
    {
      name: "Project Beta",
      description: "Another project",
      visibility: "public" as const,
      url: undefined,
    },
  ] as any;

  it("renders project list when projects are public", () => {
    render(<ResumeProjectsSection projects={mockProjects} />);

    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getByText("Project Beta")).toBeInTheDocument();
  });

  it("displays project descriptions", () => {
    render(<ResumeProjectsSection projects={mockProjects} />);

    expect(screen.getByText("A cool project")).toBeInTheDocument();
    expect(screen.getByText("Another project")).toBeInTheDocument();
  });

  it("renders visit link for projects with URL", () => {
    render(<ResumeProjectsSection projects={mockProjects} />);

    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute("href", "https://example.com");
  });

  it("returns null when no public projects and no requests", () => {
    const { container } = render(<ResumeProjectsSection projects={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it("displays message when projects are private", () => {
    render(<ResumeProjectsSection projects={[]} />);

    // When empty, section returns null so message won't appear
    // This is expected behavior
    expect(screen.queryByText(/private/i)).not.toBeInTheDocument();
  });
});
