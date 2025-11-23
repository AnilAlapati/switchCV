import type { DurationPreset, NormalizedDuration } from "@/lib/accessDuration";

export interface DashboardAccessRequest {
  id: string;
  fromUserName: string;
  message: string;
  timestamp: string;
  resumeId: string;
  resumeTitle: string;
  status: "pending" | "approved" | "denied";
  requestedDuration?: NormalizedDuration;
  grantedDuration?: NormalizedDuration;
  approvedAt?: string | null;
  expiresAt?: string | null;
}

export interface DurationFormState {
  preset: DurationPreset;
  customDays: number;
  error: string | null;
}
