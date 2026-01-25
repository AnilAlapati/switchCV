import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResumeToastOverlay, ResumeToast } from "../ResumeToastOverlay";

describe("ResumeToastOverlay", () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when toast is null", () => {
    const { container } = render(
      <ResumeToastOverlay toast={null} onDismiss={mockOnDismiss} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders success toast correctly", () => {
    const toast: ResumeToast = { tone: "success", message: "Success message" };
    render(<ResumeToastOverlay toast={toast} onDismiss={mockOnDismiss} />);

    expect(screen.getByText("Success message")).toBeInTheDocument();
    const dismissButton = screen.getByRole("button", { name: /dismiss/i });
    expect(dismissButton).toBeInTheDocument();

    // Check for success color class (emerald)
    const toastContainer = screen.getByText("Success message").closest("div");
    expect(toastContainer).toHaveClass("bg-emerald-600/90");
  });

  it("renders error toast correctly", () => {
    const toast: ResumeToast = { tone: "error", message: "Error message" };
    render(<ResumeToastOverlay toast={toast} onDismiss={mockOnDismiss} />);

    expect(screen.getByText("Error message")).toBeInTheDocument();
    const toastContainer = screen.getByText("Error message").closest("div");
    expect(toastContainer).toHaveClass("bg-red-600/90");
  });

  it("renders warning toast correctly", () => {
    const toast: ResumeToast = { tone: "warning", message: "Warning message" };
    render(<ResumeToastOverlay toast={toast} onDismiss={mockOnDismiss} />);

    expect(screen.getByText("Warning message")).toBeInTheDocument();
    const toastContainer = screen.getByText("Warning message").closest("div");
    expect(toastContainer).toHaveClass("bg-yellow-400/90");
    // Should have specific class for text/border
    expect(toastContainer).toHaveClass("text-slate-900");
  });

  it("renders info toast correctly", () => {
    const toast: ResumeToast = { tone: "info", message: "Info message" };
    render(<ResumeToastOverlay toast={toast} onDismiss={mockOnDismiss} />);

    expect(screen.getByText("Info message")).toBeInTheDocument();
    const toastContainer = screen.getByText("Info message").closest("div");
    expect(toastContainer).toHaveClass("bg-blue-600/90");
  });

  it("calls onDismiss when button is clicked", () => {
    const toast: ResumeToast = { tone: "info", message: "Dismissable" };
    render(<ResumeToastOverlay toast={toast} onDismiss={mockOnDismiss} />);

    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });
});
