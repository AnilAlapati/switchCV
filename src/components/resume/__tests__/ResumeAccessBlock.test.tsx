import React from "react";
import { render, screen } from "@testing-library/react";
import { ResumeAccessBlock } from "../ResumeAccessBlock";

describe("ResumeAccessBlock", () => {
  const mockConfig = {
    title: "Access Denied",
    description: "You do not have permission.",
    primaryAction: { label: "Go Home", href: "/" },
    secondaryAction: { label: "Contact Us", href: "/contact" },
  };

  it("renders title, description and actions", () => {
    render(<ResumeAccessBlock config={mockConfig} />);

    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(screen.getByText("You do not have permission.")).toBeInTheDocument();
    expect(screen.getByText("Go Home")).toHaveAttribute("href", "/");
    expect(screen.getByText("Contact Us")).toHaveAttribute("href", "/contact");
  });

  it("handles missing actions", () => {
    const minimalConfig = {
      title: "Title",
      description: "Desc",
    };
    render(<ResumeAccessBlock config={minimalConfig} />);

    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
