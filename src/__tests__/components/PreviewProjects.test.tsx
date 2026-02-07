import React from "react";
import { render, screen } from "../__support__/testUtils";
import { PreviewProjects } from "@/components/resume/PreviewProjects";

// Mock the VisibilityBadge component
jest.mock("@/components/VisibilityControls", () => ({
  VisibilityBadge: ({ value }: { value: string }) => (
    <span data-testid={`visibility-badge-${value}`}>{value}</span>
  ),
}));

describe("PreviewProjects", () => {
  const mockProjects = [
    {
      id: "project-1",
      name: "Portfolio Website",
      url: "https://example.com/portfolio",
      description: "A personal portfolio built with Next.js and Tailwind CSS.",
      visibility: "public" as const,
    },
    {
      id: "project-2",
      name: "E-commerce App",
      url: "https://example.com/shop",
      description: "A full-stack e-commerce application with React and Stripe.",
      visibility: "masked" as const,
    },
  ];

  it("returns null when no projects are provided", () => {
    const { container } = render(
      <PreviewProjects profile={{ projects: [] }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when projects are undefined", () => {
    const { container } = render(<PreviewProjects profile={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders projects list correctly", () => {
    render(<PreviewProjects profile={{ projects: mockProjects }} />);

    expect(screen.getByText("Portfolio Website")).toBeInTheDocument();
    expect(screen.getByText("E-commerce App")).toBeInTheDocument();
    expect(
      screen.getByText("https://example.com/portfolio"),
    ).toBeInTheDocument();
    expect(screen.getByText("https://example.com/shop")).toBeInTheDocument();
    expect(
      screen.getByText(/A personal portfolio built with Next.js/),
    ).toBeInTheDocument();
  });

  it("renders projects without IDs using index as key", () => {
    const projectsWithoutIds = mockProjects.map(({ id, ...rest }) => rest);
    render(
      <PreviewProjects profile={{ projects: projectsWithoutIds as any }} />,
    );

    expect(screen.getByText("Portfolio Website")).toBeInTheDocument();
    expect(screen.getByText("E-commerce App")).toBeInTheDocument();
  });

  it("renders correctly without URL", () => {
    const projectNoUrl = [
      {
        ...mockProjects[0],
        url: undefined,
      },
    ];
    render(<PreviewProjects profile={{ projects: projectNoUrl }} />);

    expect(screen.queryByText("🔗")).not.toBeInTheDocument();
  });

  it("renders correctly without description", () => {
    const projectNoDesc = [
      {
        ...mockProjects[0],
        description: undefined,
      },
    ];
    render(<PreviewProjects profile={{ projects: projectNoDesc as any }} />);

    expect(
      screen.queryByText(/A personal portfolio built with Next.js/),
    ).not.toBeInTheDocument();
  });

  it("shows correct visibility badges", () => {
    render(<PreviewProjects profile={{ projects: mockProjects }} />);

    expect(screen.getByTestId("visibility-badge-public")).toBeInTheDocument();
    expect(screen.getByTestId("visibility-badge-masked")).toBeInTheDocument();
  });

  it("renders the section heading with icon", () => {
    render(<PreviewProjects profile={{ projects: mockProjects }} />);
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveTextContent("🚀 Projects");
  });

  it("renders external link with correct attributes", () => {
    render(<PreviewProjects profile={{ projects: [mockProjects[0]] }} />);
    const link = screen.getByRole("link", {
      name: "https://example.com/portfolio",
    });
    expect(link).toHaveAttribute("href", "https://example.com/portfolio");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
