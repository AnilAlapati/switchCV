/**
 * Shared types for the resume generation orchestrators (v2 sync and v3 function-calling).
 *
 * Extracted from resumeGenerationOrchestrator.ts to keep each orchestrator file
 * focused on its pipeline logic rather than type declarations.
 */

import type { ConversationProgress } from "@/lib/services/conversationManager";
import type {
  GeneratedResumeInput,
  GenerationQualityReport,
} from "@/lib/services/resumeService";
import type { SubscriptionTier } from "@/lib/config";

export interface ConversationEntry {
  id?: string;
  content: string;
  isUser: boolean;
  timestamp?: string;
}

export interface SessionData {
  collectedData?: Record<string, unknown>;
  progress?: Record<string, unknown>;
}

export interface SyncGenerationInput {
  userId: string;
  message: string;
  conversationHistory: ConversationEntry[];
  sessionData?: SessionData;
  modelId?: string;
  userTier: SubscriptionTier;
  strictMode?: boolean;
  desiredStyle?: "professional" | "executive" | "innovator";
  inputSources?: Array<"chat" | "paste" | "pdf" | "docx">;
  persistResult?: boolean;
  requestId?: string;
  sessionId?: string;
  entrypoint?: string;
}

export interface SyncGenerationResult {
  requestId: string;
  response?: string;
  model?: string;
  resumeId?: string;
  numericId?: number;
  created?: boolean;
  progress: number;
  sessionData?: {
    collectedData: Record<string, unknown>;
    progress: ConversationProgress;
  };
  qualityReport?: GenerationQualityReport;
  needsClarification?: boolean;
  missingEvidenceFields?: string[];
  clarificationChecklist?: string[];
  previewData?: GeneratedResumeInput;
  evidenceMap?: Record<string, string[]>;
}
