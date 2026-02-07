import React from "react";
import { render, screen } from "../__support__/testUtils";
import { PreviewExperience } from "@/components/resume/PreviewExperience";

// Mock the VisibilityBadge component
jest.mock("@/components/VisibilityControls", () => ({
  VisibilityBadge: ({ value }: { value: string }) => (
    <span data-testid={`visibility-badge-${value}`}>{value}</span>
  ),
}));

describe("PreviewExperience", () => {
  const mockExperience = [
    {
      id: "exp-1",
      role: "Senior Software Engineer",
      company: "Tech Solutions Inc.",
      startDate: "Jan 2020",
      endDate: "Present",
      description:
        "Developing large-scale microservices using Node.js and React.\nLed a team of 5 engineers.",
      visibility: "public" as const,
    },
    {
      id: "exp-2",
      role: "Software Developer Intern",
      company: "Startup Hub",
      startDate: "Jun 2019",
      endDate: "Dec 2019",
      description: "Implemented feature enhancements for the main product.",
      visibility: "masked" as const,
    },
  ];

  it("returns null when no experience is provided", () => {
    const { container } = render(
      <PreviewExperience profile={{ experience: [] }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when experience is undefined", () => {
    const { container } = render(<PreviewExperience profile={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders experience list correctly", () => {
    render(<PreviewExperience profile={{ experience: mockExperience }} />);

    expect(screen.getByText("Senior Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("Tech Solutions Inc.")).toBeInTheDocument();
    expect(screen.getByText("Jan 2020 - Present")).toBeInTheDocument();
    expect(
      screen.getByText(/Developing large-scale microservices/),
    ).toBeInTheDocument();

    expect(screen.getByText("Software Developer Intern")).toBeInTheDocument();
    expect(screen.getByText("Startup Hub")).toBeInTheDocument();
    expect(screen.getByText("Jun 2019 - Dec 2019")).toBeInTheDocument();
  });

  it("renders experience without IDs using index as key", () => {
    const experienceWithoutIds = mockExperience.map(({ id, ...rest }) => rest);
    render(
      <PreviewExperience
        profile={{ experience: experienceWithoutIds as any }}
      />,
    );

    expect(screen.getByText("Senior Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("Software Developer Intern")).toBeInTheDocument();
  });

  it("renders correctly without endDate", () => {
    const expNoEndDate = [
      {
        ...mockExperience[0],
        endDate: undefined,
      },
    ];
    render(<PreviewExperience profile={{ experience: expNoEndDate }} />);

    expect(screen.getByText("Jan 2020")).toBeInTheDocument();
    expect(screen.queryByText("-")).not.toBeInTheDocument();
  });

  it("renders correctly without description", () => {
    const expNoDesc = [
      {
        ...mockExperience[0],
        description: undefined,
      },
    ];
    render(<PreviewExperience profile={{ experience: expNoDesc as any }} />);

    expect(
      screen.queryByText(/Developing large-scale microservices/),
    ).not.toBeInTheDocument();
  });

  it("shows correct visibility badges", () => {
    render(<PreviewExperience profile={{ experience: mockExperience }} />);

    expect(screen.getByTestId("visibility-badge-public")).toBeInTheDocument();
    expect(screen.getByTestId("visibility-badge-masked")).toBeInTheDocument();
  });

  it("renders descriptions with whitespace-pre-wrap style", () => {
    render(<PreviewExperience profile={{ experience: [mockExperience[0]] }} />);
    const description = screen.getByText(
      /Developing large-scale microservices/,
    );
    expect(description).toHaveClass("whitespace-pre-wrap");
  });

  it("renders the section heading with icon", () => {
    render(<PreviewExperience profile={{ experience: mockExperience }} />);
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveTextContent("💼 Work Experience");
  });
});
