// src/hooks/useResumeDataCollection.ts
import { useState, useEffect } from "react";

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
    console.warn("Failed to save conversation session");
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

  const setStage = (nextStage: ConversationStage) => {
    setStageState(nextStage);
  };

  const advanceStage = (nextStage: ConversationStage) => {
    setStage(nextStage);
  };

  const setResumeData = (
    updates: ResumeData | ((prev: ResumeData) => ResumeData)
  ) => {
    setResumeDataState(updates);
  };

  const updateResumeData = (updates: Partial<ResumeData>) => {
    setResumeData((prev) => ({ ...prev, ...updates }));
  };

  const resetCollection = () => {
    setStage("initial");
    setResumeData({});
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  };

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
