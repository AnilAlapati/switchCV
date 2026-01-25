import React from "react";
import { render, screen } from "@testing-library/react";
import { BentoResumeRenderer } from "@/components/resume/BentoResumeRenderer";

// Mock template renderer utils
jest.mock("@/components/resume/templateRendererUtils", () => ({
  normalizeSkills: jest.fn((val) => val || []),
  normalizeTimelineItems: jest.fn((val) => val || []),
  normalizeProjects: jest.fn((val) => val || []),
}));

describe("BentoResumeRenderer", () => {
  const mockData = {
    title: "Portfolio",
    summary: "Professional summary ".repeat(10), // Long summary
    personalInfo: {
      name: "Bob Jones",
      title: "Product Designer",
      email: "bob@example.com",
      location: "Austin, TX",
      github: "https://github.com/bobjones",
    },
    experience: Array(7).fill({
      headline: "Job",
      meta: "2020",
      description: "Desc",
      subline: "Co • TX",
    }),
    education: [{ headline: "BFA", subline: "RISD" }],
    skills: Array(10).fill("Skill"),
    projects: [
      { headline: "Proj 1", description: "Desc 1", technologies: ["A", "B"] },
      { headline: "Proj 2", description: "Desc 2" },
      { headline: "Proj 3", description: "Desc 3" }, // Should be sliced
    ],
  };

  const mockTemplate = { id: "bento-v1", name: "Bento", sections: [] };

  beforeEach(() => {
    jest.clearAllMocks();
    const utils = require("@/components/resume/templateRendererUtils");
    utils.normalizeSkills.mockImplementation((val: any) => val || []);
    utils.normalizeTimelineItems.mockImplementation((val: any) => val || []);
    utils.normalizeProjects.mockImplementation((val: any) => val || []);
  });

  it("renders hero info and slices long summary", () => {
    render(
      <BentoResumeRenderer
        template={mockTemplate as any}
        data={mockData as any}
      />,
    );
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.getByText(/Professional summary/)).toBeInTheDocument();
    // Check for ellipsis in long summary
    const summaryText = screen.getByText(/Professional summary/);
    expect(summaryText.textContent).toContain("...");
  });

  it("slices skills and shows more count", () => {
    render(
      <BentoResumeRenderer
        template={mockTemplate as any}
        data={mockData as any}
      />,
    );
    expect(screen.getAllByText("Skill")).toHaveLength(8);
    expect(screen.getByText("+2 more")).toBeInTheDocument();
  });

  it("renders contact info and GitHub link", () => {
    render(
      <BentoResumeRenderer
        template={mockTemplate as any}
        data={mockData as any}
      />,
    );
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    expect(screen.getByText("Austin, TX")).toBeInTheDocument();
    expect(screen.getByText("GitHub").closest("a")).toHaveAttribute(
      "href",
      "https://github.com/bobjones",
    );
  });

  it("renders LinkedIn if GitHub is missing", () => {
    const dataNoGithub = {
      ...mockData,
      personalInfo: { ...mockData.personalInfo, github: "" },
    };
    render(
      <BentoResumeRenderer
        template={mockTemplate as any}
        data={dataNoGithub as any}
      />,
    );
    expect(screen.getByText("LinkedIn")).toBeInTheDocument();
    expect(screen.queryByText("GitHub")).not.toBeInTheDocument();
  });

  it("renders experience grid (sliced to 6)", () => {
    render(
      <BentoResumeRenderer
        template={mockTemplate as any}
        data={mockData as any}
      />,
    );
    expect(screen.getAllByText("Job")).toHaveLength(6);
    expect(screen.getByText("7+")).toBeInTheDocument(); // yearsExp calculation
  });

  it("renders projects (sliced to 2)", () => {
    render(
      <BentoResumeRenderer
        template={mockTemplate as any}
        data={mockData as any}
      />,
    );
    expect(screen.getByText("Proj 1")).toBeInTheDocument();
    expect(screen.getByText("Proj 2")).toBeInTheDocument();
    expect(screen.queryByText("Proj 3")).not.toBeInTheDocument();
  });

  it("renders education", () => {
    render(
      <BentoResumeRenderer
        template={mockTemplate as any}
        data={mockData as any}
      />,
    );
    expect(screen.getByText("BFA")).toBeInTheDocument();
    expect(screen.getByText("RISD")).toBeInTheDocument();
  });

  it("renders PDF and Share buttons", () => {
    render(
      <BentoResumeRenderer
        template={mockTemplate as any}
        data={mockData as any}
      />,
    );
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByText("Share")).toBeInTheDocument();
  });

  it("handles empty data and fallbacks gracefully", () => {
    const emptyData = {
      title: "My Portfolio",
      personalInfo: {}, // Missing name
      experience: [{ headline: "H", subline: "S", description: "D" }], // Missing meta
      education: [],
      skills: [],
      projects: [],
      summary: "Short summary",
    };
    render(
      <BentoResumeRenderer
        template={mockTemplate as any}
        data={emptyData as any}
      />,
    );
    // Line 29: fallback to data.title if personalInfo.name is missing
    expect(screen.getByText("My Portfolio")).toBeInTheDocument();

    // Line 267: fallback to "Present" if exp.meta is missing
    expect(screen.getByText("Present")).toBeInTheDocument();

    // Line 95: short summary no truncation
    expect(screen.getByText("Short summary")).toBeInTheDocument();
  });

  it("handles no name and no title fallback", () => {
    const noNameNoTitle = {
      title: "",
      personalInfo: { name: "" },
      experience: [],
      education: [],
      skills: [],
      projects: [],
      summary: "Short",
    };
    render(
      <BentoResumeRenderer
        template={mockTemplate as any}
        data={noNameNoTitle as any}
      />,
    );
    // Line 29: fallback to "Your Name"
    expect(screen.getByText("Your Name")).toBeInTheDocument();
  });

  it("handles missing personalInfo", () => {
    const missingPI = {
      title: "Title Only",
      experience: [],
      education: [],
      skills: [],
      projects: [],
      summary: "Short",
    };
    render(
      <BentoResumeRenderer
        template={mockTemplate as any}
        data={missingPI as any}
      />,
    );
    expect(screen.getByText("Title Only")).toBeInTheDocument();
  });
});
