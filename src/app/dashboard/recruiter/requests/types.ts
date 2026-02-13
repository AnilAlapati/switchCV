import type { TimeState } from "@/lib/recruiterRequests/timeUtils";

export interface RecruiterRequest {
  id: string;
  candidateName: string;
  resumeTitle: string;
  resumeId: string;
  message: string;
  timestamp: string;
  status: "pending" | "approved" | "denied";
  approvedAt?: string | null;
  expiresAt?: string | null;
  grantedDuration?: {
    label?: string;
    durationMs?: number;
  } | null;
  isExpired?: boolean;
  timeRemainingMs?: number | null;
}

export interface DecoratedRequest extends RecruiterRequest {
  timeState: TimeState;
}

export type TabKey = "pending" | "active" | "history";

