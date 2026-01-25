import React from "react";
import { render, screen } from "@testing-library/react";
import { ResumeProjectsSection } from "../ResumeProjectsSection";
import * as visibilityUtils from "@/lib/utils/resumeVisibility";

jest.mock("@/lib/utils/resumeVisibility", () => ({
  hasRequestItems: jest.fn(),
}));

describe("ResumeProjectsSection", () => {
  const mockProjects = [
    {
      id: "1",
      name: "Project Alpha",
      description: "Awesome project",
      url: "https://example.com",
      visibility: "public",
    },
    {
      name: "NoID Project",
      description: "NoID desc",
      visibility: "public",
    },
  ];

  it("renders public projects with URL", () => {
    (visibilityUtils.hasRequestItems as jest.Mock).mockReturnValue(false);
    render(<ResumeProjectsSection projects={mockProjects as any} />);
    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getByText("Awesome project")).toBeInTheDocument();
    expect(screen.getByText("Visit →")).toHaveAttribute(
      "href",
      "https://example.com",
    );
  });

  it("shows request access message", () => {
    (visibilityUtils.hasRequestItems as jest.Mock).mockReturnValue(true);
    render(<ResumeProjectsSection projects={[]} />);
    expect(
      screen.getByText(/Additional project details are available upon request/),
    ).toBeInTheDocument();
  });

  it("returns null if no public or request projects", () => {
    (visibilityUtils.hasRequestItems as jest.Mock).mockReturnValue(false);
    const { container } = render(<ResumeProjectsSection projects={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
