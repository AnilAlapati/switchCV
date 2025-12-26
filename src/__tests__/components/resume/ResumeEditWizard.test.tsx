import { render, screen, fireEvent } from "@testing-library/react";
import { ResumeEditWizard } from "@/components/resume/ResumeEditWizard";
import { ResumeProfile } from "@/types";

// Mock the step components to simplify testing the wizard logic
jest.mock("@/components/onboarding/steps/BasicInfoStep", () => ({
  BasicInfoStep: () => <div data-testid="basic-info-step">Basic Info</div>,
}));
jest.mock("@/components/onboarding/steps/ExperienceStep", () => ({
  ExperienceStep: ({ onAdd, onUpdate, onRemove }: any) => (
    <div data-testid="experience-step">
      <button onClick={onAdd}>Add</button>
      <button onClick={() => onUpdate(0, {})}>Update</button>
      <button onClick={() => onRemove(0)}>Remove</button>
    </div>
  ),
}));
jest.mock("@/components/onboarding/steps/EducationStep", () => ({
  EducationStep: () => <div data-testid="education-step">Education</div>,
}));
jest.mock("@/components/onboarding/steps/SkillsStep", () => ({
  SkillsStep: () => <div data-testid="skills-step">Skills</div>,
}));
jest.mock("@/components/onboarding/steps/ProjectsStep", () => ({
  ProjectsStep: () => <div data-testid="projects-step">Projects</div>,
}));
jest.mock("@/components/onboarding/steps/ContactStep", () => ({
  ContactStep: () => <div data-testid="contact-step">Contact</div>,
}));
jest.mock("@/components/onboarding/steps/ReviewStep", () => ({
  ReviewStep: () => <div data-testid="review-step">Review</div>,
}));

describe("ResumeEditWizard", () => {
  const mockSteps = [
    "Basic",
    "Exp",
    "Edu",
    "Skills",
    "Proj",
    "Contact",
    "Review",
  ];
  const mockProfile: Partial<ResumeProfile> = {};
  const mockHandlers = {
    onProfileChange: jest.fn(),
    onNext: jest.fn(),
    onPrevious: jest.fn(),
    onStepChange: jest.fn(),
    onSave: jest.fn(),
    onDirty: jest.fn(),
    experience: { add: jest.fn(), update: jest.fn(), remove: jest.fn() },
    education: { add: jest.fn(), update: jest.fn(), remove: jest.fn() },
    skills: { add: jest.fn(), update: jest.fn(), remove: jest.fn() },
    projects: { add: jest.fn(), update: jest.fn(), remove: jest.fn() },
  };

  it("renders the correct step based on currentStep", () => {
    const { rerender } = render(
      <ResumeEditWizard
        profile={mockProfile}
        steps={mockSteps}
        currentStep={0}
        meta={null}
        saveState="idle"
        saveError={null}
        isDirty={false}
        {...mockHandlers}
      />
    );

    expect(screen.getByTestId("basic-info-step")).toBeInTheDocument();

    rerender(
      <ResumeEditWizard
        profile={mockProfile}
        steps={mockSteps}
        currentStep={1}
        meta={null}
        saveState="idle"
        saveError={null}
        isDirty={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByTestId("experience-step")).toBeInTheDocument();

    rerender(
      <ResumeEditWizard
        profile={mockProfile}
        steps={mockSteps}
        currentStep={2}
        meta={null}
        saveState="idle"
        saveError={null}
        isDirty={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByTestId("education-step")).toBeInTheDocument();

    rerender(
      <ResumeEditWizard
        profile={mockProfile}
        steps={mockSteps}
        currentStep={3}
        meta={null}
        saveState="idle"
        saveError={null}
        isDirty={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByTestId("skills-step")).toBeInTheDocument();

    rerender(
      <ResumeEditWizard
        profile={mockProfile}
        steps={mockSteps}
        currentStep={4}
        meta={null}
        saveState="idle"
        saveError={null}
        isDirty={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByTestId("projects-step")).toBeInTheDocument();

    rerender(
      <ResumeEditWizard
        profile={mockProfile}
        steps={mockSteps}
        currentStep={5}
        meta={null}
        saveState="idle"
        saveError={null}
        isDirty={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByTestId("contact-step")).toBeInTheDocument();

    rerender(
      <ResumeEditWizard
        profile={mockProfile}
        steps={mockSteps}
        currentStep={6}
        meta={null}
        saveState="idle"
        saveError={null}
        isDirty={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByTestId("review-step")).toBeInTheDocument();
  });

  it("renders meta information if provided", () => {
    render(
      <ResumeEditWizard
        profile={mockProfile}
        steps={mockSteps}
        currentStep={0}
        meta={{ numericId: 123, visibility: "public" }}
        saveState="idle"
        saveError={null}
        isDirty={false}
        {...mockHandlers}
      />
    );

    expect(screen.getByText("ID #123")).toBeInTheDocument();
    expect(screen.getByText("Visibility: Public")).toBeInTheDocument();
  });

  it("renders meta without numericId correctly", () => {
    render(
      <ResumeEditWizard
        profile={mockProfile}
        steps={mockSteps}
        currentStep={0}
        meta={{ visibility: "private" }}
        saveState="idle"
        saveError={null}
        isDirty={false}
        {...mockHandlers}
      />
    );

    expect(screen.queryByText(/ID #/)).not.toBeInTheDocument();
    expect(screen.getByText("Visibility: Private")).toBeInTheDocument();
  });

  it("renders meta without visibility correctly", () => {
    render(
      <ResumeEditWizard
        profile={mockProfile}
        steps={mockSteps}
        currentStep={0}
        meta={{ numericId: 123 }}
        saveState="idle"
        saveError={null}
        isDirty={false}
        {...mockHandlers}
      />
    );

    expect(screen.getByText("ID #123")).toBeInTheDocument();
    expect(screen.queryByText(/Visibility:/)).not.toBeInTheDocument();
  });

  it("shows saving state correctly", () => {
    render(
      <ResumeEditWizard
        profile={mockProfile}
        steps={mockSteps}
        currentStep={0}
        meta={null}
        saveState="saving"
        saveError={null}
        isDirty={true}
        {...mockHandlers}
      />
    );

    expect(screen.getByText("Next →")).toBeDisabled();

    render(
      <ResumeEditWizard
        profile={mockProfile}
        steps={mockSteps}
        currentStep={6}
        meta={null}
        saveState="saving"
        saveError={null}
        isDirty={true}
        {...mockHandlers}
      />
    );
    expect(screen.getByText("Saving...")).toBeDisabled();
  });

  it("shows success message when saveState is success", () => {
    render(
      <ResumeEditWizard
        profile={mockProfile}
        steps={mockSteps}
        currentStep={0}
        meta={null}
        saveState="success"
        saveError={null}
        isDirty={false}
        {...mockHandlers}
      />
    );

    expect(
      screen.getByText("Resume updated successfully.")
    ).toBeInTheDocument();
  });

  it("shows error message when saveState is error", () => {
    render(
      <ResumeEditWizard
        profile={mockProfile}
        steps={mockSteps}
        currentStep={0}
        meta={null}
        saveState="error"
        saveError="Something went wrong"
        isDirty={false}
        {...mockHandlers}
      />
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("calls navigation handlers when buttons are clicked", () => {
    render(
      <ResumeEditWizard
        profile={mockProfile}
        steps={mockSteps}
        currentStep={1}
        meta={null}
        saveState="idle"
        saveError={null}
        isDirty={true}
        {...mockHandlers}
      />
    );

    fireEvent.click(screen.getByText("Next →"));
    expect(mockHandlers.onNext).toHaveBeenCalled();

    fireEvent.click(screen.getByText("← Previous"));
    expect(mockHandlers.onPrevious).toHaveBeenCalled();
  });

  it("calls onSave when complete button is clicked", () => {
    render(
      <ResumeEditWizard
        profile={mockProfile}
        steps={mockSteps}
        currentStep={6}
        meta={null}
        saveState="idle"
        saveError={null}
        isDirty={true}
        {...mockHandlers}
      />
    );

    fireEvent.click(screen.getByText("Save Changes"));
    expect(mockHandlers.onSave).toHaveBeenCalled();
  });

  it("shows 'No changes to save' message on last step when not dirty", () => {
    render(
      <ResumeEditWizard
        profile={mockProfile}
        steps={mockSteps}
        currentStep={6}
        meta={null}
        saveState="idle"
        saveError={null}
        isDirty={false}
        {...mockHandlers}
      />
    );

    expect(
      screen.getByText(
        "No changes to save. Update any section to enable saving."
      )
    ).toBeInTheDocument();
  });

  it("does not show 'No changes to save' message if dirty", () => {
    render(
      <ResumeEditWizard
        profile={mockProfile}
        steps={mockSteps}
        currentStep={6}
        meta={null}
        saveState="idle"
        saveError={null}
        isDirty={true}
        {...mockHandlers}
      />
    );

    expect(
      screen.queryByText(
        "No changes to save. Update any section to enable saving."
      )
    ).not.toBeInTheDocument();
  });

  it("does not show 'No changes to save' message if not on last step", () => {
    render(
      <ResumeEditWizard
        profile={mockProfile}
        steps={mockSteps}
        currentStep={0}
        meta={null}
        saveState="idle"
        saveError={null}
        isDirty={false}
        {...mockHandlers}
      />
    );

    expect(
      screen.queryByText(
        "No changes to save. Update any section to enable saving."
      )
    ).not.toBeInTheDocument();
  });

  it("wraps collection handlers to call onDirty", () => {
    render(
      <ResumeEditWizard
        profile={mockProfile}
        steps={mockSteps}
        currentStep={1}
        meta={null}
        saveState="idle"
        saveError={null}
        isDirty={false}
        {...mockHandlers}
      />
    );

    fireEvent.click(screen.getByText("Add"));
    expect(mockHandlers.onDirty).toHaveBeenCalled();
    expect(mockHandlers.experience.add).toHaveBeenCalled();

    fireEvent.click(screen.getByText("Update"));
    expect(mockHandlers.onDirty).toHaveBeenCalledTimes(2);
    expect(mockHandlers.experience.update).toHaveBeenCalled();

    fireEvent.click(screen.getByText("Remove"));
    expect(mockHandlers.onDirty).toHaveBeenCalledTimes(3);
    expect(mockHandlers.experience.remove).toHaveBeenCalled();
  });

  it("renders default null if step is out of bounds", () => {
    const { container } = render(
      <ResumeEditWizard
        profile={mockProfile}
        steps={mockSteps}
        currentStep={10}
        meta={null}
        saveState="idle"
        saveError={null}
        isDirty={false}
        {...mockHandlers}
      />
    );
    // The step content should be empty
    expect(
      container.querySelector(".bg-white.shadow-md.rounded-lg.p-4")
    ).toBeEmptyDOMElement();
  });
});
