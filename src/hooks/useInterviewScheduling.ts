/**
 * useInterviewScheduling Hook
 * State management for interview scheduling and feedback
 */

import { useState, useCallback } from "react";
import {
  Interview,
  InterviewType,
  InterviewStatus,
  InterviewFeedback,
} from "@/lib/recruiterDashboard.types";
import {
  scheduleInterview,
  getUpcomingInterviews,
} from "@/lib/recruiterPipeline";

interface UseInterviewSchedulingReturn {
  interviews: Interview[];
  upcomingInterviews: Interview[];
  loading: boolean;
  error: string | null;
  scheduleNewInterview: (
    candidateId: string,
    jobId: string,
    type: InterviewType,
    scheduledTime: Date,
    duration: number,
    interviewers: string[]
  ) => void;
  getUpcoming: (days?: number) => void;
  updateInterviewStatus: (interviewId: string, status: InterviewStatus) => void;
  addFeedback: (interviewId: string, feedback: InterviewFeedback) => void;
  rescheduleInterview: (interviewId: string, newTime: Date) => void;
  cancelInterview: (interviewId: string, reason?: string) => void;
}

/**
 * Hook for managing interview scheduling and feedback
 */
export function useInterviewScheduling(): UseInterviewSchedulingReturn {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scheduleNewInterview = useCallback(
    (
      candidateId: string,
      jobId: string,
      type: InterviewType,
      scheduledTime: Date,
      duration: number,
      interviewers: string[]
    ) => {
      try {
        setLoading(true);
        const interview = scheduleInterview(
          candidateId,
          jobId,
          type,
          scheduledTime,
          duration,
          interviewers
        );

        setInterviews((prev) => [...prev, interview]);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to schedule interview"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getUpcoming = useCallback(
    (days: number = 7) => {
      try {
        setLoading(true);
        const upcoming = getUpcomingInterviews(interviews, days);
        setUpcomingInterviews(upcoming);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch upcoming interviews"
        );
      } finally {
        setLoading(false);
      }
    },
    [interviews]
  );

  const updateInterviewStatus = useCallback(
    (interviewId: string, status: InterviewStatus) => {
      try {
        setLoading(true);
        setInterviews((prev) =>
          prev.map((i) =>
            i.id === interviewId ? { ...i, status, updatedAt: new Date() } : i
          )
        );
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to update interview status"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const addFeedback = useCallback(
    (interviewId: string, feedback: InterviewFeedback) => {
      try {
        setLoading(true);
        setInterviews((prev) =>
          prev.map((i) =>
            i.id === interviewId
              ? {
                  ...i,
                  feedback,
                  status: InterviewStatus.COMPLETED,
                  updatedAt: new Date(),
                }
              : i
          )
        );
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add feedback");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const rescheduleInterview = useCallback(
    (interviewId: string, newTime: Date) => {
      try {
        setLoading(true);
        setInterviews((prev) =>
          prev.map((i) =>
            i.id === interviewId
              ? {
                  ...i,
                  scheduledTime: newTime,
                  status: InterviewStatus.RESCHEDULED,
                  updatedAt: new Date(),
                }
              : i
          )
        );
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to reschedule interview"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const cancelInterview = useCallback(
    (interviewId: string, reason?: string) => {
      try {
        setLoading(true);
        setInterviews((prev) =>
          prev.map((i) =>
            i.id === interviewId
              ? {
                  ...i,
                  status: InterviewStatus.CANCELLED,
                  notes:
                    (i.notes || "") +
                    (reason ? `\nCancellation reason: ${reason}` : ""),
                  updatedAt: new Date(),
                }
              : i
          )
        );
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to cancel interview"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    interviews,
    upcomingInterviews,
    loading,
    error,
    scheduleNewInterview,
    getUpcoming,
    updateInterviewStatus,
    addFeedback,
    rescheduleInterview,
    cancelInterview,
  };
}
