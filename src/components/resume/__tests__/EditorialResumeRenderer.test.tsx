import React from "react";
import { render, screen } from "@testing-library/react";
import { EditorialResumeRenderer } from "../EditorialResumeRenderer";
import { ResumeProfile, ResumeTemplate } from "@/types";
import {
  normalizeSkills,
  normalizeTimelineItems,
  normalizeProjects,
} from "../templateRendererUtils";

// Mock the utilities
jest.mock("../templateRendererUtils", () => ({
  normalizeSkills: jest.fn(),
  normalizeTimelineItems: jest.fn(),
  normalizeProjects: jest.fn(),
}));

describe("EditorialResumeRenderer", () => {
  const mockTemplate: ResumeTemplate = {
    id: "editorial",
    name: "Editorial",
    description: "Magazine Style",
    thumbnail: "/thumb.png",
    category: "premium",
    config: {
      colors: {
        primary: "#000",
        secondary: "#fff",
        accent: "#f00",
        background: "#fafaf8",
        text: "#1a1a1a",
      },
      fontFamily: "serif",
      spacing: "medium",
    },
  };

  const mockData: ResumeProfile = {
    title: "Chief Editor",
    summary:
      "A passionate storyteller with a decade of experience in digital media.",
    personalInfo: {
      name: "Jane Smith",
      title: "Senior Content Strategist",
      email: "jane@example.com",
      location: "New York, NY",
      linkedin: "linkedin.com/in/janesmith",
    },
    skills: ["Editing", "SEO", "Copywriting"],
    experience: [
      {
        role: "Lead Strategist",
        company: "Media Group",
        period: "2018 - Present",
        description: "Led a team of writers. Increased traffic by 40%.",
      },
    ],
    projects: [
      {
        title: "Project Alpha",
        description: "A major content overhaul.",
        technologies: ["WordPress", "Analytics"],
      },
    ],
    education: [
      {
        degree: "BA Journalism",
        school: "NYU",
        period: "2010 - 2014",
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (normalizeSkills as jest.Mock).mockReturnValue([
      "Editing",
      "SEO",
      "Copywriting",
    ]);
    (normalizeTimelineItems as jest.Mock).mockImplementation(
      (items) =>
        items?.map((item: any) => ({
          headline: item.role || item.degree,
          subline: item.company || item.school,
          meta: item.period,
          description: item.description,
        })) || [],
    );
    (normalizeProjects as jest.Mock).mockReturnValue([
      {
        headline: "Project Alpha",
        description: "A major content overhaul.",
        technologies: ["WordPress", "Analytics"],
      },
    ]);
  });

  it("renders personal info correctly with drop cap", () => {
    render(<EditorialResumeRenderer template={mockTemplate} data={mockData} />);

    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Senior Content Strategist")).toBeInTheDocument();
    expect(screen.getAllByText("New York, NY")[0]).toBeInTheDocument();

    // Drop cap: A is first letter, rest is "... passionate storyteller..."
    expect(screen.getByText("A")).toHaveClass("float-left");
    expect(screen.getByText(/passionate storyteller/)).toBeInTheDocument();
  });

  it("renders experience with a pull quote", () => {
    render(<EditorialResumeRenderer template={mockTemplate} data={mockData} />);

    expect(screen.getByText("Career Highlights")).toBeInTheDocument();
    expect(screen.getByText("Lead Strategist")).toBeInTheDocument();

    // Pull quote from first sentence of description: "Led a team of writers"
    // It appears twice: once in the quote and once in the description
    expect(screen.getAllByText(/Led a team of writers/)[0]).toBeInTheDocument();
  });

  it("renders projects as feature articles", () => {
    render(<EditorialResumeRenderer template={mockTemplate} data={mockData} />);

    expect(screen.getByText("Featured Work")).toBeInTheDocument();
    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getByText("A major content overhaul.")).toBeInTheDocument();
    expect(screen.getByText("WordPress")).toBeInTheDocument();
  });

  it("renders skills in the sidebar index", () => {
    render(<EditorialResumeRenderer template={mockTemplate} data={mockData} />);

    expect(screen.getByText("Expertise Index")).toBeInTheDocument();
    expect(screen.getByText("Editing")).toBeInTheDocument();
    expect(screen.getByText("SEO")).toBeInTheDocument();
  });

  it("renders education correctly", () => {
    render(<EditorialResumeRenderer template={mockTemplate} data={mockData} />);

    expect(screen.getAllByText("Education").length).toBeGreaterThan(0);
    expect(screen.getByText("BA Journalism")).toBeInTheDocument();
    expect(screen.getByText("NYU")).toBeInTheDocument();
    expect(screen.getByText("2010 - 2014")).toBeInTheDocument();
  });

  it("handles empty data and fallbacks", () => {
    (normalizeSkills as jest.Mock).mockReturnValue([]);
    (normalizeTimelineItems as jest.Mock).mockReturnValue([]);
    (normalizeProjects as jest.Mock).mockReturnValue([]);

    const emptyData: ResumeProfile = {
      title: "",
      summary: "",
      personalInfo: {},
      skills: [],
      experience: [],
      projects: [],
      education: [],
    };

    render(
      <EditorialResumeRenderer template={mockTemplate} data={emptyData} />,
    );

    expect(screen.getByText("Your Name")).toBeInTheDocument();
    expect(screen.getByText("Professional Title")).toBeInTheDocument();
    // Career Highlights should not be present if experience is empty
    expect(screen.queryByText("Career Highlights")).not.toBeInTheDocument();
  });

  it("renders contact info for mobile", () => {
    // We can't easily test visibility but we can check if it's there
    const mobileData = {
      ...mockData,
      personalInfo: {
        ...mockData.personalInfo,
        phone: "123-456-7890",
      },
    };
    render(
      <EditorialResumeRenderer template={mockTemplate} data={mobileData} />,
    );

    // There are two headers for "Contact" in the code, but one is in the aside
    // which is hidden on md+ screens.
    expect(screen.getByText("123-456-7890")).toBeInTheDocument();
  });

  it("handles empty data and name fallbacks", () => {
    const emptyData = {
      title: "My Portfolio",
      personalInfo: {},
      experience: [
        { headline: "Job 1", description: ". Leading team." }, // First sentence is empty
      ],
      education: [],
      skills: [],
      projects: [],
      summary: "",
    };
    (normalizeTimelineItems as jest.Mock).mockReturnValue([
      { headline: "Job 1", description: ". Leading team.", meta: "" },
    ]);

    render(
      <EditorialResumeRenderer
        template={mockTemplate}
        data={emptyData as any}
      />,
    );

    // Line 29 fallback to data.title
    expect(screen.getByText("My Portfolio")).toBeInTheDocument();

    // Line 124 fallback (Driving innovation forward) when first sentence split is empty
    expect(screen.getByText(/Driving innovation forward/)).toBeInTheDocument();
  });

  it("handles no name and no title fallback", () => {
    const noNameNoTitle = {
      title: "",
      experience: [],
      education: [],
      skills: [],
      projects: [],
      summary: "Short",
    };
    (normalizeTimelineItems as jest.Mock).mockReturnValue([
      { headline: "", subline: "", meta: "" }, // Line 130, 133
    ]);
    render(
      <EditorialResumeRenderer
        template={mockTemplate}
        data={noNameNoTitle as any}
      />,
    );
    expect(screen.getByText("Your Name")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Present")).toBeInTheDocument();
  });

  it("renders with all props for coverage", () => {
    render(
      <EditorialResumeRenderer
        template={mockTemplate}
        data={mockData}
        isAuthenticated={true}
        onRequestAccess={() => {}}
      />,
    );
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });
});
