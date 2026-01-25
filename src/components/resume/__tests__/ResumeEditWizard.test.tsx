import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResumeEditWizard } from "../ResumeEditWizard";

// Mock sub-components
jest.mock("@/components/onboarding/steps/BasicInfoStep", () => ({
  BasicInfoStep: ({ onChange }: any) => (
    <div data-testid="basic-info-step">
      <button onClick={() => onChange({ title: "New Title" })}>
        Change Title
      </button>
    </div>
  ),
}));
jest.mock("@/components/onboarding/steps/ExperienceStep", () => ({
  ExperienceStep: ({ onAdd, onUpdate, onRemove }: any) => (
    <div data-testid="experience-step">
      <button onClick={onAdd}>Add Exp</button>
      <button onClick={() => onUpdate(0, { role: "CEO" })}>Update Exp</button>
      <button onClick={() => onRemove(0)}>Remove Exp</button>
    </div>
  ),
}));
jest.mock("@/components/onboarding/steps/EducationStep", () => ({
  EducationStep: () => <div data-testid="education-step" />,
}));
jest.mock("@/components/onboarding/steps/SkillsStep", () => ({
  SkillsStep: () => <div data-testid="skills-step" />,
}));
jest.mock("@/components/onboarding/steps/ProjectsStep", () => ({
  ProjectsStep: () => <div data-testid="projects-step" />,
}));
jest.mock("@/components/onboarding/steps/ContactStep", () => ({
  ContactStep: () => <div data-testid="contact-step" />,
}));
jest.mock("@/components/onboarding/steps/ReviewStep", () => ({
  ReviewStep: () => <div data-testid="review-step" />,
}));
jest.mock("@/components/onboarding/Navigation", () => ({
  NavigationButtons: ({
    onNext,
    onPrevious,
    onComplete,
    completeLabel,
  }: any) => (
    <div>
      <button onClick={onPrevious}>Back</button>
      <button onClick={onNext}>Next</button>
      <button onClick={onComplete}>{completeLabel}</button>
    </div>
  ),
  ProgressBar: () => <div data-testid="progress-bar" />,
  StepHeader: ({ stepName }: any) => (
    <div data-testid="step-header">{stepName}</div>
  ),
  StepIndicator: ({ onStepClick }: any) => (
    <div>
      <button onClick={() => onStepClick(2)}>Jump to Step 2</button>
    </div>
  ),
}));

describe("ResumeEditWizard", () => {
  const steps = [
    "Basic",
    "Exp",
    "Edu",
    "Skills",
    "Projects",
    "Contact",
    "Review",
  ];
  const mockHandlers = {
    add: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const defaultProps = {
    profile: {},
    steps,
    currentStep: 0,
    meta: { numericId: "123", visibility: "public" } as any,
    saveState: "idle" as const,
    saveError: null,
    isDirty: false,
    onProfileChange: jest.fn(),
    onNext: jest.fn(),
    onPrevious: jest.fn(),
    onStepChange: jest.fn(),
    onSave: jest.fn(),
    onDirty: jest.fn(),
    experience: mockHandlers,
    education: mockHandlers,
    skills: mockHandlers,
    projects: mockHandlers,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the correct step based on currentStep", () => {
    const { rerender } = render(<ResumeEditWizard {...defaultProps} />);
    expect(screen.getByTestId("basic-info-step")).toBeInTheDocument();

    rerender(<ResumeEditWizard {...defaultProps} currentStep={1} />);
    expect(screen.getByTestId("experience-step")).toBeInTheDocument();

    rerender(<ResumeEditWizard {...defaultProps} currentStep={2} />);
    expect(screen.getByTestId("education-step")).toBeInTheDocument();

    rerender(<ResumeEditWizard {...defaultProps} currentStep={3} />);
    expect(screen.getByTestId("skills-step")).toBeInTheDocument();

    rerender(<ResumeEditWizard {...defaultProps} currentStep={4} />);
    expect(screen.getByTestId("projects-step")).toBeInTheDocument();

    rerender(<ResumeEditWizard {...defaultProps} currentStep={5} />);
    expect(screen.getByTestId("contact-step")).toBeInTheDocument();

    rerender(<ResumeEditWizard {...defaultProps} currentStep={6} />);
    expect(screen.getByTestId("review-step")).toBeInTheDocument();

    rerender(<ResumeEditWizard {...defaultProps} currentStep={99} />);
    expect(screen.queryByTestId("basic-info-step")).not.toBeInTheDocument();
  });

  it("calls onDirty and handler when adding/updating/removing items", () => {
    render(<ResumeEditWizard {...defaultProps} currentStep={1} />);

    fireEvent.click(screen.getByText("Add Exp"));
    expect(defaultProps.onDirty).toHaveBeenCalled();
    expect(mockHandlers.add).toHaveBeenCalled();

    fireEvent.click(screen.getByText("Update Exp"));
    expect(defaultProps.onDirty).toHaveBeenCalledTimes(2);
    expect(mockHandlers.update).toHaveBeenCalled();

    fireEvent.click(screen.getByText("Remove Exp"));
    expect(defaultProps.onDirty).toHaveBeenCalledTimes(3);
    expect(mockHandlers.remove).toHaveBeenCalled();
  });

  it("shows success and error messages", () => {
    const { rerender } = render(
      <ResumeEditWizard {...defaultProps} saveState="success" />,
    );
    expect(
      screen.getByText("Resume updated successfully."),
    ).toBeInTheDocument();

    rerender(
      <ResumeEditWizard
        {...defaultProps}
        saveState="error"
        saveError="Failed to save"
      />,
    );
    expect(screen.getByText("Failed to save")).toBeInTheDocument();
  });

  it("handles navigation and save calls", () => {
    render(<ResumeEditWizard {...defaultProps} />);

    fireEvent.click(screen.getByText("Next"));
    expect(defaultProps.onNext).toHaveBeenCalled();

    fireEvent.click(screen.getByText("Back"));
    expect(defaultProps.onPrevious).toHaveBeenCalled();

    fireEvent.click(screen.getByText("Save Changes"));
    expect(defaultProps.onSave).toHaveBeenCalled();

    fireEvent.click(screen.getByText("Jump to Step 2"));
    expect(defaultProps.onStepChange).toHaveBeenCalledWith(2);
  });

  it("displays meta information with private visibility", () => {
    render(
      <ResumeEditWizard
        {...defaultProps}
        meta={{ numericId: "123", visibility: "private" } as any}
      />,
    );
    expect(screen.getByText("ID #123")).toBeInTheDocument();
    expect(screen.getByText(/Visibility: Private/)).toBeInTheDocument();
  });

  it("shows 'no changes' message on the last step when not dirty", () => {
    render(
      <ResumeEditWizard
        {...defaultProps}
        currentStep={steps.length - 1}
        isDirty={false}
      />,
    );
    expect(
      screen.getByText(
        "No changes to save. Update any section to enable saving.",
      ),
    ).toBeInTheDocument();
  });

  it("shows saving state on button", () => {
    render(<ResumeEditWizard {...defaultProps} saveState="saving" />);
    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });

  it("handles missing meta", () => {
    const { container } = render(
      <ResumeEditWizard {...defaultProps} meta={null} />,
    );
    expect(screen.queryByText("ID #")).not.toBeInTheDocument();
    expect(screen.queryByText("Visibility:")).not.toBeInTheDocument();
  });
});
