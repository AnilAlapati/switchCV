/**
 * Skill Matrix & Gap Analysis Type Definitions
 */

/**
 * Proficiency level for a skill
 */
export enum ProficiencyLevel {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
  EXPERT = "expert",
}

/**
 * Skill category
 */
export enum SkillCategory {
  TECHNICAL = "technical",
  SOFT_SKILLS = "soft-skills",
  DOMAIN = "domain",
  TOOL_TECHNOLOGY = "tool-technology",
  LANGUAGE = "language",
  CERTIFICATION = "certification",
  OTHER = "other",
}

/**
 * Individual skill with proficiency level
 */
export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  proficiencyLevel: ProficiencyLevel;
  yearsOfExperience?: number;
  endorsements?: number;
  lastUsed?: Date;
  description?: string;
}

/**
 * User's skill inventory
 */
export interface SkillInventory {
  id: string;
  userId: string;
  skills: Skill[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Job requirement specification
 */
export interface JobRequirement {
  skill: Skill;
  importance: "must-have" | "nice-to-have" | "optional";
  minimumProficiency: ProficiencyLevel;
}

/**
 * Job posting with required skills
 */
export interface JobPosting {
  id: string;
  title: string;
  description: string;
  requirements: JobRequirement[];
  category?: string;
  level?: "entry" | "mid" | "senior" | "lead";
}

/**
 * Gap analysis result for a single skill
 */
export interface SkillGap {
  skill: Skill;
  userProficiency: ProficiencyLevel | null;
  requiredProficiency: ProficiencyLevel;
  gap: number; // 0-4 scale, 0 = no gap, 4 = maximum gap
  gapDescription: string;
  isCritical: boolean;
  learningPath?: LearningResource[];
}

/**
 * Learning resource recommendation
 */
export interface LearningResource {
  id: string;
  title: string;
  type:
    | "course"
    | "book"
    | "tutorial"
    | "project"
    | "certification"
    | "practice";
  provider?: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedHours?: number;
  url?: string;
  cost?: number;
  rating?: number;
  description?: string;
}

/**
 * Comprehensive gap analysis report
 */
export interface GapAnalysisReport {
  id: string;
  userId: string;
  jobPostingId: string;
  jobTitle: string;
  analyzedAt: Date;
  overallReadiness: number; // 0-100 percentage
  skillGaps: SkillGap[];
  matchPercentage: number;
  criticalGapsCount: number;
  strengths: Skill[]; // Skills where user exceeds requirements
  recommendations: LearningRecommendation[];
  estimatedTimeToReady: number; // in days
}

/**
 * Learning recommendation with priority
 */
export interface LearningRecommendation {
  skill: Skill;
  priority: "high" | "medium" | "low";
  resources: LearningResource[];
  suggestedPath: string;
  estimatedTimeframe: string;
}

/**
 * Skill progress tracking
 */
export interface SkillProgress {
  skillId: string;
  userId: string;
  startProficiency: ProficiencyLevel;
  currentProficiency: ProficiencyLevel;
  startDate: Date;
  targetDate: Date;
  progressPercentage: number;
  resourcesCompleted: string[];
  hoursSpent: number;
  notes?: string;
}

/**
 * Skills comparison between two users (for benchmarking)
 */
export interface SkillComparison {
  userId1: string;
  userId2: string;
  commonSkills: Skill[];
  uniqueToUser1: Skill[];
  uniqueToUser2: Skill[];
  strengthAreas: SkillCategory[];
  weaknessAreas: SkillCategory[];
  overlapPercentage: number;
}

/**
 * Industry benchmark data
 */
export interface IndustryBenchmark {
  jobTitle: string;
  industry: string;
  level: "entry" | "mid" | "senior" | "lead";
  topSkills: {
    skill: string;
    frequency: number; // percentage of jobs requiring this
    averageProficiency: ProficiencyLevel;
  }[];
  averageSalaryRange?: {
    min: number;
    max: number;
  };
  marketDemand: "high" | "medium" | "low";
}

/**
 * API Response types
 */
export interface GapAnalysisAPIRequest {
  userId: string;
  jobPostingId: string;
}

export interface SkillInventoryAPIRequest {
  userId: string;
  skills: Omit<Skill, "id">[];
}

export interface UpdateSkillRequest {
  skillId: string;
  proficiencyLevel?: ProficiencyLevel;
  yearsOfExperience?: number;
  lastUsed?: Date;
}
