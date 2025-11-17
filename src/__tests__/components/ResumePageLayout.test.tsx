import React from "react";
import { render, screen } from "../__support__/testUtils";
import { ResumePageLayout } from "@/components/resume/ResumePageLayout";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
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

  it("renders layout with title", () => {
    render(
      <ResumePageLayout
        resume={mockResume}
        enhancedContent={mockEnhanced}
        requestOnlyFields={false}
      />
    );

    expect(screen.getByText("Senior Developer")).toBeInTheDocument();
  });

  it("displays last updated date", () => {
    render(
      <ResumePageLayout
        resume={mockResume}
        enhancedContent={mockEnhanced}
        requestOnlyFields={false}
      />
    );

    expect(screen.getByText(/Last Updated/)).toBeInTheDocument();
  });

  it("renders back button", () => {
    render(
      <ResumePageLayout
        resume={mockResume}
        enhancedContent={mockEnhanced}
        requestOnlyFields={false}
      />
    );

    expect(screen.getByRole("button", { name: /Back/ })).toBeInTheDocument();
  });

  it("shows default title when title contains undefined", () => {
    const invalidResume = { title: "undefined Resume" } as any;

    render(
      <ResumePageLayout
        resume={invalidResume}
        enhancedContent={mockEnhanced}
        requestOnlyFields={false}
      />
    );

    expect(screen.getByText("Professional Resume")).toBeInTheDocument();
  });

  it("renders all resume sections", () => {
    render(
      <ResumePageLayout
        resume={mockResume}
        enhancedContent={mockEnhanced}
        requestOnlyFields={false}
      />
    );

    expect(screen.getByTestId("contact")).toBeInTheDocument();
    expect(screen.getByTestId("experience")).toBeInTheDocument();
    expect(screen.getByTestId("education")).toBeInTheDocument();
    expect(screen.getByTestId("skills")).toBeInTheDocument();
    expect(screen.getByTestId("projects")).toBeInTheDocument();
  });
});
