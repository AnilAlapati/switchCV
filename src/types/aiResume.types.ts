/**
 * Types for AI Resume generation
 */

export interface EnhancedExperience {
  title: string;
  company: string;
  duration: string;
  description: string;
  achievements: string[];
  enhancedDescription: string;
}

export interface EnhancedResumeContent {
  enhancedSummary: string;
  enhancedExperience: EnhancedExperience[];
  skillSuggestions: string[];
  improvementTips: string[];
}

export interface ResumePersonalInfo {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
}

export interface ResumeExperience {
  title: string;
  company: string;
  duration: string;
  description: string;
  achievements: string[];
}

export interface ResumeEducation {
  degree: string;
  institution: string;
  year: string;
  gpa?: string;
}

export interface ResumeProject {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
}

export interface ResumeData {
  personalInfo: ResumePersonalInfo;
  summary: string;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skills: string[];
  projects?: ResumeProject[];
}
