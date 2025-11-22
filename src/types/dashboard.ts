// src/types/dashboard.ts

export interface JobSeekerMetrics {
  profileViews: number;
  contactRequests: number;
  downloads: number;
  quality: number;
  lastUpdated: string | null;
}

export interface RecruiterAccessBreakdown {
  pending: number;
  approved: number;
  denied: number;
}

export interface RecruiterMetrics {
  totalSearches: number;
  totalProfileViews: number;
  totalCandidatesInteracted: number;
  accessRequests: RecruiterAccessBreakdown;
  lastActivityAt: string | null;
}

export type ActionStatus =
  | "blocked"
  | "notStarted"
  | "inProgress"
  | "completed";
export type ActionPriority = "high" | "medium" | "low";

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  status: ActionStatus;
  priority: ActionPriority;
  meta?: string;
  cta?: {
    label: string;
    href?: string;
    onClick?: () => void;
    target?: "_blank" | "_self" | "_parent" | "_top";
  };
}

export type InsightTone = "positive" | "caution" | "info";

export interface OpportunityInsight {
  id: string;
  title: string;
  metricLabel: string;
  metricValue: string;
  description: string;
  tone: InsightTone;
}
