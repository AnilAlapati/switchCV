export interface ContentAnalysis {
  summaryWordCount: number;
  summaryCharCount: number;
  experienceCount: number;
  totalExperienceChars: number;
  avgDescriptionLength: number;
  maxDescriptionLength: number;
  skillsCount: number;
  projectsCount: number;
  totalProjectChars: number;
  educationCount: number;
  totalContentChars: number;
  contentDensity: "minimal" | "light" | "moderate" | "dense" | "very-dense";
  hasMetrics: boolean;
  hasLeadershipSignals: boolean;
  hasTechnicalDepth: boolean;
  estimatedYearsExperience: number;
  seniorityLevel: "entry" | "junior" | "mid" | "senior" | "executive";
  roleType: "technical" | "management" | "product" | "creative" | "other";
}

export interface TemplateScore {
  templateId: string;
  scores: {
    contentFit: number;
    visualBalance: number;
    careerMatch: number;
    readability: number;
  };
  totalScore: number;
  confidence: "low" | "medium" | "high";
  reasoning: string;
}

export interface TemplateRecommendation {
  recommendedTemplate: string;
  allScores: TemplateScore[];
  analysis: ContentAnalysis;
  explanation: string;
}

export interface TemplateProfile {
  id: string;
  name: string;
  layout: "single-column" | "two-column" | "grid" | "bento";
  columnSplit?: string;
  tier: "free" | "premium" | "enterprise";
  bestFor: string[];
  avoidWhen: string[];
  idealContentDensity: ContentAnalysis["contentDensity"][];
  idealSeniority: ContentAnalysis["seniorityLevel"][];
  idealRoleTypes: ContentAnalysis["roleType"][];
  minExperiences: number;
  maxExperiences: number;
  minSkills: number;
  idealProjectCount: number;
}
