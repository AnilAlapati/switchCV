import React from "react";
import { render, screen } from "@testing-library/react";
import { NoirResumeRenderer } from "../NoirResumeRenderer";
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

describe("NoirResumeRenderer", () => {
  const mockTemplate: ResumeTemplate = {
    id: "noir",
    name: "Noir",
    description: "Dark Luxury",
    thumbnail: "/thumb.png",
    category: "premium",
    config: {
      colors: {
        primary: "#6366f1",
        secondary: "#000",
        accent: "#fff",
        background: "#030303",
        text: "#fff",
      },
      fontFamily: "sans-serif",
      spacing: "medium",
    },
  };

  const mockData: ResumeProfile = {
    title: "Venture Architect",
    summary:
      "Designing the future of digital ecosystems through deep tech integration.",
    personalInfo: {
      name: "Marcus Aurelius",
      title: "Senior Product Strategist",
      email: "marcus@example.com",
      location: "Rome, Italy",
      linkedin: "linkedin.com/in/marcus",
    },
    skills: ["Strategy", "Deep Tech", "Architecture"],
    experience: [
      {
        role: "Head of Strategy",
        company: "Empire Tech",
        period: "2020 - Present",
        description: "Expanded operations across three continents.",
      },
    ],
    projects: [
      {
        title: "Colosseum 2.0",
        description: "Reimagining public spaces.",
        technologies: ["AR", "Unity"],
      },
      {
        title: "Agora",
        description: "Decentralized marketplace.",
        technologies: ["Solidity", "Web3"],
      },
    ],
    education: [
      {
        degree: "Philosophy & Computing",
        school: "Ancient Academy",
        period: "2010 - 2014",
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (normalizeSkills as jest.Mock).mockReturnValue([
      "Strategy",
      "Deep Tech",
      "Architecture",
    ]);
    (normalizeTimelineItems as jest.Mock).mockImplementation(
      (items) =>
        items?.map((item: any) => ({
          headline: item.role || item.degree,
          subline: `${item.company || item.school}`,
          meta: item.period,
          description: item.description,
        })) || [],
    );
    (normalizeProjects as jest.Mock).mockReturnValue([
      {
        headline: "Colosseum 2.0",
        description: "Reimagining public spaces.",
        technologies: ["AR", "Unity"],
      },
      {
        headline: "Agora",
        description: "Decentralized marketplace.",
        technologies: ["Solidity", "Web3"],
      },
    ]);
  });

  it("renders personal info correctly with split name", () => {
    render(<NoirResumeRenderer template={mockTemplate} data={mockData} />);

    // Name is split: "Marcus" and "Aurelius"
    expect(screen.getByText("Marcus")).toBeInTheDocument();
    expect(screen.getByText("Aurelius")).toBeInTheDocument();
    expect(screen.getByText("Senior Product Strategist")).toBeInTheDocument();
    expect(screen.getByText("Rome, Italy")).toBeInTheDocument();
  });

  it("renders summary with quotes", () => {
    render(<NoirResumeRenderer template={mockTemplate} data={mockData} />);
    expect(screen.getByText(/Designing the future/)).toBeInTheDocument();
  });

  it("renders experience cards with index numbers", () => {
    render(<NoirResumeRenderer template={mockTemplate} data={mockData} />);

    expect(screen.getByText("Experience")).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("Head of Strategy")).toBeInTheDocument();
    expect(screen.getByText("Empire Tech")).toBeInTheDocument();
  });

  it("renders skills as pills", () => {
    render(<NoirResumeRenderer template={mockTemplate} data={mockData} />);

    expect(screen.getByText("Expertise")).toBeInTheDocument();
    expect(screen.getByText("Strategy")).toBeInTheDocument();
    expect(screen.getByText("Deep Tech")).toBeInTheDocument();
  });

  it("renders projects in grid with first project spanning two columns", () => {
    const { container } = render(
      <NoirResumeRenderer template={mockTemplate} data={mockData} />,
    );

    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Colosseum 2.0")).toBeInTheDocument();
    expect(screen.getByText("Agora")).toBeInTheDocument();

    // Check if first project has md:col-span-2
    const firstProject = container.querySelectorAll("article")[2]; // 0 is experience, 1 is aside/header? wait.
    // Let's be more specific. experience is an article.
    const projectArticles = container.querySelectorAll(".grid article");
    expect(projectArticles[0]).toHaveClass("md:col-span-2");
  });

  it("renders education correctly", () => {
    render(<NoirResumeRenderer template={mockTemplate} data={mockData} />);

    expect(screen.getAllByText("Education").length).toBeGreaterThan(0);
    expect(screen.getByText("Philosophy & Computing")).toBeInTheDocument();
    expect(screen.getByText("Ancient Academy")).toBeInTheDocument();
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

    render(<NoirResumeRenderer template={mockTemplate} data={emptyData} />);

    expect(screen.getByText("Your")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Professional Title")).toBeInTheDocument();
  });

  it("renders contact links correctly", () => {
    render(<NoirResumeRenderer template={mockTemplate} data={mockData} />);

    expect(screen.getByText("marcus@example.com").closest("a")).toHaveAttribute(
      "href",
      "mailto:marcus@example.com",
    );
    expect(screen.getByText("LinkedIn").closest("a")).toHaveAttribute(
      "href",
      "https://linkedin.com/in/marcus",
    );
  });

  it("covers missing headline and meta in experience", () => {
    const dataEmptyExp = {
      ...mockData,
      experience: [{ headline: "", subline: "Co • Loc", description: "" }],
    };
    (normalizeTimelineItems as jest.Mock).mockReturnValue([
      { headline: "", subline: "Co • Loc", description: "", meta: "" },
    ]);
    render(
      <NoirResumeRenderer template={mockTemplate} data={dataEmptyExp as any} />,
    );
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Present")).toBeInTheDocument();
  });

  it("handles no name and no title fallback", () => {
    const noNameNoTitle = {
      title: "",
      experience: [],
      skills: [],
      projects: [],
      education: [],
    };
    render(
      <NoirResumeRenderer
        template={mockTemplate}
        data={noNameNoTitle as any}
      />,
    );
    expect(screen.getAllByText(/Your|Name/).length).toBeGreaterThan(0);
  });
});
