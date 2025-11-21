import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ResumeCreationFlow } from "@/components/ResumeCreationFlow";
import { useAIResume } from "@/hooks/useAIResume";
import {
  MockResumeQAForm,
  MockResumeGenerationLoader,
  MockResumeReviewModal,
} from "../__support__/resumeMocks";

// Mock hooks
jest.mock("@/hooks/useAIResume");

// Mock components using the shared mocks
jest.mock("@/components/ResumeQAForm", () => ({
  ResumeQAForm: (props: any) => <MockResumeQAForm {...props} />,
}));

jest.mock("@/components/ResumeGenerationLoader", () => ({
  ResumeGenerationLoader: (props: any) => (
    <MockResumeGenerationLoader {...props} />
  ),
}));

jest.mock("@/components/ResumeReviewModal", () => ({
  ResumeReviewModal: (props: any) => <MockResumeReviewModal {...props} />,
}));

describe("ResumeCreationFlow", () => {
  const mockGenerateResumeContent = jest.fn();
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAIResume as jest.Mock).mockReturnValue({
      generateResumeContent: mockGenerateResumeContent,
      loading: false,
    });
    global.fetch = jest.fn();
    global.alert = jest.fn();
  });

  it("renders QA form initially", () => {
    render(<ResumeCreationFlow userId="user-123" />);
    expect(screen.getByTestId("resume-qa-form")).toBeInTheDocument();
  });

  it("transitions to generating state and calls AI on QA completion", async () => {
    mockGenerateResumeContent.mockResolvedValue({
      enhancedSummary: "Enhanced Summary",
      skillSuggestions: ["Node.js"],
      enhancedExperience: [],
    });

    render(<ResumeCreationFlow userId="user-123" />);

    fireEvent.click(screen.getByText("Submit QA"));

    expect(screen.getByTestId("resume-loader")).toBeInTheDocument();
    expect(
      screen.getByText(/Generating your professional resume/)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(mockGenerateResumeContent).toHaveBeenCalledWith(
        expect.objectContaining({
          personalInfo: expect.objectContaining({ name: "John Doe" }),
        }),
        "modern",
        "professional"
      );
    });
  });

  it("shows review modal after successful generation", async () => {
    mockGenerateResumeContent.mockResolvedValue({
      enhancedSummary: "Enhanced Summary",
      skillSuggestions: ["Node.js"],
      enhancedExperience: [],
    });

    render(<ResumeCreationFlow userId="user-123" />);

    fireEvent.click(screen.getByText("Submit QA"));

    await waitFor(() => {
      expect(screen.getByTestId("resume-review-modal")).toBeInTheDocument();
      expect(screen.getByText("John Doe's Resume")).toBeInTheDocument();
    });
  });

  it("handles generation error", async () => {
    mockGenerateResumeContent.mockRejectedValue(new Error("AI Error"));
    jest.useFakeTimers();

    render(<ResumeCreationFlow userId="user-123" />);

    fireEvent.click(screen.getByText("Submit QA"));

    await waitFor(() => {
      expect(screen.getByText(/Error generating resume/)).toBeInTheDocument();
    });

    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(screen.getByTestId("resume-qa-form")).toBeInTheDocument();
    });
    jest.useRealTimers();
  });

  it("saves resume when accepted", async () => {
    jest.useFakeTimers();
    mockGenerateResumeContent.mockResolvedValue({
      enhancedSummary: "Enhanced Summary",
      skillSuggestions: ["Node.js"],
      enhancedExperience: [],
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ resumeId: "new-resume-id" }),
    });

    render(
      <ResumeCreationFlow userId="user-123" onComplete={mockOnComplete} />
    );

    fireEvent.click(screen.getByText("Submit QA"));

    await waitFor(() => {
      expect(screen.getByTestId("resume-review-modal")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Accept"));

    expect(screen.getByText(/Saving to your profile/)).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/resumes/create",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("user-123"),
        })
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Resume created successfully/)
      ).toBeInTheDocument();
    });

    // Advance timers to trigger onComplete
    jest.advanceTimersByTime(2000);

    expect(mockOnComplete).toHaveBeenCalledWith("new-resume-id");
    jest.useRealTimers();
  });

  it("handles rewrite request", async () => {
    mockGenerateResumeContent
      .mockResolvedValueOnce({
        enhancedSummary: "Initial Summary",
        skillSuggestions: [],
        enhancedExperience: [],
      })
      .mockResolvedValueOnce({
        enhancedSummary: "Rewritten Summary",
        skillSuggestions: [],
        enhancedExperience: [],
      });

    render(<ResumeCreationFlow userId="user-123" />);

    fireEvent.click(screen.getByText("Submit QA"));

    await waitFor(() => {
      expect(screen.getByTestId("resume-review-modal")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Rewrite"));

    expect(screen.getByText(/Regenerating resume/)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockGenerateResumeContent).toHaveBeenCalledTimes(2);
      // Verify the second call (rewrite) uses the correct data
      expect(mockGenerateResumeContent).toHaveBeenLastCalledWith(
        expect.objectContaining({
          personalInfo: expect.objectContaining({
            name: "John Doe",
          }),
          skills: ["React", "TypeScript"],
        }),
        "modern",
        "professional"
      );
    });
  });

  it("handles QA completion with edge case values", async () => {
    mockGenerateResumeContent.mockResolvedValue({
      enhancedSummary: "Enhanced Summary",
      skillSuggestions: ["Node.js"],
      enhancedExperience: [],
    });

    render(<ResumeCreationFlow userId="user-123" />);

    fireEvent.click(screen.getByText("Submit QA Edge Cases"));

    await waitFor(() => {
      expect(mockGenerateResumeContent).toHaveBeenCalledWith(
        expect.objectContaining({
          personalInfo: expect.objectContaining({
            name: "John,Doe", // String representation of array
            email: "", // Fallback for null email
          }),
          skills: ["React", "TypeScript"], // Parsed from string
          summary: "", // Fallback for null summary
        }),
        "modern",
        "professional"
      );
    });
  });

  it("handles save failure", async () => {
    mockGenerateResumeContent.mockResolvedValue({
      enhancedSummary: "Enhanced Summary",
      skillSuggestions: [],
      enhancedExperience: [],
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Save failed" }),
    });

    render(<ResumeCreationFlow userId="user-123" />);

    fireEvent.click(screen.getByText("Submit QA"));

    await waitFor(() => {
      expect(screen.getByTestId("resume-review-modal")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Accept"));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Save failed");
    });
  });

  it("handles max retries", async () => {
    mockGenerateResumeContent.mockResolvedValue({
      enhancedSummary: "Summary",
      skillSuggestions: [],
      enhancedExperience: [],
    });

    render(<ResumeCreationFlow userId="user-123" />);

    fireEvent.click(screen.getByText("Submit QA"));

    await waitFor(() => {
      expect(screen.getByTestId("resume-review-modal")).toBeInTheDocument();
    });

    // Retry 5 times
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByText("Rewrite"));
      await waitFor(() => {
        expect(mockGenerateResumeContent).toHaveBeenCalledTimes(i + 2); // +1 for initial
      });
    }

    // 6th retry should fail
    fireEvent.click(screen.getByText("Rewrite"));
    expect(global.alert).toHaveBeenCalledWith(
      "Maximum rewrites reached. Please accept this version."
    );
  });

  it("handles regeneration failure", async () => {
    mockGenerateResumeContent
      .mockResolvedValueOnce({
        enhancedSummary: "Initial",
        skillSuggestions: [],
        enhancedExperience: [],
      })
      .mockRejectedValueOnce(new Error("Regen failed"));

    render(<ResumeCreationFlow userId="user-123" />);

    fireEvent.click(screen.getByText("Submit QA"));

    await waitFor(() => {
      expect(screen.getByTestId("resume-review-modal")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Rewrite"));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        "Failed to regenerate resume. Please try again."
      );
    });
  });

  it("handles null result from regeneration", async () => {
    mockGenerateResumeContent
      .mockResolvedValueOnce({
        enhancedSummary: "Initial",
        skillSuggestions: [],
        enhancedExperience: [],
      })
      .mockResolvedValueOnce(null);

    render(<ResumeCreationFlow userId="user-123" />);

    fireEvent.click(screen.getByText("Submit QA"));

    await waitFor(() => {
      expect(screen.getByTestId("resume-review-modal")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Rewrite"));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        "Failed to regenerate resume. Please try again."
      );
    });
  });

  it("handles null result from generation", async () => {
    mockGenerateResumeContent.mockResolvedValue(null);

    render(<ResumeCreationFlow userId="user-123" />);

    fireEvent.click(screen.getByText("Submit QA"));

    await waitFor(() => {
      expect(screen.getByText(/Error generating resume/)).toBeInTheDocument();
    });
  });

  it("handles name fallback", async () => {
    mockGenerateResumeContent.mockResolvedValue({
      enhancedSummary: "Summary",
      skillSuggestions: [],
      enhancedExperience: [],
    });

    render(<ResumeCreationFlow userId="user-123" />);

    fireEvent.click(screen.getByText("Submit Empty Name"));

    await waitFor(() => {
      expect(screen.getByTestId("resume-review-modal")).toBeInTheDocument();
      // Check fallback title
      expect(screen.getByText("Professional's Resume")).toBeInTheDocument();
    });
  });

  it("handles cancel from QA form", () => {
    render(<ResumeCreationFlow userId="user-123" />);
    fireEvent.click(screen.getByText("Cancel QA"));
    expect(screen.getByTestId("resume-qa-form")).toBeInTheDocument();
  });
});
