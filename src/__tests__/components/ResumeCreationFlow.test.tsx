import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ResumeCreationFlow } from "@/components/ResumeCreationFlow";
import { useAIResume } from "@/hooks/useAIResume";
import { MockResumeQAForm, MockResumeGenerationLoader, MockResumeReviewModal } from "../__support__/resumeMocks";
import { toast } from "sonner";

jest.mock("@/hooks/useAIResume");
jest.mock("@/components/ResumeQAForm", () => ({ ResumeQAForm: (props: Record<string, unknown>) => <MockResumeQAForm {...props} /> }));
jest.mock("@/components/ResumeGenerationLoader", () => ({ ResumeGenerationLoader: (props: Record<string, unknown>) => <MockResumeGenerationLoader {...props} /> }));
jest.mock("@/components/ResumeReviewModal", () => ({ ResumeReviewModal: (props: Record<string, unknown>) => <MockResumeReviewModal {...props} /> }));
jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    warning: jest.fn(),
    success: jest.fn(),
  },
}));

describe("ResumeCreationFlow", () => {
  const mockGenerateResumeContent = jest.fn();
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAIResume as jest.Mock).mockReturnValue({ generateResumeContent: mockGenerateResumeContent, loading: false });
    global.fetch = jest.fn();
  });

  it("renders QA form and handles cancellation", () => {
    render(<ResumeCreationFlow userId="user-123" />);
    expect(screen.getByTestId("resume-qa-form")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancel QA"));
    expect(screen.getByTestId("resume-qa-form")).toBeInTheDocument();
  });

  it("transitions to generating state, calls AI, and shows review modal", async () => {
    mockGenerateResumeContent.mockResolvedValue({
      enhancedSummary: "Enhanced Summary", skillSuggestions: ["Node.js"], enhancedExperience: [{ company: "Tech Corp", title: "Developer", duration: "2020-2023", enhancedDescription: "Wrote code" }]
    });
    render(<ResumeCreationFlow userId="user-123" />);
    fireEvent.click(screen.getByText("Submit QA"));
    expect(screen.getByTestId("resume-loader")).toBeInTheDocument();
    await waitFor(() => expect(mockGenerateResumeContent).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId("resume-review-modal")).toBeInTheDocument());
  });

  it("handles generation error or null result", async () => {
    mockGenerateResumeContent.mockRejectedValue(new Error("AI Error"));
    jest.useFakeTimers();
    render(<ResumeCreationFlow userId="user-123" />);
    fireEvent.click(screen.getByText("Submit QA"));
    await waitFor(() => expect(screen.getByText(/Error generating resume/)).toBeInTheDocument());
    jest.advanceTimersByTime(2000);
    await waitFor(() => expect(screen.getByTestId("resume-qa-form")).toBeInTheDocument());

    mockGenerateResumeContent.mockResolvedValue(null);
    fireEvent.click(screen.getByText("Submit QA"));
    await waitFor(() => expect(screen.getByText(/Error generating resume/)).toBeInTheDocument());
    jest.useRealTimers();
  });

  it("saves resume when accepted and handles failure", async () => {
    jest.useFakeTimers();
    mockGenerateResumeContent.mockResolvedValue({ enhancedSummary: "Summary", skillSuggestions: [], enhancedExperience: [] });
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ resumeId: "new-resume-id" }) });

    const { unmount } = render(<ResumeCreationFlow userId="user-123" onComplete={mockOnComplete} />);
    fireEvent.click(screen.getByText("Submit QA"));
    await waitFor(() => expect(screen.getByTestId("resume-review-modal")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Accept"));
    expect(screen.getByText(/Saving to your profile/)).toBeInTheDocument();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/resumes/create", expect.objectContaining({ method: "POST" })));
    jest.advanceTimersByTime(2000);
    expect(mockOnComplete).toHaveBeenCalledWith("new-resume-id");

    unmount();
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ message: "Save failed" }) });
    render(<ResumeCreationFlow userId="user-123" />);
    fireEvent.click(screen.getByText("Submit QA"));
    await waitFor(() => expect(screen.getByTestId("resume-review-modal")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Accept"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Save failed"));
    jest.useRealTimers();
  });

  it("handles QA completion with various input formats", async () => {
    mockGenerateResumeContent.mockResolvedValue({ enhancedSummary: "Summary", skillSuggestions: [], enhancedExperience: [] });
    const { unmount } = render(<ResumeCreationFlow userId="user-123" />);

    fireEvent.click(screen.getByText("Submit QA Edge Cases"));
    await waitFor(() => expect(mockGenerateResumeContent).toHaveBeenCalledWith(expect.objectContaining({ personalInfo: expect.objectContaining({ name: "John,Doe", email: "" }), skills: [], summary: "" }), "modern", "professional"));

    unmount();
    render(<ResumeCreationFlow userId="user-123" />);
    fireEvent.click(screen.getByText("Submit String Skills"));
    await waitFor(() => expect(mockGenerateResumeContent).toHaveBeenCalledWith(expect.objectContaining({ skills: ["React", "TypeScript"] }), "modern", "professional"));
  });

  it("handles rewrite flow (success, error, null, max retries)", async () => {
    mockGenerateResumeContent.mockResolvedValue({ enhancedSummary: "Initial", skillSuggestions: [], enhancedExperience: [] });
    render(<ResumeCreationFlow userId="user-123" />);
    fireEvent.click(screen.getByText("Submit QA"));
    await waitFor(() => expect(screen.getByTestId("resume-review-modal")).toBeInTheDocument());

    // Success
    mockGenerateResumeContent.mockResolvedValueOnce({ enhancedSummary: "Rewritten", skillSuggestions: [], enhancedExperience: [] });
    fireEvent.click(screen.getByText("Rewrite"));
    await waitFor(() => expect(screen.getByText("Rewritten")).toBeInTheDocument());

    // Error
    mockGenerateResumeContent.mockRejectedValueOnce(new Error("Regen failed"));
    fireEvent.click(screen.getByText("Rewrite"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to regenerate resume. Please try again."));

    // Null result (Line 203 coverage)
    mockGenerateResumeContent.mockResolvedValueOnce(null);
    fireEvent.click(screen.getByText("Rewrite"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to regenerate resume. Please try again."));

    // Max retries (we already did 3 retries above: success, error, null. Need 2 more to hit 5)
    mockGenerateResumeContent.mockResolvedValue({ enhancedSummary: "Summary", skillSuggestions: [], enhancedExperience: [] });
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByText("Rewrite"));
      await waitFor(() => expect(screen.getByTestId("resume-review-modal")).toBeInTheDocument());
    }
    fireEvent.click(screen.getByText("Rewrite"));
    expect(toast.warning).toHaveBeenCalledWith("Maximum rewrites reached. Please accept this version.");
  });
});
