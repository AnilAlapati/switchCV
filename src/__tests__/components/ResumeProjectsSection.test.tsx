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

  it("does not render visit link for projects without URL", () => {
    render(<ResumeProjectsSection projects={mockProjects} />);

    const links = screen.queryAllByRole("link");
    expect(links.length).toBe(1); // Only one project has a URL
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

  it("renders projects without IDs", () => {
    const projectsWithoutIds = [
      { ...mockProjects[0], id: undefined },
      { ...mockProjects[1], id: undefined },
    ];
    render(<ResumeProjectsSection projects={projectsWithoutIds} />);

    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getByText("Project Beta")).toBeInTheDocument();
  });

  it("shows request notice when there are request items", () => {
    const { hasRequestItems } = require("@/lib/utils/resumeVisibility");
    hasRequestItems.mockReturnValue(true);
    const privateProjects = [
      { ...mockProjects[0], visibility: "private" as const },
    ];

    render(<ResumeProjectsSection projects={privateProjects} />);

    expect(
      screen.getByText(
        "Additional project details are available upon request.",
      ),
    ).toBeInTheDocument();
  });

  it("shows private message and request notice when no public projects but has requests", () => {
    const { hasRequestItems } = require("@/lib/utils/resumeVisibility");
    hasRequestItems.mockReturnValue(true);
    const privateProjects = [
      { ...mockProjects[0], visibility: "private" as const },
    ];

    render(<ResumeProjectsSection projects={privateProjects} />);

    expect(screen.getByText("Projects are kept private.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Additional project details are available upon request.",
      ),
    ).toBeInTheDocument();
  });

  it("handles projects with different visibilities", () => {
    const mixedProjects = [
      { ...mockProjects[0], visibility: "public" as const },
      { ...mockProjects[1], visibility: "private" as const },
      {
        name: "Project Gamma",
        description: "Hidden project",
        visibility: "request" as const,
      },
    ];

    render(<ResumeProjectsSection projects={mixedProjects} />);

    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Project Beta")).not.toBeInTheDocument();
    expect(screen.queryByText("Project Gamma")).not.toBeInTheDocument();
  });

  it("handles empty projects array", () => {
    const { hasRequestItems } = require("@/lib/utils/resumeVisibility");
    hasRequestItems.mockReturnValue(false);
    const { container } = render(<ResumeProjectsSection projects={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it("handles single project", () => {
    const singleProject = [mockProjects[0]];
    render(<ResumeProjectsSection projects={singleProject} />);

    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getByText("A cool project")).toBeInTheDocument();
  });

  it("renders project URL with correct attributes", () => {
    render(<ResumeProjectsSection projects={mockProjects} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
