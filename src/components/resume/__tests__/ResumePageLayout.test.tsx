import React from "react";
import { render, screen } from "@testing-library/react";
import { ResumePageLayout } from "../ResumePageLayout";
import { useRouter } from "next/navigation";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock sub-components
jest.mock("../ResumeContactSection", () => ({
  ResumeContactSection: () => <div data-testid="contact-section" />,
}));
jest.mock("../ResumeExperienceSection", () => ({
  ResumeExperienceSection: () => <div data-testid="experience-section" />,
}));
jest.mock("../ResumeEducationSection", () => ({
  ResumeEducationSection: () => <div data-testid="education-section" />,
}));
jest.mock("../ResumeSkillsSection", () => ({
  ResumeSkillsSection: () => <div data-testid="skills-section" />,
}));
jest.mock("../ResumeProjectsSection", () => ({
  ResumeProjectsSection: () => <div data-testid="projects-section" />,
}));

describe("ResumePageLayout", () => {
  const mockResume = {
    title: "Project Manager",
    lastUpdatedAt: new Date("2023-01-01").toISOString(),
    personalInfo: { name: "Test User" },
  };

  const mockEnhancedContent = {
    enhancedSummary: "Enhanced summary",
    enhancedExperience: [{ enhancedDescription: "Enhanced desc" }],
    skillSuggestions: ["Agile", "Scrum"],
  };

  const mockPush = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it("renders the page with title and sections", () => {
    render(
      <ResumePageLayout
        resume={mockResume as any}
        enhancedContent={mockEnhancedContent as any}
        requestOnlyFields={false}
      />,
    );

    expect(screen.getByText("Project Manager")).toBeInTheDocument();
    expect(screen.getByTestId("contact-section")).toBeInTheDocument();
    expect(screen.getByTestId("experience-section")).toBeInTheDocument();
  });

  it("handles missing title", () => {
    render(
      <ResumePageLayout
        resume={{ ...mockResume, title: undefined } as any}
        enhancedContent={mockEnhancedContent as any}
        requestOnlyFields={false}
      />,
    );
    expect(screen.getByText("Professional Resume")).toBeInTheDocument();
  });

  it("shows request access locked icon when requestOnlyFields is true", () => {
    render(
      <ResumePageLayout
        resume={mockResume as any}
        enhancedContent={mockEnhancedContent as any}
        requestOnlyFields={true}
      />,
    );
    expect(
      screen.getByText(/Some information available upon request/),
    ).toBeInTheDocument();
  });

  it("navigates back when back button is clicked", () => {
    render(
      <ResumePageLayout
        resume={mockResume as any}
        enhancedContent={mockEnhancedContent as any}
        requestOnlyFields={false}
      />,
    );
    const backButton = screen.getByText("← Back");
    backButton.click();
    expect(mockPush).toHaveBeenCalledWith("/");
  });
});
