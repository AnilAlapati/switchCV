import { render, screen, fireEvent } from "@testing-library/react";
import { BasicInfoStep } from "@/components/onboarding/steps/BasicInfoStep";

describe("BasicInfoStep", () => {
  const mockOnChange = jest.fn();
  const mockProfile = {
    title: "Software Engineer",
    summary: "Experienced developer",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly with profile data", () => {
    render(<BasicInfoStep profile={mockProfile} onChange={mockOnChange} />);

    expect(screen.getByLabelText("Resume Title")).toHaveValue(
      "Software Engineer"
    );
    expect(screen.getByLabelText("Professional Summary")).toHaveValue(
      "Experienced developer"
    );
  });

  it("renders correctly with empty profile data", () => {
    render(<BasicInfoStep profile={{}} onChange={mockOnChange} />);

    expect(screen.getByLabelText("Resume Title")).toHaveValue("");
    expect(screen.getByLabelText("Professional Summary")).toHaveValue("");
  });

  it("calls onChange when title is changed", () => {
    render(<BasicInfoStep profile={mockProfile} onChange={mockOnChange} />);

    const titleInput = screen.getByLabelText("Resume Title");
    fireEvent.change(titleInput, { target: { value: "Senior Engineer" } });

    expect(mockOnChange).toHaveBeenCalledWith({ title: "Senior Engineer" });
  });

  it("calls onChange when summary is changed", () => {
    render(<BasicInfoStep profile={mockProfile} onChange={mockOnChange} />);

    const summaryInput = screen.getByLabelText("Professional Summary");
    fireEvent.change(summaryInput, { target: { value: "New summary" } });

    expect(mockOnChange).toHaveBeenCalledWith({ summary: "New summary" });
  });
});
