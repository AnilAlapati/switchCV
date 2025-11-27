/**
 * Resume Comparison Types and Interfaces
 */

export interface Resume {
  id: string;
  title: string;
  summary?: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  certifications?: string[];
  languages?: string[];
  contact: {
    email: { value: string };
    phone?: { value: string };
  };
}

export interface Experience {
  company: string;
  role: string;
  duration: string;
  startDate?: string;
  endDate?: string;
  description: string;
  achievements?: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  year: number;
  gpa?: number;
}

export interface ComparisonResult {
  resumeIds: string[];
  overallScore: number;
  sections: SectionComparison[];
  differences: Difference[];
  similarities: string[];
  recommendations: string[];
}

export interface SectionComparison {
  section: string;
  score1: number;
  score2: number;
  details: ComparisonDetail[];
}

export interface ComparisonDetail {
  field: string;
  value1: string | string[];
  value2: string | string[];
  status: "same" | "different" | "missing";
  score: number;
}

export interface Difference {
  field: string;
  resume1Value: string | string[];
  resume2Value: string | string[];
  type: "added" | "removed" | "modified";
  impact: "high" | "medium" | "low";
}
