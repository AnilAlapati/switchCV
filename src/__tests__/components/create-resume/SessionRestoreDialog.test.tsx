import { render, screen, fireEvent } from "@testing-library/react";
import { SessionRestoreDialog } from "@/components/create-resume/SessionRestoreDialog";

describe("SessionRestoreDialog", () => {
  const mockOnContinue = jest.fn();
  const mockOnStartFresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with correct message count", () => {
    render(
      <SessionRestoreDialog
        onContinue={mockOnContinue}
        onStartFresh={mockOnStartFresh}
        messageCount={5}
      />
    );

    expect(screen.getByText(/5 messages/i)).toBeInTheDocument();
  });

  it("shows singular 'message' for count of 1", () => {
    render(
      <SessionRestoreDialog
        onContinue={mockOnContinue}
        onStartFresh={mockOnStartFresh}
        messageCount={1}
      />
    );

    expect(screen.getByText(/1 message/i)).toBeInTheDocument();
  });

  it("formats last activity correctly - minutes ago", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    render(
      <SessionRestoreDialog
        onContinue={mockOnContinue}
        onStartFresh={mockOnStartFresh}
        messageCount={3}
        lastActivity={fiveMinutesAgo}
      />
    );

    expect(screen.getByText(/5 minutes ago/i)).toBeInTheDocument();
  });

  it("formats last activity correctly - hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    render(
      <SessionRestoreDialog
        onContinue={mockOnContinue}
        onStartFresh={mockOnStartFresh}
        messageCount={3}
        lastActivity={twoHoursAgo}
      />
    );

    expect(screen.getByText(/2 hours ago/i)).toBeInTheDocument();
  });

  it("formats last activity correctly - days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    render(
      <SessionRestoreDialog
        onContinue={mockOnContinue}
        onStartFresh={mockOnStartFresh}
        messageCount={3}
        lastActivity={threeDaysAgo}
      />
    );

    expect(screen.getByText(/3 days ago/i)).toBeInTheDocument();
  });

  it("shows 'recently' when no lastActivity provided", () => {
    render(
      <SessionRestoreDialog
        onContinue={mockOnContinue}
        onStartFresh={mockOnStartFresh}
        messageCount={3}
      />
    );

    expect(screen.getByText(/recently/i)).toBeInTheDocument();
  });

  it("calls onContinue when Continue button is clicked", () => {
    render(
      <SessionRestoreDialog
        onContinue={mockOnContinue}
        onStartFresh={mockOnStartFresh}
        messageCount={3}
      />
    );

    const continueButton = screen.getByRole("button", {
      name: /continue where i left off/i,
    });
    fireEvent.click(continueButton);

    expect(mockOnContinue).toHaveBeenCalledTimes(1);
    expect(mockOnStartFresh).not.toHaveBeenCalled();
  });

  it("calls onStartFresh when Start Fresh button is clicked", () => {
    render(
      <SessionRestoreDialog
        onContinue={mockOnContinue}
        onStartFresh={mockOnStartFresh}
        messageCount={3}
      />
    );

    const startFreshButton = screen.getByRole("button", {
      name: /start fresh resume/i,
    });
    fireEvent.click(startFreshButton);

    expect(mockOnStartFresh).toHaveBeenCalledTimes(1);
    expect(mockOnContinue).not.toHaveBeenCalled();
  });

  it("renders dialog with correct ARIA attributes", () => {
    render(
      <SessionRestoreDialog
        onContinue={mockOnContinue}
        onStartFresh={mockOnStartFresh}
        messageCount={3}
      />
    );

    // Check that both buttons are accessible
    expect(
      screen.getByRole("button", { name: /continue where i left off/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /start fresh resume/i })
    ).toBeInTheDocument();
  });

  it("displays the alert icon", () => {
    const { container } = render(
      <SessionRestoreDialog
        onContinue={mockOnContinue}
        onStartFresh={mockOnStartFresh}
        messageCount={3}
      />
    );

    // The RefreshCw icon container should be rendered
    const iconContainer = container.querySelector(".bg-black\\/5");
    expect(iconContainer).toBeInTheDocument();
  });
});
