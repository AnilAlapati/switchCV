// src/hooks/useResumeDataCollection.ts
import { useState } from "react";

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

export const useResumeDataCollection = () => {
  const [stage, setStage] = useState<ConversationStage>("initial");
  const [resumeData, setResumeData] = useState<ResumeData>({});

  const advanceStage = (nextStage: ConversationStage) => {
    setStage(nextStage);
  };

  const updateResumeData = (updates: Partial<ResumeData>) => {
    setResumeData((prev) => ({ ...prev, ...updates }));
  };

  const resetCollection = () => {
    setStage("initial");
    setResumeData({});
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
