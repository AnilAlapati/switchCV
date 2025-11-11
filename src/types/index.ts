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

export interface ResumeProfile {
  versionId: string;
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

export interface Analytics {
  slug: string;
  views: {
    count: number;
    lastViewedAt: string;
    topReferrers: { [key: string]: number };
  };
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  meta: Record<string, unknown>;
}
