interface SessionData {
  userId: string;
  currentQuestionId: string;
  answers: Record<string, string | string[] | number | boolean>;
  lastUpdated: string;
  completed: boolean;
}

const SESSION_STORAGE_KEY = "resume_creation_session";

import { logger } from "@/lib/logger";

export const saveSessionData = (
  userId: string,
  currentQuestionId: string,
  answers: Record<string, string | string[] | number | boolean>,
  completed: boolean = false
): void => {
  const sessionData: SessionData = {
    userId,
    currentQuestionId,
    answers,
    lastUpdated: new Date().toISOString(),
    completed,
  };

  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
  } catch (error) {
    logger.error({ err: error }, "Failed to save session data:");
  }
};

export const loadSessionData = (userId: string): SessionData | null => {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;

    const sessionData: SessionData = JSON.parse(stored);

    // Check if session belongs to current user and is not too old (24 hours)
    if (sessionData.userId !== userId) return null;

    const lastUpdated = new Date(sessionData.lastUpdated);
    const now = new Date();
    const hoursDiff =
      (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      clearSessionData();
      return null;
    }

    return sessionData;
  } catch (error) {
    logger.error({ err: error }, "Failed to load session data:");
    return null;
  }
};

export const clearSessionData = (): void => {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    logger.error({ err: error }, "Failed to clear session data:");
  }
};

export const updateAnswer = (
  questionId: string,
  answer: string | string[] | number | boolean
): void => {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return;

    const sessionData: SessionData = JSON.parse(stored);
    sessionData.answers[questionId] = answer;
    sessionData.lastUpdated = new Date().toISOString();

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
  } catch (error) {
    logger.error({ err: error }, "Failed to update answer:");
  }
};

export const getAnswer = (
  questionId: string
): string | string[] | number | boolean | null => {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;

    const sessionData: SessionData = JSON.parse(stored);
    return sessionData.answers[questionId] || null;
  } catch (error) {
    logger.error({ err: error }, "Failed to get answer:");
    return null;
  }
};
