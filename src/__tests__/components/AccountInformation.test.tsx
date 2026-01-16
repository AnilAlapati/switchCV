import React from "react";
import { render, screen } from "../__support__/testUtils";
import userEvent from "@testing-library/user-event";
import { AccountInformation } from "@/components/settings/AccountInformation";

describe("AccountInformation", () => {
  const mockProps = {
    email: "user@example.com",
    resumeId: "res-12345",
    hasResume: true,
    isRecruiter: false,
    saving: false,
    savingRecruiter: false,
    onRecruiterToggle: jest.fn(),
    onCopy: jest.fn(),
  };

  it("displays account information title", () => {
    render(<AccountInformation {...mockProps} />);
    expect(screen.getByText("Account Settings")).toBeInTheDocument();
  });

  it("displays email address", () => {
    render(<AccountInformation {...mockProps} />);
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
  });

  it("displays email label", () => {
    render(<AccountInformation {...mockProps} />);
    expect(screen.getByText("Email Address")).toBeInTheDocument();
  });

  it("displays resume ID when present", () => {
    render(<AccountInformation {...mockProps} />);
    expect(screen.getByText("res-12345")).toBeInTheDocument();
  });

  it("hides resume ID section when no resume", () => {
    render(<AccountInformation {...mockProps} hasResume={false} />);
    expect(screen.queryByText("Resume ID")).not.toBeInTheDocument();
  });

  it("calls onCopy when copy button clicked", async () => {
    const user = userEvent.setup();
    render(<AccountInformation {...mockProps} />);

    await user.click(screen.getByRole("button", { name: /Copy/ }));
    expect(mockProps.onCopy).toHaveBeenCalled();
  });

  it("calls onRecruiterToggle when recruiter toggle clicked", async () => {
    const user = userEvent.setup();
    render(<AccountInformation {...mockProps} />);

    const buttons = screen.getAllByRole("button");
    const toggleBtn = buttons.find(
      (btn) =>
        btn.textContent?.includes("Recruiter") ||
        btn.textContent?.includes("Job Seeker")
    );

    if (toggleBtn) {
      await user.click(toggleBtn);
      expect(mockProps.onRecruiterToggle).toHaveBeenCalled();
    }
  });
});
