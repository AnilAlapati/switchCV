import { renderHook, act } from "@testing-library/react";
import { useInterviewAssistant } from "../../hooks/useInterviewAssistant";
import * as interviewSessionLib from "@/lib/interviewSession";

// Mock dependencies
jest.mock("@/lib/interviewSession");

describe("useInterviewAssistant", () => {
  const mockSession = {
    id: "session123",
    userId: "user1",
    jobTitle: "Developer",
    status: "in-progress",
    questions: [],
    answers: [],
    startTime: new Date(),
    score: 0,
  };

  const mockTips = {
    general: ["Tip 1"],
    technical: ["Tech Tip 1"],
    behavioral: ["Beh Tip 1"],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useInterviewAssistant());

    expect(result.current.session).toBeNull();
    expect(result.current.currentQuestionIndex).toBe(-1);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.tips).toBeNull();
  });

  it("should start session successfully", () => {
    (interviewSessionLib.createInterviewSession as jest.Mock).mockReturnValue(
      mockSession
    );
    (interviewSessionLib.getInterviewTips as jest.Mock).mockReturnValue(
      mockTips
    );

    const { result } = renderHook(() => useInterviewAssistant());

    act(() => {
      result.current.startSession("user1", "Developer");
    });

    expect(result.current.session).toEqual(mockSession);
    expect(result.current.tips).toEqual(mockTips);
    expect(result.current.currentQuestionIndex).toBe(0);
    expect(result.current.loading).toBe(false);
    expect(interviewSessionLib.createInterviewSession).toHaveBeenCalledWith(
      "user1",
      "Developer",
      undefined,
      undefined,
      undefined
    );
  });

  it("should handle start session error", () => {
    (
      interviewSessionLib.createInterviewSession as jest.Mock
    ).mockImplementation(() => {
      throw new Error("Start failed");
    });

    const { result } = renderHook(() => useInterviewAssistant());

    act(() => {
      try {
        result.current.startSession("user1", "Developer");
      } catch {
        // Expected error
      }
    });

    expect(result.current.error).toBe("Start failed");
    expect(result.current.loading).toBe(false);
  });

  it("should answer question successfully", () => {
    const { result } = renderHook(() => useInterviewAssistant());

    // Setup active session
    (interviewSessionLib.createInterviewSession as jest.Mock).mockReturnValue(
      mockSession
    );
    (interviewSessionLib.getInterviewTips as jest.Mock).mockReturnValue(
      mockTips
    );
    act(() => {
      result.current.startSession("user1", "Developer");
    });

    const mockAnswer = {
      questionId: "q1",
      answer: "My answer",
      duration: 10,
      score: 8,
      feedback: "Good",
    };
    const mockNextQuestionResponse = {
      sessionStatus: "in-progress",
      currentQuestionIndex: 1,
      nextQuestion: { id: "q2", text: "Next Q" },
    };

    (interviewSessionLib.submitAnswer as jest.Mock).mockReturnValue(mockAnswer);
    (interviewSessionLib.getNextQuestion as jest.Mock).mockReturnValue(
      mockNextQuestionResponse
    );

    let answerResult: unknown;
    act(() => {
      answerResult = result.current.answerQuestion("My answer", 10);
    });

    expect(answerResult).toEqual({
      isComplete: false,
      nextQuestion: mockNextQuestionResponse.nextQuestion,
      sessionScore: 0,
    });
    expect(result.current.currentQuestionIndex).toBe(1);
    expect(interviewSessionLib.submitAnswer).toHaveBeenCalled();
  });

  it("should handle answer question error", () => {
    const { result } = renderHook(() => useInterviewAssistant());

    // Setup active session
    (interviewSessionLib.createInterviewSession as jest.Mock).mockReturnValue(
      mockSession
    );
    act(() => {
      result.current.startSession("user1", "Developer");
    });

    (interviewSessionLib.submitAnswer as jest.Mock).mockImplementation(() => {
      throw new Error("Submit failed");
    });

    act(() => {
      try {
        result.current.answerQuestion("My answer", 10);
      } catch {
        // Expected
      }
    });

    expect(result.current.error).toBe("Submit failed");
  });

  it("should fail to answer if no session", () => {
    const { result } = renderHook(() => useInterviewAssistant());

    act(() => {
      result.current.answerQuestion("My answer", 10);
    });

    expect(result.current.error).toBe("No active session");
  });

  it("should complete session when answering last question", () => {
    const { result } = renderHook(() => useInterviewAssistant());

    // Setup active session
    (interviewSessionLib.createInterviewSession as jest.Mock).mockReturnValue(
      mockSession
    );
    act(() => {
      result.current.startSession("user1", "Developer");
    });

    const mockAnswer = {
      questionId: "q1",
      answer: "My answer",
      duration: 10,
      score: 8,
      feedback: "Good",
    };
    const mockNextQuestionResponse = {
      sessionStatus: "completed",
      currentQuestionIndex: 1,
      nextQuestion: null,
    };
    const mockCompletedSession = { ...mockSession, status: "completed" };

    (interviewSessionLib.submitAnswer as jest.Mock).mockReturnValue(mockAnswer);
    (interviewSessionLib.getNextQuestion as jest.Mock).mockReturnValue(
      mockNextQuestionResponse
    );
    (interviewSessionLib.completeSession as jest.Mock).mockReturnValue(
      mockCompletedSession
    );

    let answerResult: unknown;
    act(() => {
      answerResult = result.current.answerQuestion("My answer", 10);
    });

    if (!answerResult) throw new Error("answerResult is undefined");

    expect(answerResult.isComplete).toBe(true);
    expect(result.current.session).toEqual(mockCompletedSession);
  });

  it("should reset session", () => {
    const { result } = renderHook(() => useInterviewAssistant());

    // Setup active session
    (interviewSessionLib.createInterviewSession as jest.Mock).mockReturnValue(
      mockSession
    );
    act(() => {
      result.current.startSession("user1", "Developer");
    });

    act(() => {
      result.current.resetSession();
    });

    expect(result.current.session).toBeNull();
    expect(result.current.currentQuestionIndex).toBe(-1);
  });

  it("should clear error", () => {
    const { result } = renderHook(() => useInterviewAssistant());

    // Force error
    act(() => {
      result.current.answerQuestion("My answer", 10);
    });
    expect(result.current.error).toBe("No active session");

    act(() => {
      result.current.clearError();
    });
    expect(result.current.error).toBeNull();
  });

  it("should end session manually", () => {
    const { result } = renderHook(() => useInterviewAssistant());

    // Setup active session
    (interviewSessionLib.createInterviewSession as jest.Mock).mockReturnValue(
      mockSession
    );
    act(() => {
      result.current.startSession("user1", "Developer");
    });

    const mockCompletedSession = { ...mockSession, status: "completed" };
    (interviewSessionLib.completeSession as jest.Mock).mockReturnValue(
      mockCompletedSession
    );

    act(() => {
      result.current.endSession();
    });

    expect(result.current.session).toEqual(mockCompletedSession);
  });
});
