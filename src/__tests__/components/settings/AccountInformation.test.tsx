import { render, screen, fireEvent } from "@testing-library/react";
import { AccountInformation } from "@/components/settings/AccountInformation";

describe("AccountInformation", () => {
  const mockProps = {
    email: "test@example.com",
    resumeId: "12345",
    hasResume: true,
    isRecruiter: false,
    savingRecruiter: false,
    onRecruiterToggle: jest.fn(),
    onCopy: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly with default props", () => {
    render(<AccountInformation {...mockProps} />);
    expect(screen.getByText("Account Settings")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("Resume ID")).toBeInTheDocument();
    expect(screen.getByText("12345")).toBeInTheDocument();
    expect(screen.getByText("Job Seeker")).toBeInTheDocument();
  });

  it("does not display Resume ID when hasResume is false", () => {
    render(<AccountInformation {...mockProps} hasResume={false} />);
    expect(screen.queryByText("Resume ID")).not.toBeInTheDocument();
    expect(screen.queryByText("12345")).not.toBeInTheDocument();
  });

  it("does not display Resume ID when resumeId is null", () => {
    render(<AccountInformation {...mockProps} resumeId={null} />);
    expect(screen.queryByText("Resume ID")).not.toBeInTheDocument();
  });

  it("calls onCopy when Copy button is clicked", () => {
    render(<AccountInformation {...mockProps} />);
    const copyButton = screen.getByTitle("Copy Resume ID");
    fireEvent.click(copyButton);
    expect(mockProps.onCopy).toHaveBeenCalled();
  });

  it("displays correct text for Recruiter account type", () => {
    render(<AccountInformation {...mockProps} isRecruiter={true} />);
    expect(screen.getByText("Recruiter")).toBeInTheDocument();
    expect(screen.getByText(/You have recruiter access/)).toBeInTheDocument();
  });

  it("calls onRecruiterToggle when toggle is clicked", () => {
    render(<AccountInformation {...mockProps} />);
    const buttons = screen.getAllByRole("button");
    const toggleButton = buttons.find(
      (b) => !b.getAttribute("title")?.includes("Copy")
    );

    if (toggleButton) {
      fireEvent.click(toggleButton);
      expect(mockProps.onRecruiterToggle).toHaveBeenCalledWith(true);
    } else {
      throw new Error("Toggle button not found");
    }
  });

  it("disables toggle when saving is true", () => {
    render(<AccountInformation {...mockProps} savingRecruiter={true} />);
    const buttons = screen.getAllByRole("button");
    const toggleButton = buttons.find(
      (b) => !b.getAttribute("title")?.includes("Copy")
    );

    expect(toggleButton).toBeDisabled();
  });
});
