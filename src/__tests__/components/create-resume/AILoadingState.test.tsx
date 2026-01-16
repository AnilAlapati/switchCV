import { render } from "@testing-library/react";
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
    const { container } = render(
      <AILoadingState aiLoading={true} aiError={null} />
    );

    // Check for Bot icon
    const botIcon = container.querySelector(".lucide-bot");
    expect(botIcon).toBeInTheDocument();

    // Check for animated dots
    const animatedDots = container.querySelectorAll(".animate-bounce");
    expect(animatedDots).toHaveLength(3);

    // Check for container structure
    const mainContainer = container.querySelector(".flex.items-end.gap-3");
    expect(mainContainer).toBeInTheDocument();
  });

  it("renders error state when aiError is provided", () => {
    const errorMessage = "Failed to generate resume";
    const { container, getByText } = render(
      <AILoadingState aiLoading={false} aiError={errorMessage} />
    );

    expect(getByText(`⚠️ ${errorMessage}`)).toBeInTheDocument();

    // Check error styling
    const errorDiv = container.querySelector(".bg-red-50");
    expect(errorDiv).toBeInTheDocument();
    expect(errorDiv).toHaveClass("border-red-100", "text-red-800");
  });

  it("prefers error state over loading when both are present", () => {
    const errorMessage = "Network timeout";
    const { getByText, container } = render(
      <AILoadingState aiLoading={true} aiError={errorMessage} />
    );

    // Error should be shown
    expect(getByText(`⚠️ ${errorMessage}`)).toBeInTheDocument();

    // Should have red styling, not loading styling
    const errorDiv = container.querySelector(".bg-red-50");
    expect(errorDiv).toBeInTheDocument();
  });

  it("applies correct loading container styles", () => {
    const { container } = render(
      <AILoadingState aiLoading={true} aiError={null} />
    );

    const mainContainer = container.querySelector(".flex.items-end.gap-3");
    expect(mainContainer).toHaveClass(
      "justify-start",
      "animate-in",
      "fade-in",
      "slide-in-from-bottom-2",
      "duration-300"
    );
  });

  it("applies correct error container styles", () => {
    const { container } = render(
      <AILoadingState aiLoading={false} aiError="Test error" />
    );

    const errorContainer = container.querySelector(".bg-red-50");
    expect(errorContainer).toHaveClass(
      "border",
      "border-red-100",
      "text-red-800"
    );
  });
});
