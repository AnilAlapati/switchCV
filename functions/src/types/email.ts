/**
 * Email service types and interfaces
 */

export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

export interface EmailOptions {
  to: string;
  template: keyof typeof EmailTemplates;
  data: Record<string, any>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

export interface CustomEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface BulkEmailOptions {
  recipients: string[];
  template: keyof typeof EmailTemplates;
  data: Record<string, any>;
}

export const EmailTemplates = {
  recruiterRequest: "recruiterRequest",
  requestApproved: "requestApproved",
  requestDenied: "requestDenied",
  profileViewed: "profileViewed",
  passwordReset: "passwordReset",
  welcomeEmail: "welcomeEmail",
  adminNotification: "adminNotification",
} as const;

export type EmailTemplateName =
  (typeof EmailTemplates)[keyof typeof EmailTemplates];
