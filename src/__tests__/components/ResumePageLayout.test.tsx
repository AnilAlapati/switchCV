import React from "react";
import { render, screen, fireEvent } from "../__support__/testUtils";
import { ResumePageLayout } from "@/components/resume/ResumePageLayout";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("@/components/resume/ResumeContactSection", () => ({
  ResumeContactSection: () => <div data-testid="contact">Contact</div>,
}));

jest.mock("@/components/resume/ResumeExperienceSection", () => ({
  ResumeExperienceSection: () => <div data-testid="experience">Experience</div>,
}));

jest.mock("@/components/resume/ResumeEducationSection", () => ({
  ResumeEducationSection: () => <div data-testid="education">Education</div>,
}));

jest.mock("@/components/resume/ResumeSkillsSection", () => ({
  ResumeSkillsSection: () => <div data-testid="skills">Skills</div>,
}));

jest.mock("@/components/resume/ResumeProjectsSection", () => ({
  ResumeProjectsSection: () => <div data-testid="projects">Projects</div>,
}));

describe("ResumePageLayout", () => {
  const mockResume = {
    title: "Senior Developer",
    lastUpdatedAt: new Date().toISOString(),
  } as any;

  const mockEnhanced = {
    enhancedSummary: "Optimized summary",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders layout with title", () => {
    render(
      <ResumePageLayout
        resume={mockResume}
        enhancedContent={mockEnhanced as any}
        requestOnlyFields={false}
      />,
    );

    expect(screen.getByText("Senior Developer")).toBeInTheDocument();
  });

  it("displays last updated date", () => {
    const date = new Date("2023-01-01");
    mockResume.lastUpdatedAt = date.toISOString();

    render(
      <ResumePageLayout
        resume={mockResume}
        enhancedContent={mockEnhanced as any}
        requestOnlyFields={false}
      />,
    );

    expect(screen.getByText("January 1, 2023")).toBeInTheDocument();
  });

  it("calls router.push when back button is clicked", () => {
    render(
      <ResumePageLayout
        resume={mockResume}
        enhancedContent={mockEnhanced as any}
        requestOnlyFields={false}
      />,
    );

    const backButton = screen.getByRole("button", { name: /Back/ });
    fireEvent.click(backButton);
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("shows default title when title contains undefined", () => {
    const invalidResume = { title: "undefined Resume" } as any;

    render(
      <ResumePageLayout
        resume={invalidResume}
        enhancedContent={mockEnhanced as any}
        requestOnlyFields={false}
      />,
    );

    expect(screen.getByText("Professional Resume")).toBeInTheDocument();
  });

  it("shows default title when title is empty", () => {
    const invalidResume = { title: "" } as any;

    render(
      <ResumePageLayout
        resume={invalidResume}
        enhancedContent={mockEnhanced as any}
        requestOnlyFields={false}
      />,
    );

    expect(screen.getByText("Professional Resume")).toBeInTheDocument();
  });

  it("shows lock badge when requestOnlyFields is true", () => {
    render(
      <ResumePageLayout
        resume={mockResume}
        enhancedContent={mockEnhanced as any}
        requestOnlyFields={true}
      />,
    );

    expect(
      screen.getByText(/Some information available upon request/),
    ).toBeInTheDocument();
  });

  it("renders all resume sections", () => {
    render(
      <ResumePageLayout
        resume={mockResume}
        enhancedContent={mockEnhanced as any}
        requestOnlyFields={false}
      />,
    );

    expect(screen.getByTestId("contact")).toBeInTheDocument();
    expect(screen.getByTestId("experience")).toBeInTheDocument();
    expect(screen.getByTestId("education")).toBeInTheDocument();
    expect(screen.getByTestId("skills")).toBeInTheDocument();
    expect(screen.getByTestId("projects")).toBeInTheDocument();
  });
});
