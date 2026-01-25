import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { TerminalResumeRenderer } from "../TerminalResumeRenderer";
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

describe("TerminalResumeRenderer", () => {
  const mockTemplate: ResumeTemplate = {
    id: "terminal",
    name: "Terminal",
    description: "CLI Theme",
    thumbnail: "/thumb.png",
    category: "premium",
    config: {
      colors: {
        primary: "#000",
        secondary: "#fff",
        accent: "#0f0",
        background: "#111",
        text: "#eee",
      },
      fontFamily: "monospace",
      spacing: "medium",
    },
  };

  const mockData: ResumeProfile = {
    title: "Full Stack Developer",
    summary: "Experienced developer with a passion for CLI tools.",
    personalInfo: {
      name: "John Doe",
      title: "Senior Engineer",
      email: "john@example.com",
      location: "San Francisco",
      github: "github.com/johndoe",
      linkedin: "linkedin.com/in/johndoe",
    },
    skills: ["React", "TypeScript", "Node.js"],
    experience: [],
    projects: [],
    education: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (normalizeSkills as jest.Mock).mockReturnValue([
      "React",
      "TypeScript",
      "Node.js",
    ]);
    (normalizeTimelineItems as jest.Mock).mockImplementation(
      (items) =>
        items?.map((item: any) => ({
          headline: item.role || item.degree,
          subline: `${item.company || item.school} • ${item.period}`,
          description: item.description,
        })) || [],
    );
    (normalizeProjects as jest.Mock).mockReturnValue([
      {
        headline: "Project Alpha",
        description: "A cool project",
        url: "https://alpha.com",
        technologies: ["Next.js", "Tailwind"],
      },
    ]);
  });

  it("renders personal info correctly in the About section (README.md)", () => {
    render(<TerminalResumeRenderer template={mockTemplate} data={mockData} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("> Senior Engineer")).toBeInTheDocument();
    expect(
      screen.getByText("Experienced developer with a passion for CLI tools."),
    ).toBeInTheDocument();

    // Check contact data in the "code block"
    expect(screen.getByText(/"john@example.com"/)).toBeInTheDocument();
    expect(screen.getByText(/"San Francisco"/)).toBeInTheDocument();
    expect(screen.getByText(/"github.com\/johndoe"/)).toBeInTheDocument();
  });

  it("switches to Experience section when clicked", () => {
    const experienceData = [
      {
        role: "Lead Dev",
        company: "Tech Corp",
        period: "2020 - 2023",
        description: "Building amazing things.",
      },
    ];
    (normalizeTimelineItems as jest.Mock).mockReturnValue([
      {
        headline: "Lead Dev",
        subline: "Tech Corp • 2020 - 2023",
        description: "Building amazing things.",
      },
    ]);

    render(
      <TerminalResumeRenderer
        template={mockTemplate}
        data={{ ...mockData, experience: experienceData }}
      />,
    );

    // Click experience.json in explorer
    fireEvent.click(screen.getByText("experience.json"));

    expect(screen.getByText("// experience.json")).toBeInTheDocument();
    expect(screen.getByText(/"Lead Dev"/)).toBeInTheDocument();
    expect(screen.getByText(/"Tech Corp"/)).toBeInTheDocument();
    expect(screen.getByText(/"2020 - 2023"/)).toBeInTheDocument();
  });

  it("renders skills in package.json format", () => {
    render(<TerminalResumeRenderer template={mockTemplate} data={mockData} />);

    // Click package.json
    fireEvent.click(screen.getByText("package.json"));

    expect(
      screen.getByText("// package.json - dependencies"),
    ).toBeInTheDocument();
    expect(screen.getByText(/@john-doe\/skills/)).toBeInTheDocument();
    expect(screen.getByText(/"react"/)).toBeInTheDocument();
    expect(screen.getByText(/"typescript"/)).toBeInTheDocument();
  });

  it("renders projects section correctly", () => {
    render(<TerminalResumeRenderer template={mockTemplate} data={mockData} />);

    // Click projects/
    fireEvent.click(screen.getByText("projects/"));

    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getByText("A cool project")).toBeInTheDocument();
    expect(screen.getByText("Next.js")).toBeInTheDocument();
    expect(
      screen.getByAttribute("href", "https://alpha.com"),
    ).toBeInTheDocument();
  });

  it("renders education in education.md", () => {
    (normalizeTimelineItems as jest.Mock).mockReturnValue([
      {
        headline: "CS Degree",
        subline: "University of Tech • 2016 - 2020",
        description: "First class honors.",
      },
    ]);

    render(<TerminalResumeRenderer template={mockTemplate} data={mockData} />);

    // Click education.md
    fireEvent.click(screen.getByText("education.md"));

    expect(screen.getByText("Education")).toBeInTheDocument();
    expect(screen.getByText("CS Degree")).toBeInTheDocument();
    expect(
      screen.getByText("University of Tech • 2016 - 2020"),
    ).toBeInTheDocument();
    expect(screen.getByText("First class honors.")).toBeInTheDocument();
  });

  it("handles empty data gracefully", () => {
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

    render(<TerminalResumeRenderer template={mockTemplate} data={emptyData} />);

    expect(screen.getAllByText("developer")[0]).toBeInTheDocument(); // Fallback for heroName
    expect(screen.getByText("> Software Engineer")).toBeInTheDocument(); // Fallback for heroTitle
    expect(screen.getByText("No summary available.")).toBeInTheDocument();

    // Check empty sections
    fireEvent.click(screen.getByText("projects/"));
    expect(screen.getByText(/No projects found/)).toBeInTheDocument();
  });

  it("handles typing effect animation state", () => {
    jest.useFakeTimers();
    render(<TerminalResumeRenderer template={mockTemplate} data={mockData} />);

    // Initially typing cursor should be there
    // The cursor is an inline-block div with animate-pulse
    // It's rendered when isTyping is true
    // We can't easily check 'isTyping' but we can check the element
    const cursor = document.querySelector(".animate-pulse");
    expect(cursor).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    const cursorAfter = document.querySelector(".animate-pulse");
    expect(cursorAfter).not.toBeInTheDocument();

    jest.useRealTimers();
  });

  it("navigates to dashboard using the dashboard link", () => {
    render(<TerminalResumeRenderer template={mockTemplate} data={mockData} />);

    const dashboardLink = screen.getByText("Dashboard").closest("a");
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");
  });

  it("handles no name and no title fallback", () => {
    const dataEmpty = {
      title: "",
      experience: [],
      skills: [],
      projects: [],
      education: [],
    };
    render(
      <TerminalResumeRenderer
        template={mockTemplate}
        data={dataEmpty as any}
      />,
    );
    expect(screen.getAllByText(/developer/i).length).toBeGreaterThan(0);
  });

  it("covers missing subline and description in experience", () => {
    const missingData = {
      ...mockData,
      experience: [
        { headline: "H1", subline: "", description: "" },
        { headline: "H2", subline: "", description: "" },
      ],
    };
    (normalizeTimelineItems as jest.Mock).mockReturnValue([
      { headline: "H1", subline: "", description: "", meta: "" },
      { headline: "H2", subline: "", description: "", meta: "" },
    ]);
    render(
      <TerminalResumeRenderer
        template={mockTemplate}
        data={missingData as any}
      />,
    );
    // Switch to experience
    fireEvent.click(screen.getByText("experience.json"));
    expect(screen.getAllByText(/Present/i).length).toBeGreaterThan(0);
    // Line 301 check for comma
    expect(screen.getAllByText(/,/i).length).toBeGreaterThan(0);
  });
});

// Helper to find element with specific attribute since RTL doesn't have getByAttribute
const screenWithAttribute = {
  getByAttribute: (attr: string, value: string) => {
    const el = document.querySelector(`[${attr}="${value}"]`);
    if (!el) throw new Error(`Could not find element with ${attr}="${value}"`);
    return el;
  },
};
// Patching it for convenience in test
(screen as any).getByAttribute = screenWithAttribute.getByAttribute;
