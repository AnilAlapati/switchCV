import React from "react";
import { render, screen } from "../__support__/testUtils";
import { PreviewSkills } from "@/components/resume/PreviewSkills";

// Mock the VisibilityBadge component
jest.mock("@/components/VisibilityControls", () => ({
  VisibilityBadge: ({ value }: { value: string }) => (
    <span data-testid={`visibility-badge-${value}`}>{value}</span>
  ),
}));

describe("PreviewSkills", () => {
  const mockSkills = [
    {
      id: "skill-1",
      name: "React",
      level: "advanced" as const,
      visibility: "public" as const,
    },
    {
      id: "skill-2",
      name: "Node.js",
      level: "intermediate" as const,
      visibility: "masked" as const,
    },
    {
      id: "skill-3",
      name: "TypeScript",
      level: "beginner" as const,
      visibility: "public" as const,
    },
  ];

  it("returns null when no skills are provided", () => {
    const { container } = render(<PreviewSkills profile={{ skills: [] }} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when skills are undefined", () => {
    const { container } = render(<PreviewSkills profile={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders skills list correctly", () => {
    render(<PreviewSkills profile={{ skills: mockSkills }} />);

    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Node.js")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("shows level if it is not intermediate", () => {
    render(<PreviewSkills profile={{ skills: mockSkills }} />);

    expect(screen.getByText("(advanced)")).toBeInTheDocument();
    expect(screen.getByText("(beginner)")).toBeInTheDocument();
    expect(screen.queryByText("(intermediate)")).not.toBeInTheDocument();
  });

  it("renders skills without IDs using index as key", () => {
    const skillsWithoutIds = mockSkills.map(({ id, ...rest }) => rest);
    render(<PreviewSkills profile={{ skills: skillsWithoutIds as any }} />);

    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Node.js")).toBeInTheDocument();
  });

  it("shows correct visibility badges", () => {
    render(<PreviewSkills profile={{ skills: mockSkills }} />);

    expect(screen.getAllByTestId("visibility-badge-public")).toHaveLength(2);
    expect(screen.getByTestId("visibility-badge-masked")).toBeInTheDocument();
  });

  it("renders the section heading with icon", () => {
    render(<PreviewSkills profile={{ skills: mockSkills }} />);
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveTextContent("🎯 Skills");
  });
});
