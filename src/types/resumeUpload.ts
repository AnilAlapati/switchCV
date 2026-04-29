import type { ResumeDataRequirements } from "@/lib/services/conversationManager";

export type ResumeUploadSourceChannel = "pdf" | "docx" | "paste";
export type ResumeUploadExtractionMethod = "ai" | "regex";

export interface ResumeUploadDraft {
  sourceChannel: ResumeUploadSourceChannel;
  fileName: string;
  extractedData: Partial<ResumeDataRequirements>;
  extractedFields: string[];
  missingFields: string[];
  extractionMethod: ResumeUploadExtractionMethod;
  latencyMs?: number;
}

export interface ResumeUploadExtractionResponse {
  uploadDraft: ResumeUploadDraft;
}
