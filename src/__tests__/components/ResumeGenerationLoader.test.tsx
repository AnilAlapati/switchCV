import React from "react";
import { render, screen } from "@testing-library/react";
import { ResumeGenerationLoader } from "@/components/ResumeGenerationLoader";

describe("ResumeGenerationLoader", () => {
  it("renders default generating state", () => {
    render(<ResumeGenerationLoader />);
    expect(
      screen.getByText("🤖 AI is enhancing your resume...")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Generating your professional resume with AI...")
    ).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("renders saving state", () => {
    render(<ResumeGenerationLoader status="saving" message="Saving data..." />);
    expect(
      screen.getByText("💾 Saving to your profile...")
    ).toBeInTheDocument();
    expect(screen.getByText("Saving data...")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("renders complete state", () => {
    render(<ResumeGenerationLoader status="complete" />);
    expect(
      screen.getByText("✅ Resume created successfully!")
    ).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("renders custom message", () => {
    render(<ResumeGenerationLoader message="Custom loading message" />);
    expect(screen.getByText("Custom loading message")).toBeInTheDocument();
  });
});
