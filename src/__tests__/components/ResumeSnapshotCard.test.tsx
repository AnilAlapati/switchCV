import React from "react";
import { render, screen } from "../__support__/testUtils";
import { ResumeSnapshotCard } from "@/components/resume/ResumeSnapshotCard";
import { useUserProfile } from "@/hooks/useUserProfile";

// Mock useUserProfile
jest.mock("@/hooks/useUserProfile", () => ({
  useUserProfile: jest.fn(),
}));

// Mock next/link
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, target, rel }: any) => (
    <a href={href} target={target} rel={rel}>
      {children}
    </a>
  ),
}));

// Mock RestrictedFeature
jest.mock("@/components/ui/RestrictedFeature", () => ({
  RestrictedFeature: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="restricted-feature">{children}</div>
  ),
}));

describe("ResumeSnapshotCard", () => {
  const defaultProps = {
    resumeId: "resume-123",
    title: "Senior Developer Resume",
    summary: "Experienced software engineer.",
    updatedAt: "2023-01-01T12:00:00Z",
  };

  beforeEach(() => {
    (useUserProfile as jest.Mock).mockReturnValue({ tier: "premium" });
  });

  it("renders the resume title correctly", () => {
    render(<ResumeSnapshotCard {...defaultProps} />);
    expect(screen.getByText(/Title:/)).toBeInTheDocument();
    expect(screen.getByText("Senior Developer Resume")).toBeInTheDocument();
  });

  it("renders fallback title when title is missing", () => {
    render(<ResumeSnapshotCard {...defaultProps} title={null} />);
    expect(screen.getByText("Untitled resume")).toBeInTheDocument();
  });

  it("renders summary when provided", () => {
    render(<ResumeSnapshotCard {...defaultProps} />);
    expect(screen.getByText(/Summary:/)).toBeInTheDocument();
    expect(
      screen.getByText("Experienced software engineer."),
    ).toBeInTheDocument();
  });

  it("does not render summary when not provided", () => {
    render(<ResumeSnapshotCard {...defaultProps} summary={null} />);
    expect(screen.queryByText(/Summary:/)).not.toBeInTheDocument();
  });

  it("renders last updated time", () => {
    render(<ResumeSnapshotCard {...defaultProps} />);
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
  });

  it("renders 'View Public Resume' link", () => {
    render(<ResumeSnapshotCard {...defaultProps} />);
    const link = screen.getByRole("link", { name: "View public resume" });
    expect(link).toHaveAttribute("href", "/resumes/resume-123");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders 'Open Manual Editor' link for premium users", () => {
    render(<ResumeSnapshotCard {...defaultProps} />);
    const link = screen.getByRole("link", { name: "Open manual editor" });
    expect(link).toHaveAttribute("href", "/resumes/resume-123/edit");
  });

  it("renders disabled 'Open Manual Editor' button for basic users", () => {
    (useUserProfile as jest.Mock).mockReturnValue({ tier: "basic" });
    render(<ResumeSnapshotCard {...defaultProps} />);
    const button = screen.getByRole("button", { name: "Open manual editor" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("cursor-not-allowed");
  });
});
