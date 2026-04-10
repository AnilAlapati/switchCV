import { render, screen } from "@testing-library/react";
import { ReviewStep } from "@/components/onboarding/steps/ReviewStep";
import { ResumeProfile } from "@/types";

describe("ReviewStep", () => {
  const mockProfile: Partial<ResumeProfile> = {
    title: "Software Engineer",
    summary: "Experienced developer",
    experience: [
      {
        company: "Acme Corp",
        role: "Engineer",
        startDate: "2020",
        endDate: "Present",
        description: "Stuff",
        visibility: "public",
      },
    ],
    education: [
      {
        institution: "MIT",
        degree: "BS CS",
        startDate: "2016",
        visibility: "public",
      },
    ],
    skills: [
      { name: "React", level: "advanced", visibility: "public" },
      { name: "TypeScript", level: "expert", visibility: "public" },
    ],
    projects: [
      {
        name: "Project A",
        url: "https://example.com",
        description: "Cool",
        visibility: "public",
      },
    ],
  };

  it("renders populated profile correctly", () => {
    render(<ReviewStep profile={mockProfile} />);

    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("Experienced developer")).toBeInTheDocument();
    expect(screen.getAllByText(/Engineer/)).toHaveLength(2);
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
    expect(screen.getByText(/BS CS/)).toBeInTheDocument();
    expect(screen.getByText(/MIT/)).toBeInTheDocument();
    expect(screen.getByText("React, TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Project A")).toBeInTheDocument();
    expect(screen.getByText(/https:\/\/example.com/)).toBeInTheDocument();
  });

  it("renders empty profile correctly", () => {
    render(<ReviewStep profile={{}} />);

    expect(screen.getAllByText("Not provided")).toHaveLength(2);
    expect(screen.getByText("No experience added")).toBeInTheDocument();
    expect(screen.getByText("No education added")).toBeInTheDocument();
    expect(screen.getByText("No skills added")).toBeInTheDocument();
    expect(screen.getByText("No projects added")).toBeInTheDocument();
  });

  it("renders profile with explicit empty arrays correctly", () => {
    render(
      <ReviewStep
        profile={{ experience: [], education: [], skills: [], projects: [] }}
      />,
    );

    expect(screen.getByText("No experience added")).toBeInTheDocument();
    expect(screen.getByText("No education added")).toBeInTheDocument();
    expect(screen.getByText("No skills added")).toBeInTheDocument();
    expect(screen.getByText("No projects added")).toBeInTheDocument();
  });

  it("renders profile with partial data correctly", () => {
    const partialProfile: Partial<ResumeProfile> = {
      experience: [
        {
          company: "A",
          role: "B",
          startDate: "C",
          visibility: "public",
          description: "D",
        },
      ], // No endDate
      projects: [{ name: "P", description: "D", visibility: "public" }], // No URL
    };
    render(<ReviewStep profile={partialProfile} />);

    // Use getAllByText since "A" appears in both experience company and Awards section title
    expect(screen.getByText(/\bB\b/)).toBeInTheDocument();
    expect(screen.getAllByText(/\bA\b/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Present/)).toBeInTheDocument();
    expect(screen.getByText("P")).toBeInTheDocument();
    // Should not have URL dash
    const projectText = screen.getByText("P").parentElement?.textContent;
    expect(projectText).not.toContain(" - ");
  });
});
