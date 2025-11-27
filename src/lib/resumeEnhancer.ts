// src/lib/resumeEnhancer.ts
/**
 * AI-Powered Resume Enhancement Module
 * Provides smart formatting detection, optimization, ATS scoring, and keyword enhancement
 */

import { logger } from "@/lib/logger";
import type { Resume } from "@/lib/resumeComparison.types";

export interface ResumeEnhancementResult {
  atsScore: number;
  atsReport: string[];
  formattingAnalysis: {
    formatting: string;
    suggestions: string[];
  };
  optimizationTips: string[];
  keywordAnalysis: {
    currentKeywords: string[];
    suggestedKeywords: string[];
    keywordScore: number;
  };
  comparativeAnalysis: {
    strengths: string[];
    weaknesses: string[];
    improvements: string[];
  };
}

/**
 * Analyze resume for ATS (Applicant Tracking System) compatibility
 * Checks for common issues that might cause resume to be filtered out
 */
export const analyzeATS = (
  resume: Resume
): { score: number; report: string[] } => {
  const issues: string[] = [];
  let score = 100;

  // Check for required sections
  if (!resume.summary || resume.summary.length < 20) {
    issues.push(
      "⚠️ Summary is missing or too short. Add a professional summary (50-150 words)"
    );
    score -= 10;
  }

  // Check experience section
  if (!resume.experience || resume.experience.length === 0) {
    issues.push("⚠️ No work experience found. Add at least one previous role");
    score -= 15;
  }

  // Check skills
  if (!resume.skills || resume.skills.length < 5) {
    issues.push("⚠️ Too few skills listed. Add at least 5-10 relevant skills");
    score -= 10;
  }

  // Check contact information
  if (!resume.contact.email.value) {
    issues.push(
      "❌ Email address is missing. ATS cannot process without contact info"
    );
    score -= 20;
  }

  // Check for proper formatting
  const hasDates = resume.experience.some((exp) => exp.startDate);
  if (!hasDates) {
    issues.push(
      "⚠️ Experience dates are missing. Add start and end dates for all positions"
    );
    score -= 10;
  }

  // Check for education
  if (!resume.education || resume.education.length === 0) {
    issues.push(
      "⚠️ No education information found. Add at least one degree or certification"
    );
    score -= 10;
  }

  // Check for proper keywords
  const resumeText = JSON.stringify(resume).toLowerCase();
  const actionVerbs = [
    "managed",
    "developed",
    "designed",
    "implemented",
    "led",
    "created",
    "improved",
    "analyzed",
  ];
  const hasActionVerbs = actionVerbs.some((verb) => resumeText.includes(verb));
  if (!hasActionVerbs) {
    issues.push(
      "⚠️ Consider using action verbs (managed, developed, designed, etc.) to strengthen descriptions"
    );
    score -= 5;
  }

  return {
    score: Math.max(0, score),
    report:
      issues.length > 0
        ? issues
        : [
            "✅ Resume looks ATS-friendly! Good structure and formatting detected",
          ],
  };
};

/**
 * Detect formatting style and suggest improvements
 */
export const analyzeFormatting = (resume: Resume): string => {
  const hasBulletPoints = resume.experience.some((exp: any) =>
    exp.description?.includes("•")
  );

  const hasConsistentStructure =
    resume.experience.length > 0 && resume.education.length > 0;

  let formatting = "Standard";
  if (hasBulletPoints && hasConsistentStructure) {
    formatting = "Well-Structured";
  }

  return formatting;
};

/**
 * Generate ATS optimization tips
 */
export const generateOptimizationTips = (resume: Resume): string[] => {
  const tips: string[] = [];

  // Tips based on content analysis
  tips.push("✓ Use keywords from job descriptions to improve ATS matching");
  tips.push(
    "✓ Keep formatting simple: avoid tables, graphics, and unusual fonts"
  );
  tips.push("✓ Use standard section headers: Experience, Education, Skills");
  tips.push(
    "✓ Include metrics and numbers: 'Increased sales by 25%' is better than 'Increased sales'"
  );

  if (resume.skills.length < 15) {
    tips.push(
      "✓ Expand skills section to 15-20 relevant technical and soft skills"
    );
  }

  if (!resume.summary || resume.summary.length < 100) {
    tips.push("✓ Write a compelling professional summary (100-150 words)");
  }

  const experienceDescription = resume.experience
    .map((e: any) => e.description)
    .join(" ")
    .toLowerCase();

  if (
    !experienceDescription.includes("led") &&
    !experienceDescription.includes("managed") &&
    !experienceDescription.includes("directed")
  ) {
    tips.push(
      "✓ Highlight leadership experience: use verbs like 'led', 'managed', 'directed'"
    );
  }

  return tips;
};

/**
 * Analyze keywords in resume and suggest relevant ones
 */
export const analyzeKeywords = (
  resume: Resume,
  jobDescription?: string
): {
  currentKeywords: string[];
  suggestedKeywords: string[];
  keywordScore: number;
} => {
  const resumeText = JSON.stringify(resume).toLowerCase();

  // Extract current keywords (skills)
  const currentKeywords = resume.skills.map((s: any) =>
    (typeof s === "string" ? s : s.name).toLowerCase()
  );

  // Suggested technical keywords
  const technicalKeywords = [
    "cloud computing",
    "data analysis",
    "machine learning",
    "api development",
    "database management",
    "devops",
    "microservices",
    "agile",
    "scrum",
    "git",
    "rest api",
    "graphql",
    "kubernetes",
    "docker",
    "ci/cd",
  ];

  const suggestedKeywords = technicalKeywords.filter(
    (kw) => !currentKeywords.includes(kw)
  );

  // Calculate keyword match score with job description
  let keywordScore = 50;
  if (jobDescription) {
    const jobKeywords = jobDescription.toLowerCase().split(/\s+/);
    const matches = jobKeywords.filter((kw) => resumeText.includes(kw));
    keywordScore = Math.round((matches.length / jobKeywords.length) * 100);
  }

  return {
    currentKeywords,
    suggestedKeywords: suggestedKeywords.slice(0, 5),
    keywordScore: Math.min(100, keywordScore),
  };
};

/**
 * Generate comprehensive resume analysis
 */
export const generateResumeEnhancement = (
  resume: Resume,
  jobDescription?: string
): ResumeEnhancementResult => {
  try {
    const { score: atsScore, report: atsReport } = analyzeATS(resume);
    const formattingAnalysis = {
      formatting: analyzeFormatting(resume),
      suggestions: generateOptimizationTips(resume),
    };
    const keywordAnalysis = analyzeKeywords(resume, jobDescription);

    // Generate comparative analysis
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const improvements: string[] = [];

    if (resume.experience.length >= 3) {
      strengths.push("Strong work history with multiple positions");
    } else if (resume.experience.length > 0) {
      weaknesses.push(
        "Limited work experience - consider adding more details or side projects"
      );
    }

    if (resume.skills.length >= 10) {
      strengths.push("Comprehensive skill set");
    } else {
      weaknesses.push(
        `Add more skills (currently ${resume.skills.length}, target: 15+)`
      );
    }

    if (resume.education.length > 0) {
      strengths.push("Education credentials listed");
    } else {
      weaknesses.push("Add education section with degrees and certifications");
    }

    if (atsScore >= 80) {
      strengths.push("Good ATS compatibility");
    } else {
      improvements.push(
        `Improve ATS score from ${atsScore} to 85+ with suggested changes`
      );
    }

    if (keywordAnalysis.keywordScore >= 70) {
      strengths.push("Good keyword match with typical job descriptions");
    } else {
      improvements.push(
        `Improve keyword relevance score from ${keywordAnalysis.keywordScore}%`
      );
    }

    return {
      atsScore,
      atsReport,
      formattingAnalysis,
      optimizationTips: generateOptimizationTips(resume),
      keywordAnalysis,
      comparativeAnalysis: {
        strengths,
        weaknesses,
        improvements,
      },
    };
  } catch (error) {
    logger.error({ err: error }, "Error generating resume enhancement:");
    throw new Error("Failed to analyze resume");
  }
};

/**
 * Generate smart formatting recommendations
 */
export const getFormattingRecommendations = (resume: Resume): string[] => {
  const recommendations: string[] = [];

  // Check document structure
  if (!resume.title) {
    recommendations.push(
      "Add a professional title (e.g., 'Senior Software Engineer')"
    );
  }

  // Check for action verbs
  const descriptions = resume.experience
    .map((e: any) => e.description)
    .join(" ");
  const actionVerbs = [
    "managed",
    "led",
    "developed",
    "created",
    "implemented",
    "designed",
    "improved",
    "increased",
  ];
  const hasActionVerbs = actionVerbs.some((verb) =>
    descriptions.toLowerCase().includes(verb)
  );

  if (!hasActionVerbs) {
    recommendations.push("Use strong action verbs to start bullet points");
  }

  // Check for quantifiable results
  const hasNumbers = /\d+/.test(descriptions);
  if (!hasNumbers) {
    recommendations.push(
      "Add metrics and percentages to show impact (e.g., '25% revenue increase')"
    );
  }

  // Check for consistency
  if (resume.experience.length > 0) {
    const allHaveDescriptions = resume.experience.every(
      (e: any) => e.description && e.description.length > 20
    );
    if (!allHaveDescriptions) {
      recommendations.push("Expand job descriptions with more detail");
    }
  }

  return recommendations;
};
