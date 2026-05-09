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
  /** Truncated raw text extracted from the uploaded file (max 8 000 chars).
   * Stored on the resume document so the AI editor can refer back to the
   * original document content when the user clicks Edit. */
  rawText?: string;
}

export interface ResumeUploadExtractionResponse {
  uploadDraft: ResumeUploadDraft;
}
