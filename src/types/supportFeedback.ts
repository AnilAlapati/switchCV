import type {
  FeedbackCategory,
  FeedbackUrgency,
} from "@/config/supportFeedback";

export interface SupportFeedbackPayload {
  name?: string;
  email: string;
  message: string;
  category?: FeedbackCategory;
  urgency?: FeedbackUrgency;
  allowContact?: boolean;
  pageContext?: string;
}

export interface SupportFeedbackMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
  // Authenticated user info (optional - only present if user is logged in)
  authenticatedUser?: {
    uid: string;
    email?: string | null;
    displayName?: string | null;
  } | null;
}

export interface SupportFeedbackResult {
  success: boolean;
  referenceId: string;
  deliveredTo: string;
  simulated?: boolean;
}
