import { render, screen, fireEvent } from "@testing-library/react";
import { ContactStep } from "@/components/onboarding/steps/ContactStep";
import { Visibility } from "@/types";

jest.mock("@/components/onboarding/FormComponents", () => ({
  FormInput: ({ label, value, onChange }: any) => (
    <div>
      <label htmlFor={label}>{label}</label>
      <input id={label} value={value} onChange={onChange} />
    </div>
  ),
  VisibilityControl: ({ value, onChange }: any) => (
    <button onClick={() => onChange("public")}>Visibility: {value}</button>
  ),
}));

describe("ContactStep", () => {
  const mockOnChange = jest.fn();
  const mockProfile = {
    contact: {
      email: { value: "test@example.com", visibility: "masked" as Visibility },
      phone: { value: "1234567890", visibility: "masked" as Visibility },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly with profile data", () => {
    render(<ContactStep profile={mockProfile} onChange={mockOnChange} />);

    expect(screen.getByLabelText("Email")).toHaveValue("test@example.com");
    expect(screen.getByLabelText("Phone")).toHaveValue("1234567890");
    expect(
      screen.getAllByText("Visibility: masked", { exact: false })
    ).toHaveLength(2);
  });

  it("renders correctly with empty profile data", () => {
    const emptyProfile = {
      contact: {
        email: { value: "", visibility: "masked" as Visibility },
        phone: { value: "", visibility: "masked" as Visibility },
      },
    } as any;
    render(<ContactStep profile={emptyProfile} onChange={mockOnChange} />);

    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(screen.getByLabelText("Phone")).toHaveValue("");
  });

  it("renders correctly with partial contact data", () => {
    const partialProfile = {
      contact: {
        email: { value: "", visibility: "masked" as Visibility },
        phone: { value: "", visibility: "masked" as Visibility },
      },
    } as any;
    render(<ContactStep profile={partialProfile} onChange={mockOnChange} />);

    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(screen.getByLabelText("Phone")).toHaveValue("");
    expect(
      screen.getAllByText("Visibility: masked", { exact: false })
    ).toHaveLength(2);
  });

  it("calls onChange when email is changed", () => {
    render(<ContactStep profile={mockProfile} onChange={mockOnChange} />);

    const emailInput = screen.getByLabelText("Email");
    fireEvent.change(emailInput, { target: { value: "new@example.com" } });

    expect(mockOnChange).toHaveBeenCalledWith({
      contact: expect.objectContaining({
        email: expect.objectContaining({ value: "new@example.com" }),
      }),
    });
  });

  it("calls onChange when phone is changed", () => {
    render(<ContactStep profile={mockProfile} onChange={mockOnChange} />);

    const phoneInput = screen.getByLabelText("Phone");
    fireEvent.change(phoneInput, { target: { value: "0987654321" } });

    expect(mockOnChange).toHaveBeenCalledWith({
      contact: expect.objectContaining({
        phone: expect.objectContaining({ value: "0987654321" }),
      }),
    });
  });

  it("calls onChange when email visibility is changed", () => {
    render(<ContactStep profile={mockProfile} onChange={mockOnChange} />);

    const visibilityButtons = screen.getAllByText(/Visibility:/);
    fireEvent.click(visibilityButtons[0]);

    expect(mockOnChange).toHaveBeenCalledWith({
      contact: expect.objectContaining({
        email: expect.objectContaining({ visibility: "public" }),
      }),
    });
  });

  it("calls onChange when phone visibility is changed", () => {
    render(<ContactStep profile={mockProfile} onChange={mockOnChange} />);

    const visibilityButtons = screen.getAllByText(/Visibility:/);
    fireEvent.click(visibilityButtons[1]);

    expect(mockOnChange).toHaveBeenCalledWith({
      contact: expect.objectContaining({
        phone: expect.objectContaining({ visibility: "public" }),
      }),
    });
  });
});
