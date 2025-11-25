import { render, screen, fireEvent } from "@testing-library/react";
import { RecruiterRequestForm } from "./RecruiterRequestForm";
import { SearchResult } from "./SearchInterface";

// Mock SearchResult data
const mockCandidate: SearchResult = {
  userId: "candidate-123",
  displayName: "John Doe",
  role: "Senior Software Engineer",
  location: "San Francisco, CA",
  skills: ["React", "TypeScript", "Node.js"],
  bio: "Experienced software engineer with 5 years of experience",
  hasApproval: false,
};

const mockFormData = {
  fields: [] as Array<"email" | "phone" | "address" | "personalLinks">,
  purpose: "",
  duration: "1day" as const,
};

const mockProps = {
  candidate: mockCandidate,
  formData: mockFormData,
  onFormChange: jest.fn(),
  onSubmit: jest.fn(),
  onClose: jest.fn(),
  isSubmitting: false,
};

describe("RecruiterRequestForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders candidate information correctly", () => {
    render(<RecruiterRequestForm {...mockProps} />);

    expect(screen.getByText("Requesting access from:")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Senior Software Engineer")).toBeInTheDocument();
  });

  it("renders candidate information without role", () => {
    const candidateWithoutRole = { ...mockCandidate, role: undefined };
    render(
      <RecruiterRequestForm {...mockProps} candidate={candidateWithoutRole} />
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(
      screen.queryByText("Senior Software Engineer")
    ).not.toBeInTheDocument();
  });

  it("renders all field options with checkboxes", () => {
    render(<RecruiterRequestForm {...mockProps} />);

    expect(
      screen.getByText("Which information would you like to access?")
    ).toBeInTheDocument();

    // Check all field options are rendered
    expect(screen.getByText("Email Address")).toBeInTheDocument();
    expect(screen.getByText("Primary contact email")).toBeInTheDocument();
    expect(screen.getByText("Phone Number")).toBeInTheDocument();
    expect(screen.getByText("Primary phone number")).toBeInTheDocument();
    expect(screen.getByText("Address")).toBeInTheDocument();
    expect(screen.getByText("Current residential address")).toBeInTheDocument();
    expect(screen.getByText("Personal Links")).toBeInTheDocument();
    expect(
      screen.getByText("GitHub, Portfolio, LinkedIn, etc.")
    ).toBeInTheDocument();

    // Check checkboxes exist
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(4);
  });

  it("handles field selection correctly", () => {
    render(<RecruiterRequestForm {...mockProps} />);

    const emailCheckbox = screen.getByRole("checkbox", {
      name: "Email Address Primary contact email",
    });

    // Initially unchecked
    expect(emailCheckbox).not.toBeChecked();

    // Check the email field
    fireEvent.click(emailCheckbox);
    expect(mockProps.onFormChange).toHaveBeenCalledWith({
      ...mockFormData,
      fields: ["email"],
    });
  });

  it("handles multiple field selections", () => {
    const formDataWithFields = {
      ...mockFormData,
      fields: ["email" as const],
    };

    render(
      <RecruiterRequestForm {...mockProps} formData={formDataWithFields} />
    );

    const phoneCheckbox = screen.getByRole("checkbox", {
      name: "Phone Number Primary phone number",
    });

    // Add phone field
    fireEvent.click(phoneCheckbox);
    expect(mockProps.onFormChange).toHaveBeenCalledWith({
      ...formDataWithFields,
      fields: ["email", "phone"],
    });
  });

  it("renders purpose textarea with correct value", () => {
    const formDataWithPurpose = {
      ...mockFormData,
      purpose: "Looking for React developers",
    };

    render(
      <RecruiterRequestForm {...mockProps} formData={formDataWithPurpose} />
    );

    const textarea = screen.getByPlaceholderText(
      "e.g., Potential job opportunity, contract position..."
    );
    expect(textarea).toHaveValue("Looking for React developers");
  });

  it("handles purpose textarea changes", () => {
    render(<RecruiterRequestForm {...mockProps} />);

    const textarea = screen.getByPlaceholderText(
      "e.g., Potential job opportunity, contract position..."
    );

    fireEvent.change(textarea, { target: { value: "New purpose" } });

    expect(mockProps.onFormChange).toHaveBeenCalledWith({
      ...mockFormData,
      purpose: "New purpose",
    });
  });

  it("renders duration select with correct options", () => {
    render(<RecruiterRequestForm {...mockProps} />);

    const select = screen.getByDisplayValue("1 Day");
    expect(select).toBeInTheDocument();

    // Check all options are present
    expect(screen.getByText("1 Hour")).toBeInTheDocument();
    expect(screen.getByText("1 Day")).toBeInTheDocument();
    expect(screen.getByText("1 Week")).toBeInTheDocument();
    expect(screen.getByText("30 Days")).toBeInTheDocument();
  });

  it("handles duration select changes", () => {
    render(<RecruiterRequestForm {...mockProps} />);

    const select = screen.getByDisplayValue("1 Day");

    fireEvent.change(select, { target: { value: "1week" } });

    expect(mockProps.onFormChange).toHaveBeenCalledWith({
      ...mockFormData,
      duration: "1week",
    });
  });

  it("renders the note about review process", () => {
    render(<RecruiterRequestForm {...mockProps} />);

    expect(
      screen.getByText(/Your request will be reviewed/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/ensures privacy and security/)
    ).toBeInTheDocument();
  });

  it("renders cancel and submit buttons", () => {
    render(<RecruiterRequestForm {...mockProps} />);

    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Submit Request")).toBeInTheDocument();
  });

  it("handles cancel button click", () => {
    render(<RecruiterRequestForm {...mockProps} />);

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(mockProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("handles form submission", () => {
    const formDataWithFields = {
      ...mockFormData,
      fields: ["email" as const],
    };

    render(
      <RecruiterRequestForm {...mockProps} formData={formDataWithFields} />
    );

    const submitButton = screen.getByText("Submit Request");
    fireEvent.click(submitButton);

    expect(mockProps.onSubmit).toHaveBeenCalledTimes(1);
  });

  it("disables submit button when no fields are selected", () => {
    render(<RecruiterRequestForm {...mockProps} />);

    const submitButton = screen.getByText("Submit Request");
    expect(submitButton).toBeDisabled();
  });

  it("enables submit button when fields are selected", () => {
    const formDataWithFields = {
      ...mockFormData,
      fields: ["email" as const],
    };

    render(
      <RecruiterRequestForm {...mockProps} formData={formDataWithFields} />
    );

    const submitButton = screen.getByText("Submit Request");
    expect(submitButton).not.toBeDisabled();
  });

  it("disables submit button when submitting", () => {
    const formDataWithFields = {
      ...mockFormData,
      fields: ["email" as const],
    };

    render(
      <RecruiterRequestForm
        {...mockProps}
        formData={formDataWithFields}
        isSubmitting={true}
      />
    );

    const submitButton = screen.getByText("Submitting...");
    expect(submitButton).toBeDisabled();
  });

  it("shows submitting text when submitting", () => {
    const formDataWithFields = {
      ...mockFormData,
      fields: ["email" as const],
    };

    render(
      <RecruiterRequestForm
        {...mockProps}
        formData={formDataWithFields}
        isSubmitting={true}
      />
    );

    expect(screen.getByText("Submitting...")).toBeInTheDocument();
    expect(screen.queryByText("Submit Request")).not.toBeInTheDocument();
  });

  it("pre-checks checkboxes based on formData.fields", () => {
    const formDataWithFields = {
      ...mockFormData,
      fields: ["email" as const, "phone" as const],
    };

    render(
      <RecruiterRequestForm {...mockProps} formData={formDataWithFields} />
    );

    const emailCheckbox = screen.getByRole("checkbox", {
      name: "Email Address Primary contact email",
    });
    const phoneCheckbox = screen.getByRole("checkbox", {
      name: "Phone Number Primary phone number",
    });
    const addressCheckbox = screen.getByRole("checkbox", {
      name: "Address Current residential address",
    });

    expect(emailCheckbox).toBeChecked();
    expect(phoneCheckbox).toBeChecked();
    expect(addressCheckbox).not.toBeChecked();
  });

  it("pre-selects duration based on formData.duration", () => {
    const formDataWithDuration = {
      ...mockFormData,
      duration: "1week" as const,
    };

    render(
      <RecruiterRequestForm {...mockProps} formData={formDataWithDuration} />
    );

    const select = screen.getByDisplayValue("1 Week");
    expect(select).toBeInTheDocument();
  });
});
