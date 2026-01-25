import React from "react";
import { render, screen } from "@testing-library/react";
import { ResumeSkillsSection } from "../ResumeSkillsSection";
import * as visibilityUtils from "@/lib/utils/resumeVisibility";

jest.mock("@/lib/utils/resumeVisibility", () => ({
  hasRequestItems: jest.fn(),
  hasMaskedItems: jest.fn(),
}));

describe("ResumeSkillsSection", () => {
  const mockSkills = [
    { id: "1", name: "React", level: "Expert", visibility: "public" },
    { name: "NoID", visibility: "public" },
    { id: "2", name: "Private", visibility: "masked" },
  ];

  it("renders public skills", () => {
    (visibilityUtils.hasRequestItems as jest.Mock).mockReturnValue(false);
    (visibilityUtils.hasMaskedItems as jest.Mock).mockReturnValue(false);
    render(<ResumeSkillsSection skills={mockSkills as any} />);
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Expert")).toBeInTheDocument();
    expect(screen.queryByText("Private")).not.toBeInTheDocument();
  });

  it("shows +More when there are masked or request items", () => {
    (visibilityUtils.hasMaskedItems as jest.Mock).mockReturnValue(true);
    render(<ResumeSkillsSection skills={mockSkills as any} />);
    expect(screen.getByText("+More (Protected)")).toBeInTheDocument();
  });

  it("returns null if no public skills", () => {
    const { container } = render(<ResumeSkillsSection skills={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders skill suggestions if provided", () => {
    render(
      <ResumeSkillsSection
        skills={mockSkills as any}
        skillSuggestions={["GraphQL", "Next.js"]}
      />,
    );
    expect(screen.getByText("Suggested Skills")).toBeInTheDocument();
    expect(screen.getByText("GraphQL")).toBeInTheDocument();
    expect(screen.getByText("Next.js")).toBeInTheDocument();
  });
});
