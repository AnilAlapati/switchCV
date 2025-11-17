import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AILoadingState } from "@/components/create-resume/AILoadingState";

describe("AILoadingState", () => {
  it("renders nothing when not loading and no error", () => {
    const { container } = render(
      <AILoadingState aiLoading={false} aiError={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders loading state when aiLoading is true", () => {
    render(<AILoadingState aiLoading={true} aiError={null} />);

    expect(
      screen.getByText("🤖 AI is generating your resume...")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Check browser console (F12) for live AI call details")
    ).toBeInTheDocument();

    // Check for spinner
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass(
      "rounded-full",
      "h-12",
      "w-12",
      "border-b-4",
      "border-blue-500"
    );
  });

  it("renders error state when aiError is provided", () => {
    const errorMessage = "Failed to generate resume";
    render(<AILoadingState aiLoading={false} aiError={errorMessage} />);

    expect(
      screen.getByText(`⚠️ AI Error: ${errorMessage}`)
    ).toBeInTheDocument();
    expect(
      screen.getByText("Check browser console for error details")
    ).toBeInTheDocument();

    // Check error styling
    const errorDiv = screen
      .getByText(`⚠️ AI Error: ${errorMessage}`)
      .closest("div");
    expect(errorDiv).toHaveClass("bg-red-900/30", "border-red-500/50");
  });

  it("renders both loading and error states when both are present", () => {
    const errorMessage = "Network timeout";
    render(<AILoadingState aiLoading={true} aiError={errorMessage} />);

    // Both should be rendered
    expect(
      screen.getByText("🤖 AI is generating your resume...")
    ).toBeInTheDocument();
    expect(
      screen.getByText(`⚠️ AI Error: ${errorMessage}`)
    ).toBeInTheDocument();

    // Spinner should be present
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("applies correct loading container styles", () => {
    render(<AILoadingState aiLoading={true} aiError={null} />);

    const loadingContainer = screen.getByText(
      "🤖 AI is generating your resume..."
    ).parentElement?.parentElement;
    expect(loadingContainer).toHaveClass(
      "flex",
      "flex-col",
      "items-center",
      "justify-center",
      "py-6",
      "space-y-3",
      "px-4"
    );
  });

  it("applies correct error container styles", () => {
    render(<AILoadingState aiLoading={false} aiError="Test error" />);

    const errorContainer = screen
      .getByText("⚠️ AI Error: Test error")
      .closest("div");
    expect(errorContainer).toHaveClass(
      "bg-red-900/30",
      "border",
      "border-red-500/50",
      "rounded-lg",
      "p-4",
      "mt-4",
      "mx-4",
      "mb-4"
    );
  });
});
