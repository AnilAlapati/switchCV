import React from "react";
import { render, screen } from "../__support__/testUtils";
import { PreviewEducation } from "@/components/resume/PreviewEducation";

// Mock the VisibilityBadge component
jest.mock("@/components/VisibilityControls", () => ({
  VisibilityBadge: ({ value }: { value: string }) => (
    <span data-testid={`visibility-badge-${value}`}>{value}</span>
  ),
}));

describe("PreviewEducation", () => {
  const mockEducation = [
    {
      id: "edu-1",
      degree: "Bachelor of Science in Computer Science",
      institution: "State University",
      startDate: "2015",
      endDate: "2019",
      description: "Focused on software engineering and algorithms.",
      visibility: "public" as const,
    },
    {
      id: "edu-2",
      degree: "Master of Science in Artificial Intelligence",
      institution: "Tech Institute",
      startDate: "2020",
      endDate: "Present",
      description: "Researching machine learning on edge devices.",
      visibility: "masked" as const,
    },
  ];

  it("returns null when no education is provided", () => {
    const { container } = render(
      <PreviewEducation profile={{ education: [] }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when education is undefined", () => {
    const { container } = render(<PreviewEducation profile={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders education list correctly", () => {
    render(<PreviewEducation profile={{ education: mockEducation }} />);

    expect(
      screen.getByText("Bachelor of Science in Computer Science"),
    ).toBeInTheDocument();
    expect(screen.getByText("State University")).toBeInTheDocument();
    expect(screen.getByText("2015 - 2019")).toBeInTheDocument();
    expect(
      screen.getByText("Focused on software engineering and algorithms."),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Master of Science in Artificial Intelligence"),
    ).toBeInTheDocument();
    expect(screen.getByText("Tech Institute")).toBeInTheDocument();
    expect(screen.getByText("2020 - Present")).toBeInTheDocument();
    expect(
      screen.getByText("Researching machine learning on edge devices."),
    ).toBeInTheDocument();
  });

  it("renders education without IDs using index as key", () => {
    const educationWithoutIds = mockEducation.map(({ id, ...rest }) => rest);
    render(
      <PreviewEducation profile={{ education: educationWithoutIds as any }} />,
    );

    expect(
      screen.getByText("Bachelor of Science in Computer Science"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Master of Science in Artificial Intelligence"),
    ).toBeInTheDocument();
  });

  it("renders correctly without endDate", () => {
    const eduNoEndDate = [
      {
        ...mockEducation[0],
        endDate: undefined,
      },
    ];
    render(<PreviewEducation profile={{ education: eduNoEndDate }} />);

    expect(screen.getByText("2015")).toBeInTheDocument();
    expect(screen.queryByText("-")).not.toBeInTheDocument();
  });

  it("renders correctly without startDate", () => {
    const eduNoStartDate = [
      {
        ...mockEducation[0],
        startDate: undefined,
      },
    ];
    render(<PreviewEducation profile={{ education: eduNoStartDate }} />);

    expect(screen.queryByText("2015")).not.toBeInTheDocument();
  });

  it("renders correctly without description", () => {
    const eduNoDesc = [
      {
        ...mockEducation[0],
        description: undefined,
      },
    ];
    render(<PreviewEducation profile={{ education: eduNoDesc }} />);

    expect(
      screen.queryByText("Focused on software engineering and algorithms."),
    ).not.toBeInTheDocument();
  });

  it("shows correct visibility badges", () => {
    render(<PreviewEducation profile={{ education: mockEducation }} />);

    expect(screen.getByTestId("visibility-badge-public")).toBeInTheDocument();
    expect(screen.getByTestId("visibility-badge-masked")).toBeInTheDocument();
  });

  it("renders the section heading with icon", () => {
    render(<PreviewEducation profile={{ education: mockEducation }} />);
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveTextContent("🎓 Education");
  });
});
