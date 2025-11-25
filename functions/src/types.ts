// Types for enhanced content
export interface EnhancedResumeContent {
  enhancedSummary: string;
  enhancedExperience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
    achievements: string[];
    enhancedDescription: string;
  }>;
  skillSuggestions: string[];
  improvementTips: string[];
}

export interface JobMatchSuggestions {
  analysis: string;
  matchScore: number;
  recommendations: string[];
}

export interface ResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
  };
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
    achievements: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
    gpa?: string;
  }>;
  skills: string[];
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
    url?: string;
  }>;
}

export interface GenerateResumeRequest {
  userId: string;
  resumeData: ResumeData;
  template?: string;
  tone?: "professional" | "creative" | "concise";
  modelId?: string;
}

export interface ViewTrendData {
  date: string;
  count: number;
}

export interface EngagementMetrics {
  resumeId: string;
  totalViews: number;
  uniqueViewers: number;
  avgSessionDuration: number;
  viewsBySource: Record<string, number>;
  topReferrers: Record<string, number>;
  lastViewedAt: string;
  viewTrendLast7Days: ViewTrendData[];
}

export interface AnalyticsEvent {
  eventType: string;
  timestamp: string;
  metadata?: {
    viewedBy?: string;
    sessionDuration?: number;
    source?: string;
    referrer?: string;
  };
}
