/* eslint-disable max-lines */
// src/types/index.ts
import { SubscriptionTier, UserRole } from "@/lib/config";

export type Visibility = "public" | "masked" | "request";

export interface ContactInfo {
  email: { value: string; visibility: Visibility };
  phone?: { value: string; visibility: Visibility };
}

export interface Skill {
  id?: string;
  name: string;
  level: string;
  visibility: Visibility;
}

export interface Experience {
  id?: string;
  company: string;
  role: string;
  startDate: string;
  endDate?: string;
  description: string;
  visibility: Visibility;
}

export interface Education {
  id?: string;
  institution: string;
  degree: string;
  startDate: string;
  endDate?: string;
  description?: string;
  visibility: Visibility;
}

export interface Project {
  id?: string;
  name: string;
  url?: string;
  description: string;
  technologies?: string[];
  visibility: Visibility;
}

export interface PersonalInfo {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
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
  tier?: "free" | "premium" | "enterprise";
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
  personalInfo?: PersonalInfo;
  projects: Project[];
  generatedText: {
    draft: string;
    polished: string;
    lastGeneratedAt: string;
  };
  slug: string;
  lastUpdatedAt: string;
}

/**
 * Draft Resume - stored in drafts collection
 * Contains resume data that is being edited and not yet published
 */
export interface DraftResume {
  /** Unique alphanumeric draft ID (e.g., "d7xK9mP2") */
  draftId: string;
  /** Owner's user ID */
  userId: string;
  /** Associated numeric resume ID (if previously published, null for new) */
  resumeId: number | null;
  /** Resume content */
  profile: ResumeProfile;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Published Resume - stored in resumes collection
 * User-approved resume that is searchable by recruiters
 */
export interface PublishedResume {
  /** Numeric resume ID (e.g., 12345678) */
  resumeId: number;
  /** Alias for resumeId to match DashboardResume */
  numericId: number;
  /** Owner's user ID */
  userId: string;
  /** Resume content */
  profile: ResumeProfile;
  /** Vector embedding for AI search (768 dimensions) */
  embedding?: number[];
  /** Timestamp when embedding was last generated */
  embeddingUpdatedAt?: string;
  /** Search profile text used for embedding */
  searchProfile?: string;
  /** Publication timestamp */
  publishedAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Whether resume is currently being edited (unpublished temporarily) */
  isBeingEdited: boolean;
  /** Associated draft ID if currently being edited */
  editingDraftId?: string;
}

/**
 * Dashboard Resume - Flattened structure used in UI components
 */
export interface DashboardResume extends ResumeProfile {
  id: string;
  numericId?: number;
  published?: boolean;
  isPublic?: boolean;
  visibility?: string;
  lastUpdatedAt: string;
  updatedAt?: string;
  publishedAt?: string;
  createdAt?: string;
  templateId?: string;
  isBeingEdited?: boolean;
  viewerAccess?: ViewerAccessMeta;
}

export interface ViewerAccessMeta {
  isOwner?: boolean;
  isRecruiter?: boolean;
  hasGrantedAccess?: boolean;
  scope?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  subscriptionTier: SubscriptionTier; // @deprecated Use jobSeekerTier or recruiterTier
  jobSeekerTier?: SubscriptionTier;
  recruiterTier?: SubscriptionTier;
  role: UserRole;
  approvalStatus?: "pending" | "approved" | "declined";
  createdAt?: string;
  lastLoginAt?: string;
  agentic?: {
    usageCount: number;
    lastRunAt: string;
  };
}

export interface LegacyResumeData {
  title: string;
  numericId?: string | number;
  personalInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  summary?: string;
  experience?: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
    achievements?: string[];
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    year: string;
    major?: string;
  }>;
  skills?: Array<string | { name: string }>;
  work?: Array<Record<string, unknown>>;
  languages?: Array<Record<string, unknown>>;
  interests?: Array<Record<string, unknown>>;
  references?: Array<Record<string, unknown>>;
  projects?: Array<Record<string, unknown>>;
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
  subscriptionTier?: "basic" | "premium" | "enterprise"; // @deprecated Use jobSeekerTier or recruiterTier
  jobSeekerTier?: SubscriptionTier;
  recruiterTier?: SubscriptionTier;
  agentic?: {
    usageCount: number;
    lastRunAt: string;
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

  // Optional metadata for dashboard
  demographics?: {
    topIndustries: string[];
    topLocations: string[];
  };
  attractivenessScore?: number;

  // Additional metrics tracked in service
  downloads?: number;
  lastDownloadedAt?: string;
  downloadsByFormat?: Record<string, number>;
  shares?: number;
  lastSharedAt?: string;

  // Legacy/Flat structure support
  viewCount?: number;
  uniqueViews?: number;
  uniqueViewCount?: number;
  downloadCount?: number;
  shareCount?: number;
}

/**
 * Analytics event for tracking
 */
export interface AnalyticsEvent {
  eventId: string;
  resumeId: string;
  userId: string;
  eventType: "view" | "request" | "approval" | "click" | "share" | "download";
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  meta: Record<string, unknown>;
}

export interface SystemAnalytics {
  totalUsers: number;
  totalResumes: number;
  activeRecruiters: number;
  totalViews: number;
  totalContactRequests: number;
  averageAttractiveness: number;
  topIndustries: Array<{ name: string; count: number }>;
  recentActivity: Array<{ type: string; timestamp: Date; description: string }>;
  subscriptionDistribution: {
    basic: number;
    premium: number;
    enterprise: number;
  };
}
