import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { ResumeCreationFlow } from "@/components/ResumeCreationFlow";
import { useAIResume } from "@/hooks/useAIResume";
import {
  MockResumeGenerationLoader,
  MockResumeReviewModal,
} from "../__support__/resumeMocks";

// Mock hooks and components
jest.mock("@/hooks/useAIResume");
jest.mock("@/components/ResumeGenerationLoader", () => ({
  ResumeGenerationLoader: (props: Record<string, unknown>) => (
    <MockResumeGenerationLoader {...props} />
  ),
}));
jest.mock("@/components/ResumeReviewModal", () => ({
  ResumeReviewModal: (props: Record<string, unknown>) => (
    <MockResumeReviewModal {...props} />
  ),
}));

// Custom mock for ResumeQAForm to allow controlling the submitted data
let mockOnCompleteCallback:
  | ((data: Record<string, unknown>) => Promise<void> | void)
  | null = null;

jest.mock("@/components/ResumeQAForm", () => ({
  ResumeQAForm: ({
    onComplete,
  }: {
    onComplete: (data: Record<string, unknown>) => Promise<void> | void;
  }) => {
    mockOnCompleteCallback = onComplete;
    return <div data-testid="resume-qa-form">QA Form</div>;
  },
}));

describe("Resume Generation Integration Flow", () => {
  const mockGenerateResumeContent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnCompleteCallback = null;
    (useAIResume as jest.Mock).mockReturnValue({
      generateResumeContent: mockGenerateResumeContent,
      loading: false,
    });
  });

  it("passes complex resume data and preferences to the AI generator", async () => {
    // 1. Setup complex input data (simulating "Import LinkedIn" result)
    const complexResumeData = {
      name: "Jane Engineer",
      email: "jane@tech.com",
      location: "San Francisco, CA",
      linkedin: "https://linkedin.com/in/jane",
      summary: "Senior Software Engineer with 10 years of experience.",
      skills: ["React", "Node.js", "AWS", "System Design"],
      // Preferences
      preferences_template: "technical",
      preferences_tone: "concise",
      // Experience fields (simulating flat structure from form)
      experience_count: "2",
      experience_1_title: "Senior Developer",
      experience_1_company: "Tech Corp",
      experience_1_duration: "2020-Present",
      experience_1_description: "Led team of 5.",
      experience_2_title: "Junior Developer",
      experience_2_company: "Startup Inc",
      experience_2_duration: "2018-2020",
      experience_2_description: "Built features.",
    };

    // 2. Mock AI response
    mockGenerateResumeContent.mockResolvedValue({
      enhancedSummary: "Enhanced Summary",
      skillSuggestions: ["Kubernetes"],
      enhancedExperience: [
        {
          company: "Tech Corp",
          title: "Senior Developer",
          duration: "2020-Present",
          enhancedDescription: "Led team of 5.",
        },
        {
          company: "Startup Inc",
          title: "Junior Developer",
          duration: "2018-2020",
          enhancedDescription: "Built features.",
        },
      ],
    });

    // 3. Render the flow
    render(<ResumeCreationFlow userId="user-123" />);

    // 4. Verify QA form is rendered
    expect(screen.getByTestId("resume-qa-form")).toBeInTheDocument();

    // 5. Submit the form with complex data
    expect(mockOnCompleteCallback).not.toBeNull();
    await act(async () => {
      if (mockOnCompleteCallback) {
        await mockOnCompleteCallback(complexResumeData);
      }
    });

    // 6. Verify AI hook was called with correct transformed data and preferences
    await waitFor(() => {
      expect(mockGenerateResumeContent).toHaveBeenCalledWith(
        expect.objectContaining({
          personalInfo: expect.objectContaining({
            name: "Jane Engineer",
            email: "jane@tech.com",
            location: "San Francisco, CA",
            linkedin: "https://linkedin.com/in/jane",
          }),
          skills: ["React", "Node.js", "AWS", "System Design"],
          summary: "Senior Software Engineer with 10 years of experience.",
        }),
        "technical", // Template preference
        "concise", // Tone preference
        undefined, // Model ID (auto-select)
        "standard", // Mode
      );
    });

    // 7. Verify Review Modal appears
    await waitFor(() =>
      expect(screen.getByTestId("resume-review-modal")).toBeInTheDocument(),
    );
  });

  it("uses default preferences if not provided", async () => {
    const simpleData = {
      name: "John Doe",
      skills: ["Java"],
    };

    mockGenerateResumeContent.mockResolvedValue({
      enhancedSummary: "Summary",
      skillSuggestions: [],
      enhancedExperience: [],
    });

    render(<ResumeCreationFlow userId="user-123" />);

    await act(async () => {
      if (mockOnCompleteCallback) {
        await mockOnCompleteCallback(simpleData);
      }
    });

    await waitFor(() => {
      expect(mockGenerateResumeContent).toHaveBeenCalledWith(
        expect.anything(),
        "modern", // Default template
        "professional", // Default tone
        undefined, // Model ID (auto-select)
        "standard", // Default mode
      );
    });
  });
});
