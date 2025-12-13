/**
 * Tests for useInterviewScheduling Hook
 */

import { renderHook, act } from "@testing-library/react";
import { useInterviewScheduling } from "@/hooks/useInterviewScheduling";
import {
  InterviewType,
  InterviewStatus,
  FeedbackRating,
} from "@/lib/recruiterDashboard.types";

// Mock the recruiterPipeline functions
jest.mock("@/lib/recruiterPipeline", () => ({
  scheduleInterview: jest.fn(),
  getUpcomingInterviews: jest.fn(),
}));

import {
  scheduleInterview,
  getUpcomingInterviews,
} from "@/lib/recruiterPipeline";

const mockScheduleInterview = scheduleInterview as jest.MockedFunction<
  typeof scheduleInterview
>;
const mockGetUpcomingInterviews = getUpcomingInterviews as jest.MockedFunction<
  typeof getUpcomingInterviews
>;

describe("useInterviewScheduling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock implementations
    mockScheduleInterview.mockReturnValue({
      id: "interview_1",
      candidateId: "cand_1",
      jobId: "job_1",
      interviewType: InterviewType.VIDEO,
      scheduledTime: new Date(),
      duration: 60,
      interviewers: ["interviewer@example.com"],
      status: InterviewStatus.SCHEDULED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockGetUpcomingInterviews.mockReturnValue([]);
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useInterviewScheduling());

    expect(result.current.interviews).toHaveLength(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should schedule new interview", async () => {
    const { result } = renderHook(() => useInterviewScheduling());

    const scheduledTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await act(async () => {
      result.current.scheduleNewInterview(
        "cand_1",
        "job_1",
        InterviewType.VIDEO,
        scheduledTime,
        60,
        ["interviewer@example.com"]
      );
    });

    expect(result.current.interviews).toHaveLength(1);
  });

  it("should handle multiple interviews", async () => {
    const { result } = renderHook(() => useInterviewScheduling());

    const time1 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const time2 = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);

    await act(async () => {
      result.current.scheduleNewInterview(
        "cand_1",
        "job_1",
        InterviewType.PHONE,
        time1,
        30,
        ["int1@example.com"]
      );
      result.current.scheduleNewInterview(
        "cand_2",
        "job_1",
        InterviewType.VIDEO,
        time2,
        60,
        ["int2@example.com"]
      );
    });

    expect(result.current.interviews).toHaveLength(2);
  });

  it("should update interview status", async () => {
    const { result } = renderHook(() => useInterviewScheduling());

    const scheduledTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await act(async () => {
      result.current.scheduleNewInterview(
        "cand_1",
        "job_1",
        InterviewType.VIDEO,
        scheduledTime,
        60,
        ["interviewer@example.com"]
      );
    });

    const interviewId = result.current.interviews[0]?.id;

    if (interviewId) {
      await act(async () => {
        result.current.updateInterviewStatus(
          interviewId,
          InterviewStatus.COMPLETED
        );
      });
    }

    expect(result.current.error).toBeNull();
  });

  it("should get upcoming interviews", async () => {
    const { result } = renderHook(() => useInterviewScheduling());

    const futureTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await act(async () => {
      result.current.scheduleNewInterview(
        "cand_1",
        "job_1",
        InterviewType.VIDEO,
        futureTime,
        60,
        ["interviewer@example.com"]
      );
    });

    await act(async () => {
      result.current.getUpcoming();
    });

    expect(result.current.upcomingInterviews).toBeDefined();
  });

  it("should add interview feedback", async () => {
    const { result } = renderHook(() => useInterviewScheduling());

    const scheduledTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await act(async () => {
      result.current.scheduleNewInterview(
        "cand_1",
        "job_1",
        InterviewType.VIDEO,
        scheduledTime,
        60,
        ["interviewer@example.com"]
      );
    });

    const interviewId = result.current.interviews[0]?.id;

    if (interviewId) {
      await act(async () => {
        result.current.addFeedback(interviewId, {
          id: "feed_1",
          interviewId,
          candidateId: "cand_1",
          interviewerId: "user_1",
          interviewType: InterviewType.VIDEO,
          rating: FeedbackRating.EXCELLENT,
          strengths: ["Communication", "Technical skill"],
          weaknesses: [],
          comments: "Great candidate",
          recommendation: "move-forward",
          createdAt: new Date(),
        });
      });
    }

    expect(result.current.error).toBeNull();
  });

  it("should reschedule interview", async () => {
    const { result } = renderHook(() => useInterviewScheduling());

    const originalTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const newTime = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);

    await act(async () => {
      result.current.scheduleNewInterview(
        "cand_1",
        "job_1",
        InterviewType.VIDEO,
        originalTime,
        60,
        ["interviewer@example.com"]
      );
    });

    const interviewId = result.current.interviews[0]?.id;

    if (interviewId) {
      await act(async () => {
        result.current.rescheduleInterview(interviewId, newTime);
      });
    }

    expect(result.current.error).toBeNull();
  });

  describe("error handling", () => {
    it("should handle scheduleNewInterview error with Error instance", async () => {
      mockScheduleInterview.mockImplementation(() => {
        throw new Error("Scheduling failed");
      });

      const { result } = renderHook(() => useInterviewScheduling());

      const scheduledTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await act(async () => {
        result.current.scheduleNewInterview(
          "cand_1",
          "job_1",
          InterviewType.VIDEO,
          scheduledTime,
          60,
          ["interviewer@example.com"]
        );
      });

      expect(result.current.error).toBe("Scheduling failed");
      expect(result.current.interviews).toHaveLength(0);
    });

    it("should handle scheduleNewInterview error with non-Error", async () => {
      mockScheduleInterview.mockImplementation(() => {
        throw "String error";
      });

      const { result } = renderHook(() => useInterviewScheduling());

      const scheduledTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await act(async () => {
        result.current.scheduleNewInterview(
          "cand_1",
          "job_1",
          InterviewType.VIDEO,
          scheduledTime,
          60,
          ["interviewer@example.com"]
        );
      });

      expect(result.current.error).toBe("Failed to schedule interview");
    });

    it("should handle getUpcoming error with Error instance", async () => {
      mockGetUpcomingInterviews.mockImplementation(() => {
        throw new Error("Failed to fetch interviews");
      });

      const { result } = renderHook(() => useInterviewScheduling());

      await act(async () => {
        result.current.getUpcoming();
      });

      expect(result.current.error).toBe("Failed to fetch interviews");
    });

    it("should handle getUpcoming error with non-Error", async () => {
      mockGetUpcomingInterviews.mockImplementation(() => {
        throw "Network error";
      });

      const { result } = renderHook(() => useInterviewScheduling());

      await act(async () => {
        result.current.getUpcoming();
      });

      expect(result.current.error).toBe("Failed to fetch upcoming interviews");
    });

    it("should handle updateInterviewStatus without external errors", async () => {
      const { result } = renderHook(() => useInterviewScheduling());

      // First schedule an interview
      const scheduledTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await act(async () => {
        result.current.scheduleNewInterview(
          "cand_1",
          "job_1",
          InterviewType.VIDEO,
          scheduledTime,
          60,
          ["interviewer@example.com"]
        );
      });

      const interviewId = result.current.interviews[0]?.id;

      if (interviewId) {
        await act(async () => {
          result.current.updateInterviewStatus(
            interviewId,
            InterviewStatus.COMPLETED
          );
        });
      }

      expect(result.current.error).toBeNull();
      expect(result.current.interviews[0]?.status).toBe(
        InterviewStatus.COMPLETED
      );
    });

    it("should handle addFeedback without external errors", async () => {
      const { result } = renderHook(() => useInterviewScheduling());

      // First schedule an interview
      const scheduledTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await act(async () => {
        result.current.scheduleNewInterview(
          "cand_1",
          "job_1",
          InterviewType.VIDEO,
          scheduledTime,
          60,
          ["interviewer@example.com"]
        );
      });

      const interviewId = result.current.interviews[0]?.id;

      if (interviewId) {
        await act(async () => {
          result.current.addFeedback(interviewId, {
            id: "feed_1",
            interviewId,
            candidateId: "cand_1",
            interviewerId: "user_1",
            interviewType: InterviewType.VIDEO,
            rating: FeedbackRating.EXCELLENT,
            strengths: ["Communication"],
            weaknesses: [],
            comments: "Great candidate",
            recommendation: "move-forward",
            createdAt: new Date(),
          });
        });
      }

      expect(result.current.error).toBeNull();
      expect(result.current.interviews[0]?.status).toBe(
        InterviewStatus.COMPLETED
      );
      expect(result.current.interviews[0]?.feedback).toBeDefined();
    });

    it("should handle rescheduleInterview without external errors", async () => {
      const { result } = renderHook(() => useInterviewScheduling());

      const originalTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const newTime = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);

      await act(async () => {
        result.current.scheduleNewInterview(
          "cand_1",
          "job_1",
          InterviewType.VIDEO,
          originalTime,
          60,
          ["interviewer@example.com"]
        );
      });

      const interviewId = result.current.interviews[0]?.id;

      if (interviewId) {
        await act(async () => {
          result.current.rescheduleInterview(interviewId, newTime);
        });
      }

      expect(result.current.error).toBeNull();
      expect(result.current.interviews[0]?.status).toBe(
        InterviewStatus.RESCHEDULED
      );
      expect(result.current.interviews[0]?.scheduledTime).toEqual(newTime);
    });

    it("should handle cancelInterview without external errors", async () => {
      const { result } = renderHook(() => useInterviewScheduling());

      const scheduledTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await act(async () => {
        result.current.scheduleNewInterview(
          "cand_1",
          "job_1",
          InterviewType.VIDEO,
          scheduledTime,
          60,
          ["interviewer@example.com"]
        );
      });

      const interviewId = result.current.interviews[0]?.id;

      if (interviewId) {
        await act(async () => {
          result.current.cancelInterview(interviewId, "Not available");
        });
      }

      expect(result.current.error).toBeNull();
      expect(result.current.interviews[0]?.status).toBe(
        InterviewStatus.CANCELLED
      );
      expect(result.current.interviews[0]?.notes).toContain(
        "Cancellation reason: Not available"
      );
    });

    it("should handle cancelInterview without reason", async () => {
      const { result } = renderHook(() => useInterviewScheduling());

      const scheduledTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await act(async () => {
        result.current.scheduleNewInterview(
          "cand_1",
          "job_1",
          InterviewType.VIDEO,
          scheduledTime,
          60,
          ["interviewer@example.com"]
        );
      });

      const interviewId = result.current.interviews[0]?.id;

      if (interviewId) {
        await act(async () => {
          result.current.cancelInterview(interviewId);
        });
      }

      expect(result.current.error).toBeNull();
      expect(result.current.interviews[0]?.status).toBe(
        InterviewStatus.CANCELLED
      );
      expect(result.current.interviews[0]?.notes).toBe("");
    });
  });
});
