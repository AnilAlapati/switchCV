// src/types/index.ts - Type definitions for Profile Search System

export type AccessDurationUnit = "hour" | "day" | "week" | "month";

export type AccessDurationPreset =
  | "1_hour"
  | "1_day"
  | "1_week"
  | "1_month"
  | "custom_days";

export interface AccessDuration {
  preset: AccessDurationPreset;
  value: number;
  unit: AccessDurationUnit;
  durationHours: number;
  durationMs: number;
  label: string;
  timezone?: string;
  isCustom: boolean;
}

export interface AccessRequest {
  requestId: string;
  fromUserId: string;
  fromUserName: string;
  timestamp: Date;
  message?: string;
  status: "pending" | "approved" | "denied";
  resumeId?: string;
  requestedDuration?: AccessDuration;
  grantedDuration?: AccessDuration;
  approvedAt?: Date;
  expiresAt?: Date | null;
}

export interface AccessGrant {
  grantId: string;
  toUserId: string;
  requestId?: string;
  grantedAt: Date;
  expiresAt: Date | null; // null means forever
  duration?: AccessDuration;
  grantedBy?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: "request" | "approval" | "denial" | "expiry_warning" | "revoked";
  fromUserId?: string;
  fromUserName?: string;
  resumeTitle?: string;
  resumeId?: string;
  message?: string;
  timestamp: Date;
  read: boolean;
  expiresAt?: Date;
  actionUrl?: string;
  action?: {
    type: "approve" | "view" | "request_again";
    data?: Record<string, any>;
  };
}

export interface PublicProfile {
  username: string;
  visible: boolean;
  aiSelectedBio: string;
  role?: string;
  location?: string;
  skills?: string[];
}

export interface AccessControl {
  allowPublicSummary: boolean;
  accessRequests?: AccessRequest[];
  accessGrants?: AccessGrant[];
}

export interface ProfileSearchResult {
  userId: string;
  username: string;
  displayName: string;
  photoURL?: string;
  bio: string;
  role?: string;
  location?: string;
  skills?: string[];
  hasApproval: boolean;
  approvalExpiresAt?: Date;
  requestedAt?: Date; // If already requested
}

export interface AccessCheckResponse {
  hasAccess: boolean;
  accessType: "owner" | "public" | "granted" | "none";
  expiresAt?: Date;
  grantId?: string;
  duration?: AccessDuration;
  message?: string;
}

// Add to existing ResumeProfile type:
export interface ResumeProfile {
  // ... existing fields
  accessControl?: AccessControl;
  slug: string;
  published: boolean;
}

// Add to existing User type:
export interface User {
  // ... existing fields
  publicProfile?: PublicProfile;
  resumeSummaries?: {
    [resumeId: string]: {
      title: string;
      targetRole?: string;
      skills?: string[];
    };
  };
}

// ==================== RECRUITER WORKFLOW ====================

/**
 * Recruiter profile information
 * Used for verification and tracking
 */
export interface RecruiterProfile {
  recruiterId: string;
  companyName: string;
  companyEmail: string;
  companyWebsite?: string;
  name: string;
  title: string;
  verified: boolean;
  verifiedAt?: Date;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Secure access token for PII fields
 * JWT-like structure with expiration and revocation support
 */
export interface SecureAccessToken {
  tokenId: string;
  recruiterId: string;
  userId: string; // The candidate
  resumeId: string;
  requestId: string;

  // Token details
  token: string; // Encrypted/signed token
  tokenHash: string; // Hash for verification

  // Access scope
  accessFields: Array<"email" | "phone" | "address" | "personalLinks">; // PII fields
  accessType: "read-only" | "limited"; // Type of access

  // Expiration
  issuedAt: Date;
  expiresAt: Date;
  duration: "1hour" | "1day" | "1week" | "30days";

  // Revocation
  isRevoked: boolean;
  revokedAt?: Date;
  revokedBy?: string; // User who revoked
  revokeReason?: string;

  // Tracking
  ipAddressWhitelist?: string[];
  usageCount: number;
  lastUsedAt?: Date;
}

/**
 * Recruiter contact/access request
 * Tracks requests from recruiters for PII access
 */
export interface RecruiterContactRequest {
  id: string;

  // Requester info
  fromRecruiter: {
    recruiterId: string;
    name: string;
    email: string;
    companyName: string;
  };

  // Target
  toUserId: string;
  toUserEmail?: string;
  resumeId: string;
  resumeTitle?: string;

  // Request details
  requestedFields: Array<"email" | "phone" | "address" | "personalLinks">;
  purpose: string; // Why they're requesting
  proposedDuration: "1hour" | "1day" | "1week" | "30days";

  // Status tracking
  status: "pending" | "approved" | "denied" | "expired";
  createdAt: Date;
  updatedAt: Date;

  // Decision
  reviewedBy?: string; // Admin user ID
  reviewedAt?: Date;
  denialReason?: string;

  // Token details (if approved)
  tokenId?: string;
  accessExpiresAt?: Date;

  // Metadata
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit log for recruiter access
 * For compliance and security monitoring
 */
export interface RecruiterAccessAuditLog {
  id: string;
  tokenId: string;
  recruiterId: string;
  userId: string;
  action: "created" | "accessed" | "verified" | "revoked" | "expired";
  timestamp: Date;

  // Details
  field?: string; // Which PII field was accessed
  ipAddress?: string;
  userAgent?: string;
  result: "success" | "failed";
  failureReason?: string;

  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Recruiter activity summary
 * For dashboard and analytics
 */
export interface RecruiterActivitySummary {
  recruiterId: string;
  totalRequests: number;
  approvedRequests: number;
  deniedRequests: number;
  activeTokens: number;
  lastActivityAt: Date;

  // Tracking
  requestsThisMonth: number;
  uniqueCandidatesAccessed: number;
}
