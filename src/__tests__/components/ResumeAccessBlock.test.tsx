import React from "react";
import { render, screen } from "../__support__/testUtils";
import { ResumeAccessBlock } from "@/components/resume/ResumeAccessBlock";

describe("ResumeAccessBlock", () => {
  const mockConfig = {
    title: "Access Restricted",
    description: "Please log in to view this resume.",
    primaryAction: { label: "Log In", href: "/login" },
    secondaryAction: { label: "Go Home", href: "/" },
  };

  it("renders title and description", () => {
    render(<ResumeAccessBlock config={mockConfig} />);
    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(
      screen.getByText("Please log in to view this resume."),
    ).toBeInTheDocument();
  });

  it("renders primary action link when provided", () => {
    render(<ResumeAccessBlock config={mockConfig} />);
    const link = screen.getByRole("link", { name: "Log In" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/login");
  });

  it("renders secondary action link when provided", () => {
    render(<ResumeAccessBlock config={mockConfig} />);
    const link = screen.getByRole("link", { name: "Go Home" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });

  it("does not render primary action link when not provided", () => {
    const configWithoutPrimary = { ...mockConfig, primaryAction: undefined };
    render(<ResumeAccessBlock config={configWithoutPrimary} />);
    expect(
      screen.queryByRole("link", { name: "Log In" }),
    ).not.toBeInTheDocument();
  });

  it("does not render secondary action link when not provided", () => {
    const configWithoutSecondary = {
      ...mockConfig,
      secondaryAction: undefined,
    };
    render(<ResumeAccessBlock config={configWithoutSecondary} />);
    expect(
      screen.queryByRole("link", { name: "Go Home" }),
    ).not.toBeInTheDocument();
  });
});
