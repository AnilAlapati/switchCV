import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ResumeReviewModal } from "@/components/ResumeReviewModal";
import { Resume } from "@/lib/resumeComparison.types";

const mockResume: Resume = {
  id: "resume-123",
  title: "John Doe's Resume",
  contact: {
    email: { value: "john@example.com" },
    phone: { value: "123-456-7890" },
  },
  summary: "Experienced developer",
  skills: ["React", "TypeScript"],
  experience: [
    {
      company: "Tech Corp",
      role: "Senior Developer",
      duration: "2020-Present",
      description: "Built amazing things",
    },
  ],
  education: [
    {
      degree: "BS",
      field: "Computer Science",
      institution: "University",
      year: 2020,
    },
  ],
};

describe("ResumeReviewModal", () => {
  const mockOnAccept = jest.fn();
  const mockOnRewrite = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
    global.alert = jest.fn();
  });

  it("renders nothing when not open", () => {
    render(
      <ResumeReviewModal
        resume={mockResume}
        isOpen={false}
        onAccept={mockOnAccept}
        onRewrite={mockOnRewrite}
      />
    );
    expect(
      screen.queryByText("Review Your AI-Generated Resume")
    ).not.toBeInTheDocument();
  });

  it("renders resume content when open", () => {
    render(
      <ResumeReviewModal
        resume={mockResume}
        isOpen={true}
        onAccept={mockOnAccept}
        onRewrite={mockOnRewrite}
      />
    );
    expect(
      screen.getByText("Review Your AI-Generated Resume")
    ).toBeInTheDocument();
    expect(screen.getByText("John Doe's Resume")).toBeInTheDocument();
    expect(screen.getByText("Experienced developer")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Tech Corp")).toBeInTheDocument();
    expect(screen.getByText("University")).toBeInTheDocument();
  });

  it("calls onAccept when accept button is clicked", async () => {
    render(
      <ResumeReviewModal
        resume={mockResume}
        isOpen={true}
        onAccept={mockOnAccept}
        onRewrite={mockOnRewrite}
      />
    );

    fireEvent.click(screen.getByText("Accept & Save"));
    await waitFor(() => {
      expect(mockOnAccept).toHaveBeenCalled();
    });
  });

  it("calls onRewrite when rewrite button is clicked with feedback", async () => {
    render(
      <ResumeReviewModal
        resume={mockResume}
        isOpen={true}
        onAccept={mockOnAccept}
        onRewrite={mockOnRewrite}
      />
    );

    const textarea = screen.getByPlaceholderText(
      /E.g., 'Make summary more concise'/
    );
    fireEvent.change(textarea, { target: { value: "Make it shorter" } });

    fireEvent.click(screen.getByText("Rewrite with AI"));
    await waitFor(() => {
      expect(mockOnRewrite).toHaveBeenCalledWith("Make it shorter");
    });
  });

  it("disables rewrite button when feedback is empty", () => {
    render(
      <ResumeReviewModal
        resume={mockResume}
        isOpen={true}
        onAccept={mockOnAccept}
        onRewrite={mockOnRewrite}
      />
    );

    const rewriteButton = screen.getByText("Rewrite with AI").closest("button");
    expect(rewriteButton).toBeDisabled();
  });
  it("disables buttons when loading", () => {
    render(
      <ResumeReviewModal
        resume={mockResume}
        isOpen={true}
        onAccept={mockOnAccept}
        onRewrite={mockOnRewrite}
        isLoading={true}
      />
    );

    expect(screen.getByText("Accept & Save").closest("button")).toBeDisabled();
    expect(
      screen.getByText("Rewrite with AI").closest("button")
    ).toBeDisabled();
  });

  it("shows max retries reached message", () => {
    render(
      <ResumeReviewModal
        resume={mockResume}
        isOpen={true}
        onAccept={mockOnAccept}
        onRewrite={mockOnRewrite}
        retryCount={5}
        maxRetries={5}
      />
    );

    expect(screen.getByText(/Max rewrites reached/)).toBeInTheDocument();
    expect(
      screen.getByText("Rewrite with AI").closest("button")
    ).toBeDisabled();
  });
});
