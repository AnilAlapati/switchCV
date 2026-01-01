import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmailVerificationNotice } from "@/components/auth/EmailVerificationNotice";

describe("EmailVerificationNotice", () => {
  const mockOnResend = jest.fn();
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with default props", () => {
    render(
      <EmailVerificationNotice
        onResend={mockOnResend}
        onRefresh={mockOnRefresh}
      />
    );

    expect(
      screen.getByText("Verify your email")
    ).toBeInTheDocument();
    expect(screen.getByText("your inbox")).toBeInTheDocument();
    expect(screen.getByText("Resend link")).toBeInTheDocument();
    expect(screen.getByText("I verified my email")).toBeInTheDocument();
    expect(
      screen.getByText("Remember to check your spam folder.")
    ).toBeInTheDocument();
  });

  it("renders with provided email", () => {
    const email = "test@example.com";
    render(
      <EmailVerificationNotice
        email={email}
        onResend={mockOnResend}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText(email)).toBeInTheDocument();
    expect(
      screen.getByText("Verify your email")
    ).toBeInTheDocument();
    expect(screen.queryByText("your inbox")).not.toBeInTheDocument();
    expect(screen.getByText("Resend link")).toBeInTheDocument();
  });

  it("calls onResend when resend button is clicked", () => {
    render(
      <EmailVerificationNotice
        email="test@example.com"
        onResend={mockOnResend}
        onRefresh={mockOnRefresh}
      />
    );

    fireEvent.click(screen.getByText("Resend link"));
    expect(mockOnResend).toHaveBeenCalledTimes(1);
  });

  it("calls onRefresh when I verified already button is clicked", () => {
    render(
      <EmailVerificationNotice
        email="test@example.com"
        onResend={mockOnResend}
        onRefresh={mockOnRefresh}
      />
    );

    fireEvent.click(screen.getByText("I verified my email"));
    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it("shows loading state for resending", () => {
    render(
      <EmailVerificationNotice
        onResend={mockOnResend}
        onRefresh={mockOnRefresh}
        resending={true}
      />
    );

    expect(screen.getByText("Sending...")).toBeInTheDocument();
    expect(screen.getByText("Sending...")).toBeDisabled();
  });

  it("shows loading state for refreshing", () => {
    render(
      <EmailVerificationNotice
        onResend={mockOnResend}
        onRefresh={mockOnRefresh}
        refreshing={true}
      />
    );

    expect(screen.getByText("Checking...")).toBeInTheDocument();
    expect(screen.getByText("Checking...")).toBeDisabled();
  });
});
