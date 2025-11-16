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

describe("useInterviewScheduling", () => {
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
});
