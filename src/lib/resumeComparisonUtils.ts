/**
 * Resume Comparison Analysis Utilities
 * Helper functions for comparison logic
 */

import { Resume, Difference } from "./resumeComparison.types";

/**
 * Extract differences between resumes
 */
export function extractDifferences(
  resume1: Resume,
  resume2: Resume
): Difference[] {
  const differences: Difference[] = [];

  // Title difference
  if (resume1.title !== resume2.title) {
    differences.push({
      field: "Job Title",
      resume1Value: resume1.title,
      resume2Value: resume2.title,
      type: "modified",
      impact: "high",
    });
  }

  // Skill differences
  const skills1 = new Set(resume1.skills.map((s) => s.toLowerCase()));
  const skills2 = new Set(resume2.skills.map((s) => s.toLowerCase()));

  Array.from(skills1).forEach((skill) => {
    if (!skills2.has(skill)) {
      differences.push({
        field: "Skill",
        resume1Value: skill,
        resume2Value: "-",
        type: "removed",
        impact: "medium",
      });
    }
  });

  Array.from(skills2).forEach((skill) => {
    if (!skills1.has(skill)) {
      differences.push({
        field: "Skill",
        resume1Value: "-",
        resume2Value: skill,
        type: "added",
        impact: "medium",
      });
    }
  });

  // Experience count difference
  if (resume1.experience.length !== resume2.experience.length) {
    differences.push({
      field: "Experience Count",
      resume1Value: resume1.experience.length.toString(),
      resume2Value: resume2.experience.length.toString(),
      type: "modified",
      impact: "medium",
    });
  }

  return differences;
}

/**
 * Extract similarities between resumes
 */
export function extractSimilarities(
  resume1: Resume,
  resume2: Resume
): string[] {
  const similarities: string[] = [];

  const skills1 = new Set(resume1.skills.map((s) => s.toLowerCase()));
  const skills2 = new Set(resume2.skills.map((s) => s.toLowerCase()));
  const commonSkills = Array.from(skills1).filter((s) => skills2.has(s));

  if (commonSkills.length > 3) {
    similarities.push(
      `Share ${commonSkills.length} core skills: ${commonSkills
        .slice(0, 3)
        .join(", ")}...`
    );
  }

  const degrees1 = new Set(
    resume1.education.map((e) => e.degree.toLowerCase())
  );
  const degrees2 = new Set(
    resume2.education.map((e) => e.degree.toLowerCase())
  );
  const commonDegrees = Array.from(degrees1).filter((d) => degrees2.has(d));

  if (commonDegrees.length > 0) {
    similarities.push(`Both hold ${commonDegrees.join(" and ")} degrees`);
  }

  if (resume1.experience.length > 0 && resume2.experience.length > 0) {
    similarities.push(`Both have professional work experience`);
  }

  return similarities;
}

/**
 * Generate improvement recommendations
 */
export function generateRecommendations(
  resume1: Resume,
  resume2: Resume,
  differences: Difference[]
): string[] {
  const recommendations: string[] = [];

  const skills1 = new Set(resume1.skills.map((s) => s.toLowerCase()));
  const skills2 = new Set(resume2.skills.map((s) => s.toLowerCase()));
  const skillsInResume2NotInResume1 = Array.from(skills2).filter(
    (s) => !skills1.has(s)
  );

  if (skillsInResume2NotInResume1.length >= 2) {
    recommendations.push(
      `Consider adding: ${skillsInResume2NotInResume1.slice(0, 3).join(", ")}`
    );
  }

  if (resume1.experience.length < resume2.experience.length) {
    recommendations.push(
      `Expand experience section (Resume 2 has more detail)`
    );
  }

  if (!resume1.summary && resume2.summary) {
    recommendations.push(`Add a professional summary to stand out`);
  }

  const highImpactDiffs = differences.filter((d) => d.impact === "high");
  if (highImpactDiffs.length > 0) {
    recommendations.push(
      `Review critical differences in: ${highImpactDiffs
        .map((d) => d.field)
        .join(", ")}`
    );
  }

  return recommendations;
}

/**
 * Calculate total years of experience
 */
export function calculateTotalYears(
  experience: Array<{ duration?: string; startDate?: string; endDate?: string }>
): number {
  let total = 0;

  experience.forEach((exp) => {
    if (exp.duration) {
      const match = exp.duration.match(/(\d+)/);
      if (match) total += parseInt(match[1], 10);
    } else if (exp.startDate && exp.endDate) {
      const start = new Date(exp.startDate);
      const end = new Date(exp.endDate);
      total += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
    }
  });

  return Math.round(total);
}
