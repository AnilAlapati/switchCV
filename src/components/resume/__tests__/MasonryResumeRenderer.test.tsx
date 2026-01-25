import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MasonryResumeRenderer } from "@/components/resume/MasonryResumeRenderer";

// Mock template renderer utils to control data flow
jest.mock("@/components/resume/templateRendererUtils", () => ({
  normalizeSkills: jest.fn((val) => val || []),
  normalizeTimelineItems: jest.fn((val) => val || []),
  normalizeProjects: jest.fn((val) => val || []),
}));

describe("MasonryResumeRenderer", () => {
  const mockData = {
    title: "Portfolio Title",
    summary: "Professional summary text.",
    personalInfo: {
      name: "Alice Smith",
      title: "Full Stack Architect",
      email: "alice@example.com",
      phone: "555-0199",
      location: "New York, NY",
    },
    experience: [{ headline: "Senior Dev" }],
    education: [{ headline: "CS Degree" }],
    skills: ["React", "TypeScript"],
    projects: [
      { headline: "Global Platform", description: "Scaleable system" },
    ],
  };

  const mockTemplate = { id: "masonry-v1", name: "Masonry", sections: [] };

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-mock implementation because of the Mock type issues in TS
    const utils = require("@/components/resume/templateRendererUtils");
    utils.normalizeSkills.mockImplementation((val: any) => val || []);
    utils.normalizeTimelineItems.mockImplementation((val: any) => val || []);
    utils.normalizeProjects.mockImplementation((val: any) => val || []);
  });

  it("renders basic hero information", () => {
    render(
      <MasonryResumeRenderer
        template={mockTemplate as any}
        data={mockData as any}
      />,
    );
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Full Stack Architect")).toBeInTheDocument();
    expect(screen.getByText("New York, NY")).toBeInTheDocument();
    expect(screen.getByText("The Synopsis")).toBeInTheDocument();
    expect(screen.getByText("Professional summary text.")).toBeInTheDocument();
  });

  it("renders experience, skills (including object types), projects, and education", () => {
    const dataWithObjectSkills = {
      ...mockData,
      skills: ["React", { name: "TypeScript" }],
      projects: [{ headline: "Project 1", description: "Desc 1" }], // No URL
    };
    render(
      <MasonryResumeRenderer
        template={mockTemplate as any}
        data={dataWithObjectSkills as any}
      />,
    );
    expect(screen.getByText("Experience")).toBeInTheDocument();
    expect(screen.getByText("Core Stack")).toBeInTheDocument();
    expect(screen.getByText("Education")).toBeInTheDocument();
    expect(screen.getByText("Project 1")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.queryByText("View Project")).not.toBeInTheDocument();
  });

  it("renders location and experience count correctly", () => {
    const data = {
      ...mockData,
      personalInfo: { ...mockData.personalInfo, location: "SF" },
      experience: [{}, {}],
    };
    render(
      <MasonryResumeRenderer
        template={mockTemplate as any}
        data={data as any}
      />,
    );
    expect(screen.getByText("SF")).toBeInTheDocument();
    expect(screen.getByText("2+ Roles")).toBeInTheDocument();
    expect(screen.getByText("•")).toBeInTheDocument(); // Bullet point
  });

  it("handles case with no location but with experience", () => {
    const data = {
      ...mockData,
      personalInfo: { ...mockData.personalInfo, location: "" },
      experience: [{}],
    };
    render(
      <MasonryResumeRenderer
        template={mockTemplate as any}
        data={data as any}
      />,
    );
    expect(screen.getByText("1+ Roles")).toBeInTheDocument();
    expect(screen.queryByText("•")).not.toBeInTheDocument();
  });

  it("handles copy to clipboard for email", () => {
    const writeTextMock = jest.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <MasonryResumeRenderer
        template={mockTemplate as any}
        data={mockData as any}
      />,
    );
    const copyButton = screen.getByTitle("Copy email");
    fireEvent.click(copyButton);
    expect(writeTextMock).toHaveBeenCalledWith("alice@example.com");
  });

  it("handles copy to clipboard for phone", () => {
    const writeTextMock = jest.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <MasonryResumeRenderer
        template={mockTemplate as any}
        data={mockData as any}
      />,
    );
    const copyButton = screen.getByTitle("Copy phone");
    fireEvent.click(copyButton);
    expect(writeTextMock).toHaveBeenCalledWith("555-0199");
  });

  it("uses fallback values when email and phone are missing", () => {
    const emptyData = {
      ...mockData,
      personalInfo: { ...mockData.personalInfo, email: "", phone: "" },
    };
    render(
      <MasonryResumeRenderer
        template={mockTemplate as any}
        data={emptyData as any}
      />,
    );
    expect(screen.getByText("contact@example.com")).toBeInTheDocument();
    expect(screen.getByText("+91 90000 00000")).toBeInTheDocument();
  });

  it("renders with minimal data", () => {
    const minimalData = {
      title: "Minimal",
      personalInfo: { name: "Joe" },
      experience: [],
      skills: [],
      projects: [],
      education: [],
    };
    render(
      <MasonryResumeRenderer
        template={mockTemplate as any}
        data={minimalData as any}
      />,
    );
    expect(screen.getByText("Joe")).toBeInTheDocument();
    expect(screen.queryByText("Experience")).not.toBeInTheDocument();
  });

  it("handles missing project description", () => {
    const projectNoDesc = {
      ...mockData,
      projects: [{ headline: "No Desc Project", url: "http://test.com" }],
    };
    render(
      <MasonryResumeRenderer
        template={mockTemplate as any}
        data={projectNoDesc as any}
      />,
    );
    expect(screen.getByText("No Desc Project")).toBeInTheDocument();
  });

  it("handles no name and no title fallback to Untitled", () => {
    const noNameNoTitle = {
      title: "",
      personalInfo: { name: "", title: "" },
      experience: [],
      education: [],
      skills: [],
      projects: [],
      summary: "Short",
    };
    render(
      <MasonryResumeRenderer
        template={mockTemplate as any}
        data={noNameNoTitle as any}
      />,
    );
    expect(screen.getByText("Untitled")).toBeInTheDocument();
    expect(screen.getByText("Professional")).toBeInTheDocument();
  });

  it("covers fallback clipboard and missing personalInfo", () => {
    const dataWithNothing = {
      title: "",
      experience: [],
      skills: [],
      projects: [],
      education: [],
    };
    render(
      <MasonryResumeRenderer
        template={mockTemplate as any}
        data={dataWithNothing as any}
      />,
    );
    expect(screen.getByText("Untitled")).toBeInTheDocument();

    const copyButtons = screen.getAllByTitle(/Copy/);
    fireEvent.click(copyButtons[0]);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "contact@example.com",
    );
    fireEvent.click(copyButtons[1]);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "+91 90000 00000",
    );
  });

  it("navigates back to dashboard", () => {
    render(
      <MasonryResumeRenderer
        template={mockTemplate as any}
        data={mockData as any}
      />,
    );
    const backLink = screen.getByText("Back to Dashboard").closest("a");
    expect(backLink).toHaveAttribute("href", "/dashboard");
  });
});
