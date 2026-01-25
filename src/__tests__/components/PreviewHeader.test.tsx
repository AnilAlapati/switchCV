import React from "react";
import { render, screen } from "../__support__/testUtils";
import { PreviewHeader } from "@/components/resume/PreviewHeader";

describe("PreviewHeader", () => {
  it("renders title and summary when both are provided", () => {
    const profile = {
      title: "Software Engineer",
      summary: "Experienced developer with 5 years of expertise",
    };

    render(<PreviewHeader profile={profile} />);

    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(
      screen.getByText("Experienced developer with 5 years of expertise"),
    ).toBeInTheDocument();
  });

  it("renders title with default when title is not provided", () => {
    const profile = {
      summary: "Experienced developer with 5 years of expertise",
    };

    render(<PreviewHeader profile={profile} />);

    expect(screen.getByText("Resume Title")).toBeInTheDocument();
    expect(
      screen.getByText("Experienced developer with 5 years of expertise"),
    ).toBeInTheDocument();
  });

  it("renders only title when summary is not provided", () => {
    const profile = {
      title: "Software Engineer",
    };

    render(<PreviewHeader profile={profile} />);

    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.queryByText(/Experienced developer/)).not.toBeInTheDocument();
  });

  it("renders default title when neither title nor summary are provided", () => {
    const profile = {};

    render(<PreviewHeader profile={profile} />);

    expect(screen.getByText("Resume Title")).toBeInTheDocument();
    expect(screen.queryByText(/summary/)).not.toBeInTheDocument();
  });

  it("renders with correct CSS classes", () => {
    const profile = {
      title: "Software Engineer",
      summary: "Experienced developer",
    };

    const { container } = render(<PreviewHeader profile={profile} />);

    const headerDiv = container.firstChild as HTMLElement;
    expect(headerDiv).toHaveClass(
      "bg-gradient-to-r",
      "from-indigo-600",
      "to-purple-600",
      "text-white",
      "px-6",
      "py-8",
    );

    const titleElement = screen.getByRole("heading", { level: 2 });
    expect(titleElement).toHaveClass(
      "text-2xl",
      "sm:text-3xl",
      "font-bold",
      "mb-2",
    );

    const summaryElement = screen.getByText("Experienced developer");
    expect(summaryElement).toHaveClass(
      "text-indigo-100",
      "text-sm",
      "sm:text-base",
      "line-clamp-2",
    );
  });

  it("handles empty profile object", () => {
    render(<PreviewHeader profile={{}} />);

    expect(screen.getByText("Resume Title")).toBeInTheDocument();
  });

  it("renders summary with proper text content", () => {
    const profile = {
      title: "Test Title",
      summary: "This is a test summary with multiple words",
    };

    render(<PreviewHeader profile={profile} />);

    const summaryElement = screen.getByText(
      "This is a test summary with multiple words",
    );
    expect(summaryElement.tagName).toBe("P");
  });

  it("renders title as h2 element", () => {
    const profile = {
      title: "Test Title",
    };

    render(<PreviewHeader profile={profile} />);

    const titleElement = screen.getByRole("heading", { level: 2 });
    expect(titleElement).toHaveTextContent("Test Title");
  });
});
