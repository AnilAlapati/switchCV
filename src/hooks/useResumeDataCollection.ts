import { logger } from "@/lib/logger";
// src/hooks/useResumeDataCollection.ts
import { useState, useEffect, useCallback } from "react";

export type ConversationStage =
  | "initial"
  | "job_target"
  | "experience"
  | "skills"
  | "education"
  | "personal"
  | "generating"
  | "complete";

export interface ResumeData {
  jobTarget?: string;
  experience?: string;
  skills?: string;
  education?: string;
  personalInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
}

const STORAGE_KEY = "switchcv_conversation_session";

const getStoredSession = (): {
  stage: ConversationStage;
  resumeData: ResumeData;
} | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const saveSession = (stage: ConversationStage, resumeData: ResumeData) => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ stage, resumeData }));
  } catch {
    logger.warn("Failed to save conversation session");
  }
};

export const useResumeDataCollection = () => {
  const stored = getStoredSession();
  const [stage, setStageState] = useState<ConversationStage>(
    stored?.stage || "initial"
  );
  const [resumeData, setResumeDataState] = useState<ResumeData>(
    stored?.resumeData || {}
  );

  // Auto-save to sessionStorage whenever stage or resumeData changes
  useEffect(() => {
    saveSession(stage, resumeData);
  }, [stage, resumeData]);

  const setStage = useCallback((nextStage: ConversationStage) => {
    setStageState(nextStage);
  }, []);

  const advanceStage = useCallback((nextStage: ConversationStage) => {
    setStageState(nextStage);
  }, []);

  const setResumeData = useCallback((
    updates: ResumeData | ((prev: ResumeData) => ResumeData)
  ) => {
    setResumeDataState(updates);
  }, []);

  const updateResumeData = useCallback((updates: Partial<ResumeData>) => {
    setResumeDataState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetCollection = useCallback(() => {
    setStageState("initial");
    setResumeDataState({});
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return {
    stage,
    setStage,
    resumeData,
    setResumeData,
    advanceStage,
    updateResumeData,
    resetCollection,
  };
};
