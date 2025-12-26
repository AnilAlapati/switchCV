import { render, screen, fireEvent } from "@testing-library/react";
import {
  ProgressBar,
  StepIndicator,
  StepHeader,
  NavigationButtons,
} from "@/components/onboarding/Navigation";

describe("Navigation Components", () => {
  describe("ProgressBar", () => {
    it("renders correctly with percentage", () => {
      render(<ProgressBar currentStep={0} totalSteps={4} />);
      const bar = screen.getByTestId("progress-bar");
      expect(bar).toHaveStyle("width: 25%");
    });
  });

  describe("StepIndicator", () => {
    const steps = ["Step 1", "Step 2", "Step 3"];
    const mockOnStepClick = jest.fn();

    it("renders steps and handles clicks", () => {
      render(
        <StepIndicator
          steps={steps}
          currentStep={1}
          onStepClick={mockOnStepClick}
        />
      );

      expect(screen.getByText("1. Step 1")).toHaveClass("bg-green-100");
      expect(screen.getByText("2. Step 2")).toHaveClass("bg-indigo-600");
      expect(screen.getByText("3. Step 3")).toHaveClass("bg-gray-200");

      fireEvent.click(screen.getByText("1. Step 1"));
      expect(mockOnStepClick).toHaveBeenCalledWith(0);
    });
  });

  describe("StepHeader", () => {
    it("renders correctly with default title", () => {
      render(
        <StepHeader stepNumber={0} stepName="Basic Info" totalSteps={5} />
      );

      expect(screen.getByText("Create Your Resume")).toBeInTheDocument();
      expect(screen.getByText(/Step 1 of 5/)).toBeInTheDocument();
      expect(screen.getByText("Basic Info")).toBeInTheDocument();
    });

    it("renders correctly with custom title", () => {
      render(
        <StepHeader
          stepNumber={1}
          stepName="Experience"
          totalSteps={5}
          title="Custom Title"
        />
      );

      expect(screen.getByText("Custom Title")).toBeInTheDocument();
    });
  });

  describe("NavigationButtons", () => {
    const mockOnPrevious = jest.fn();
    const mockOnNext = jest.fn();
    const mockOnComplete = jest.fn();

    it("renders next button when not on last step", () => {
      render(
        <NavigationButtons
          currentStep={0}
          totalSteps={3}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onComplete={mockOnComplete}
        />
      );

      expect(screen.getByText("Next →")).toBeInTheDocument();
      expect(screen.getByText("← Previous")).toBeDisabled();

      fireEvent.click(screen.getByText("Next →"));
      expect(mockOnNext).toHaveBeenCalled();
    });

    it("renders complete button when on last step", () => {
      render(
        <NavigationButtons
          currentStep={2}
          totalSteps={3}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onComplete={mockOnComplete}
        />
      );

      expect(screen.getByText("✓ Complete Setup")).toBeInTheDocument();
      expect(screen.getByText("← Previous")).not.toBeDisabled();

      fireEvent.click(screen.getByText("✓ Complete Setup"));
      expect(mockOnComplete).toHaveBeenCalled();
    });

    it("respects disabled states and custom labels", () => {
      render(
        <NavigationButtons
          currentStep={0}
          totalSteps={3}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onComplete={mockOnComplete}
          nextLabel="Go Forward"
          isNextDisabled={true}
        />
      );

      const nextBtn = screen.getByText("Go Forward");
      expect(nextBtn).toBeDisabled();
    });

    it("respects complete disabled state and custom label", () => {
      render(
        <NavigationButtons
          currentStep={2}
          totalSteps={3}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onComplete={mockOnComplete}
          completeLabel="Finish"
          isCompleteDisabled={true}
        />
      );

      const completeBtn = screen.getByText("Finish");
      expect(completeBtn).toBeDisabled();
    });
  });
});
