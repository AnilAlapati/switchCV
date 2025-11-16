/**
 * Real-Time Notifications System Types
 * Comprehensive notification models for in-app, email, SMS, and push notifications
 */

export enum NotificationType {
  CANDIDATE_ADDED = "candidate-added",
  STAGE_CHANGED = "stage-changed",
  INTERVIEW_SCHEDULED = "interview-scheduled",
  INTERVIEW_REMINDER = "interview-reminder",
  INTERVIEW_FEEDBACK = "interview-feedback",
  PROFILE_VIEW = "profile-view",
  MESSAGE_RECEIVED = "message-received",
  SKILL_MATCH = "skill-match",
  JOB_POSTED = "job-posted",
  APPLICATION_UPDATE = "application-update",
}

export enum NotificationChannel {
  IN_APP = "in-app",
  EMAIL = "email",
  SMS = "sms",
  PUSH = "push",
  WEBHOOK = "webhook",
}

export enum NotificationStatus {
  PENDING = "pending",
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  FAILED = "failed",
  BOUNCED = "bounced",
}

export enum NotificationPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export interface NotificationPreference {
  id: string;
  userId: string;
  type: NotificationType;
  channels: NotificationChannel[];
  enabled: boolean;
  frequency?: "instant" | "daily" | "weekly" | "never";
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationRecipient {
  userId: string;
  email?: string;
  phone?: string;
  pushTokens?: string[];
  preferences?: NotificationPreference[];
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
  imageUrl?: string;
  icon?: string;
  badges?: number;
}

export interface Notification {
  id: string;
  type: NotificationType;
  status: NotificationStatus;
  priority: NotificationPriority;
  recipientId: string;
  recipients?: NotificationRecipient[];
  channels: NotificationChannel[];
  payload: NotificationPayload;
  createdAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failureReason?: string;
  retryCount: number;
  metadata?: Record<string, unknown>;
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  template: string;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailConfig {
  from: string;
  replyTo?: string;
  provider: "sendgrid" | "mailgun" | "ses" | "smtp";
  apiKey?: string;
  smtpConfig?: {
    host: string;
    port: number;
    secure: boolean;
    auth?: {
      user: string;
      pass: string;
    };
  };
}

export interface SMSConfig {
  provider: "twilio" | "nexmo" | "aws-sns";
  apiKey: string;
  apiSecret?: string;
  fromNumber: string;
}

export interface PushConfig {
  provider: "firebase" | "onesignal" | "pusher";
  apiKey: string;
  apiSecret?: string;
  projectId?: string;
}

export interface WebhookConfig {
  url: string;
  headers?: Record<string, string>;
  secret?: string;
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
  };
}

export interface NotificationServiceConfig {
  email?: EmailConfig;
  sms?: SMSConfig;
  push?: PushConfig;
  webhook?: WebhookConfig;
  defaultChannel: NotificationChannel;
  batchSize: number;
  batchDelayMs: number;
  maxRetries: number;
}

export interface NotificationQueue {
  id: string;
  notifications: Notification[];
  channel: NotificationChannel;
  status: "processing" | "idle" | "paused";
  processedCount: number;
  failedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationLog {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  message: string;
  errorCode?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface NotificationDeliveryReport {
  notificationId: string;
  totalRecipients: number;
  delivered: number;
  failed: number;
  bounced: number;
  opened: number;
  clicked: number;
  timestamp: Date;
}
