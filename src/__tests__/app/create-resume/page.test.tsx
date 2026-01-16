import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CreateResume from "@/app/create-resume/page";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useTier } from "@/hooks/useTier";
import { useUserProfile } from "@/hooks/useUserProfile";
import { getVerificationRoute } from "@/lib/config";

// Mock hooks
jest.mock("@/hooks/useAuth");
jest.mock("@/hooks/useTier");
jest.mock("@/hooks/useUserProfile", () => ({
  useUserProfile: jest.fn(() => ({ role: "jobseeker", loading: false })),
}));
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock components
jest.mock("@/components/create-resume/CreateResumeHeader", () => ({
  CreateResumeHeader: () => <div data-testid="create-resume-header" />,
}));
jest.mock("@/components/create-resume/CreateResumeInputForm", () => ({
  CreateResumeInputForm: ({ onInputChange, onSubmit, currentInput }: { onInputChange: (value: string) => void; onSubmit: () => void; currentInput: string }) => (
    <form onSubmit={onSubmit} data-testid="input-form">
      <input
        value={currentInput}
        onChange={(e) => onInputChange(e.target.value)}
        data-testid="chat-input"
      />
      <button type="submit">Send</button>
    </form>
  ),
}));
jest.mock("@/components/create-resume/AILoadingState", () => ({
  AILoadingState: ({ aiLoading, aiError }: { aiLoading: boolean; aiError: string | null }) => (
    <div data-testid="ai-loading-state">
      {aiLoading && "Loading..."}
      {aiError && `Error: ${aiError}`}
    </div>
  ),
}));
jest.mock("@/components/create-resume/ResumeProgress", () => ({
  ResumeProgress: ({ progress }: { progress: number }) => (
    <div data-testid="resume-progress">{progress}%</div>
  ),
}));

describe("CreateResume Page", () => {
  const mockRouter = { push: jest.fn() };
  const mockUser = {
    uid: "test-user-id",
    getIdToken: jest.fn().mockResolvedValue("mock-token"),
  };
  const VERIFICATION_ROUTE = getVerificationRoute();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });
    (useTier as jest.Mock).mockReturnValue({
      isPremiumOrHigher: false,
      loading: false,
    });
    (useUserProfile as jest.Mock).mockReturnValue({
      role: "jobseeker",
      loading: false,
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ connected: true }),
    });
  });

  it("redirects to auth if user is not logged in", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    render(<CreateResume />);
    expect(mockRouter.push).toHaveBeenCalledWith(VERIFICATION_ROUTE);
  });

  it("shows loading state when auth is loading", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: true,
    });

    render(<CreateResume />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders the chat interface when user is logged in", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ connected: true }),
    });

    render(<CreateResume />);

    expect(screen.getByTestId("create-resume-header")).toBeInTheDocument();
    expect(screen.getByText(/Your AI Career Agent/i)).toBeInTheDocument();
    expect(screen.getByTestId("input-form")).toBeInTheDocument();
  });

  it("handles user input and API submission", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ connected: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: "I can help with that.",
          sessionData: { progress: { collectedFields: [], missingFields: [] } },
          progress: 20,
        }),
      });

    render(<CreateResume />);

    const input = screen.getByTestId("chat-input");
    fireEvent.change(input, { target: { value: "I am a software engineer" } });
    fireEvent.submit(screen.getByTestId("input-form"));

    expect(screen.getByText("I am a software engineer")).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/resume/generate",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("I am a software engineer"),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText("I can help with that.")).toBeInTheDocument();
      const resumeProgressElements = screen.getAllByTestId("resume-progress");
      expect(resumeProgressElements[0]).toHaveTextContent("20%");
    });
  });

  it("handles API errors gracefully", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ connected: true }),
      })
      .mockRejectedValueOnce(new Error("API Error"));

    render(<CreateResume />);

    const input = screen.getByTestId("chat-input");
    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.submit(screen.getByTestId("input-form"));

    await waitFor(() => {
      expect(screen.getByText("Error: API Error")).toBeInTheDocument();
    });
  });

  it("redirects to resume page when generation is complete", async () => {
    jest.useFakeTimers();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ connected: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: "Resume complete!",
          resumeId: "new-resume-123",
          progress: 100,
        }),
      });

    render(<CreateResume />);

    const input = screen.getByTestId("chat-input");
    fireEvent.change(input, { target: { value: "Finish" } });
    fireEvent.submit(screen.getByTestId("input-form"));

    await waitFor(() => {
      expect(screen.getByText("Resume complete!")).toBeInTheDocument();
    });

    jest.advanceTimersByTime(2000);

    expect(mockRouter.push).toHaveBeenCalledWith("/resumes/new-resume-123");
    jest.useRealTimers();
  });
});
