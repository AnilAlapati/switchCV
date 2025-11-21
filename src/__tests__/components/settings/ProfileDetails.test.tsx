import { render, screen, fireEvent } from "@testing-library/react";
import { ProfileDetails } from "@/components/settings/ProfileDetails";

describe("ProfileDetails", () => {
  const mockProps = {
    displayName: "John Doe",
    companyName: "Acme Corp",
    updatedAt: "2023-01-01T12:00:00Z",
    showCompanyInput: true,
    saving: false,
    onDisplayNameChange: jest.fn(),
    onCompanyNameChange: jest.fn(),
    onSaveDisplayName: jest.fn(),
    onSaveCompanyName: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly with default props", () => {
    render(<ProfileDetails {...mockProps} />);
    expect(screen.getByText("Profile Details")).toBeInTheDocument();
    expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText(/January 1, 2023/)).toBeInTheDocument();
  });

  it("does not render company input when showCompanyInput is false", () => {
    render(<ProfileDetails {...mockProps} showCompanyInput={false} />);
    expect(screen.queryByDisplayValue("Acme Corp")).not.toBeInTheDocument();
    expect(screen.queryByText("Company Name")).not.toBeInTheDocument();
  });

  it("calls onDisplayNameChange when display name input changes", () => {
    render(<ProfileDetails {...mockProps} />);
    const input = screen.getByDisplayValue("John Doe");
    fireEvent.change(input, { target: { value: "Jane Doe" } });
    expect(mockProps.onDisplayNameChange).toHaveBeenCalledWith("Jane Doe");
  });

  it("calls onCompanyNameChange when company name input changes", () => {
    render(<ProfileDetails {...mockProps} />);
    const input = screen.getByDisplayValue("Acme Corp");
    fireEvent.change(input, { target: { value: "Globex" } });
    expect(mockProps.onCompanyNameChange).toHaveBeenCalledWith("Globex");
  });

  it("calls onSaveDisplayName when save display name button is clicked", () => {
    render(<ProfileDetails {...mockProps} />);
    const buttons = screen.getAllByText("Save");
    fireEvent.click(buttons[0]); // First save button is for display name
    expect(mockProps.onSaveDisplayName).toHaveBeenCalled();
  });

  it("calls onSaveCompanyName when save company name button is clicked", () => {
    render(<ProfileDetails {...mockProps} />);
    const buttons = screen.getAllByText("Save");
    fireEvent.click(buttons[1]); // Second save button is for company name
    expect(mockProps.onSaveCompanyName).toHaveBeenCalled();
  });

  it("disables inputs and buttons when saving is true", () => {
    render(<ProfileDetails {...mockProps} saving={true} />);
    
    const inputs = screen.getAllByRole("textbox");
    inputs.forEach(input => expect(input).toBeDisabled());

    const buttons = screen.getAllByText("Saving...");
    buttons.forEach(button => expect(button).toBeDisabled());
  });

  it("displays 'Never' when updatedAt is empty", () => {
    render(<ProfileDetails {...mockProps} updatedAt="" />);
    expect(screen.getByText("Never")).toBeInTheDocument();
  });
});
