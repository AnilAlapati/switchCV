// src/types/index.ts

export type Visibility = "public" | "masked" | "request";

export interface ContactInfo {
  email: { value: string; visibility: Visibility };
  phone: { value: string; visibility: Visibility };
}

export interface Skill {
  name: string;
  level: string;
  visibility: Visibility;
}

export interface Experience {
  company: string;
  role: string;
  startDate: string;
  endDate?: string;
  description: string;
  visibility: Visibility;
}

export interface Education {
  institution: string;
  degree: string;
  startDate: string;
  endDate?: string;
  description?: string;
  visibility: Visibility;
}

export interface Project {
  name: string;
  url?: string;
  description: string;
  visibility: Visibility;
}

export interface TemplateField {
  id: string;
  label: string;
  type: "text" | "textarea" | "list" | "complex_list";
  required: boolean;
  description: string;
  placeholder?: string;
}

export interface TemplateSection {
  id: string;
  title: string;
  fields: TemplateField[];
  order: number;
}

export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  sections: TemplateSection[];
}

export interface ResumeProfile {
  versionId: string;
  templateId?: string; // ID of the selected template
  title: string;
  summary: string;
  skills: Skill[];
  experience: Experience[];
  education: Education[];
  contact: ContactInfo;
  projects: Project[];
  generatedText: {
    draft: string;
    polished: string;
    lastGeneratedAt: string;
  };
  slug: string;
  published: boolean;
  lastUpdatedAt: string;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  profileSlug: string;
  createdAt: string;
  updatedAt: string;
  settings: {
    publicProfile: boolean;
    defaultPIIVisibility: Visibility;
  };
}

export interface RecruiterRequest {
  id: string;
  fromRecruiter: {
    name: string;
    org: string;
    email: string;
    recruiterId?: string;
  };
  toUserId: string;
  requestedFields: string[];
  status: "requested" | "approved" | "denied" | "expired";
  createdAt: string;
  updatedAt: string;
}

// ==================== ANALYTICS TYPES ====================

/**
 * Profile view analytics
 * Tracks individual profile views with metadata
 */
export interface ProfileViewAnalytics {
  viewId: string;
  resumeId: string;
  userId: string;
  viewedBy: string; // Viewer's UID
  viewerName?: string;
  timestamp: string;
  source: "search" | "direct" | "link" | "recruiter" | "other";
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  sessionDuration?: number; // seconds
}

/**
 * Engagement metrics for a profile
 */
export interface EngagementMetrics {
  resumeId: string;
  totalViews: number;
  uniqueViewers: number;
  avgSessionDuration: number; // seconds
  viewsBySource: {
    search: number;
    direct: number;
    link: number;
    recruiter: number;
    other: number;
  };
  topReferrers: { [key: string]: number };
  lastViewedAt: string;
  viewTrendLast7Days: { date: string; count: number }[];
}

/**
 * Request statistics for access requests
 */
export interface RequestStatistics {
  resumeId: string;
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  deniedRequests: number;
  requestsBySource: { [key: string]: number };
  avgResponseTime?: number; // hours
  lastRequestAt: string;
  requestTrendLast7Days: { date: string; count: number }[];
}

/**
 * Complete analytics summary for a resume/profile
 */
export interface Analytics {
  slug: string;
  resumeId: string;
  userId: string;

  // Views and engagement
  views: {
    count: number;
    lastViewedAt: string;
    topReferrers: { [key: string]: number };
    uniqueViewers: number;
    avgSessionDuration: number;
  };

  // Engagement details
  engagement?: EngagementMetrics;

  // Request statistics
  requests?: RequestStatistics;

  // Aggregated data
  totalInteractions: number; // views + requests
  lastUpdatedAt: string;
  period?: "daily" | "weekly" | "monthly";
}

/**
 * Analytics event for tracking
 */
export interface AnalyticsEvent {
  eventId: string;
  resumeId: string;
  userId: string;
  eventType: "view" | "request" | "approval" | "click" | "share";
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  meta: Record<string, unknown>;
}
