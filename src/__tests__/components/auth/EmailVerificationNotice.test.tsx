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
    expect(screen.getByText("Refresh status")).toBeInTheDocument();
    expect(
      screen.getByText("Remember to check your spam folder.")
    ).toBeInTheDocument();
  });

  it("renders pending approval state", () => {
    render(
      <EmailVerificationNotice
        approvalStatus="pending"
        email="pending@example.com"
        onResend={mockOnResend}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText("Registration Received")).toBeInTheDocument();
    expect(screen.getByText(/Our team is currently reviewing your registration/)).toBeInTheDocument();
    expect(screen.getByText(/pending@example.com/)).toBeInTheDocument();
    expect(screen.queryByText("Resend link")).not.toBeInTheDocument();
    expect(screen.getByText("Refresh status")).toBeInTheDocument();
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

  it("calls onRefresh when refresh button is clicked", () => {
    render(
      <EmailVerificationNotice
        email="test@example.com"
        onResend={mockOnResend}
        onRefresh={mockOnRefresh}
      />
    );

    fireEvent.click(screen.getByText("Refresh status"));
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

    expect(screen.getByText("Checking status...")).toBeInTheDocument();
    expect(screen.getByText("Checking status...")).toBeDisabled();
  });
});
