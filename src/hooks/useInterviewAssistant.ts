/**
 * useInterviewAssistant Hook
 * Manages interview session state and interactions
 */

"use client";

import { useState, useCallback } from "react";
import {
  InterviewSession,
  InterviewTips,
} from "@/lib/interviewAssistant.types";
import {
  createInterviewSession,
  submitAnswer,
  completeSession,
  getInterviewTips,
  getNextQuestion,
} from "@/lib/interviewSession";

interface UseInterviewAssistantState {
  session: InterviewSession | null;
  currentQuestionIndex: number;
  loading: boolean;
  error: string | null;
  tips: InterviewTips | null;
}

export function useInterviewAssistant() {
  const [state, setState] = useState<UseInterviewAssistantState>({
    session: null,
    currentQuestionIndex: -1,
    loading: false,
    error: null,
    tips: null,
  });

  const startSession = useCallback(
    (
      userId: string,
      jobTitle: string,
      jobDescription?: string,
      companyName?: string,
      numberOfQuestions?: number
    ) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const newSession = createInterviewSession(
          userId,
          jobTitle,
          jobDescription,
          companyName,
          numberOfQuestions
        );

        const tips = getInterviewTips(jobTitle);

        setState((prev) => ({
          ...prev,
          session: newSession,
          currentQuestionIndex: 0,
          tips,
          loading: false,
        }));

        return newSession;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to start session";
        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
        throw err;
      }
    },
    []
  );

  const answerQuestion = useCallback(
    (answer: string, duration: number) => {
      if (!state.session || state.currentQuestionIndex < 0) {
        setState((prev) => ({
          ...prev,
          error: "No active session",
        }));
        return;
      }

      try {
        const interviewAnswer = submitAnswer(
          state.session,
          state.currentQuestionIndex,
          answer,
          duration
        );

        const newAnswers = [...state.session.answers, interviewAnswer];

        const nextQuestionResponse = getNextQuestion(
          state.session,
          state.currentQuestionIndex
        );

        let updatedSession = {
          ...state.session,
          answers: newAnswers,
        };

        if (nextQuestionResponse.sessionStatus === "completed") {
          updatedSession = completeSession(updatedSession, newAnswers);
        }

        setState((prev) => ({
          ...prev,
          session: updatedSession,
          currentQuestionIndex: nextQuestionResponse.currentQuestionIndex,
          error: null,
        }));

        return {
          isComplete: nextQuestionResponse.sessionStatus === "completed",
          nextQuestion: nextQuestionResponse.nextQuestion,
          sessionScore: updatedSession.score,
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to submit answer";
        setState((prev) => ({
          ...prev,
          error: errorMessage,
        }));
        throw err;
      }
    },
    [state.session, state.currentQuestionIndex]
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const resetSession = useCallback(() => {
    setState({
      session: null,
      currentQuestionIndex: -1,
      loading: false,
      error: null,
      tips: null,
    });
  }, []);

  const endSession = useCallback(() => {
    if (state.session && state.session.status === "in-progress") {
      const finalSession = completeSession(
        state.session,
        state.session.answers
      );
      setState((prev) => ({
        ...prev,
        session: finalSession,
      }));
    }
  }, [state.session]);

  return {
    session: state.session,
    currentQuestionIndex: state.currentQuestionIndex,
    loading: state.loading,
    error: state.error,
    tips: state.tips,
    startSession,
    answerQuestion,
    clearError,
    resetSession,
    endSession,
  };
}
