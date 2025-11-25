/**
 * Core Resume Comparison Engine
 * Main comparison logic and scoring
 */

import {
  Resume,
  ComparisonResult,
  SectionComparison,
  ComparisonDetail,
} from "./resumeComparison.types";
import {
  extractDifferences,
  extractSimilarities,
  generateRecommendations,
  calculateTotalYears,
} from "./resumeComparisonUtils";

/**
 * Compare two resumes and return detailed results
 */
export function compareResumes(
  resume1: Resume,
  resume2: Resume
): ComparisonResult {
  const sections = [
    compareBasicInfo(resume1, resume2),
    compareSkills(resume1, resume2),
    compareExperience(resume1, resume2),
    compareEducation(resume1, resume2),
  ];

  const overallScore = calculateOverallScore(sections);
  const differences = extractDifferences(resume1, resume2);
  const similarities = extractSimilarities(resume1, resume2);
  const recommendations = generateRecommendations(
    resume1,
    resume2,
    differences
  );

  return {
    resumeIds: [resume1.id, resume2.id],
    overallScore,
    sections,
    differences,
    similarities,
    recommendations,
  };
}

/**
 * Compare basic info sections
 */
function compareBasicInfo(resume1: Resume, resume2: Resume): SectionComparison {
  const titleMatch =
    resume1.title.toLowerCase() === resume2.title.toLowerCase();
  const summaryLength1 = resume1.summary?.length || 0;
  const summaryLength2 = resume2.summary?.length || 0;

  const details: ComparisonDetail[] = [
    {
      field: "Job Title",
      value1: resume1.title,
      value2: resume2.title,
      status: titleMatch ? "same" : "different",
      score: titleMatch ? 100 : 50,
    },
    {
      field: "Summary",
      value1: summaryLength1 > 0 ? "Present" : "Missing",
      value2: summaryLength2 > 0 ? "Present" : "Missing",
      status: summaryLength1 > 0 && summaryLength2 > 0 ? "same" : "different",
      score: Math.min(100, Math.max(summaryLength1, summaryLength2) / 2),
    },
  ];

  const avgScore =
    details.reduce((sum, d) => sum + d.score, 0) / details.length;

  return {
    section: "Basic Info",
    score1: avgScore,
    score2: avgScore,
    details,
  };
}

/**
 * Compare skills sections
 */
function compareSkills(resume1: Resume, resume2: Resume): SectionComparison {
  const skills1 = new Set(resume1.skills.map((s) => s.toLowerCase()));
  const skills2 = new Set(resume2.skills.map((s) => s.toLowerCase()));

  const commonSkills = Array.from(skills1).filter((s) => skills2.has(s));
  const unique1 = Array.from(skills1).filter((s) => !skills2.has(s)).length;
  const unique2 = Array.from(skills2).filter((s) => !skills1.has(s)).length;

  const score1 = (commonSkills.length / Math.max(skills1.size, 1)) * 100;
  const score2 = (commonSkills.length / Math.max(skills2.size, 1)) * 100;

  const details: ComparisonDetail[] = [
    {
      field: "Total Skills",
      value1: resume1.skills.length.toString(),
      value2: resume2.skills.length.toString(),
      status:
        resume1.skills.length === resume2.skills.length ? "same" : "different",
      score: Math.min(
        100,
        (Math.min(resume1.skills.length, resume2.skills.length) /
          Math.max(resume1.skills.length, resume2.skills.length, 1)) *
          100
      ),
    },
    {
      field: "Common Skills",
      value1: commonSkills.length.toString(),
      value2: commonSkills.length.toString(),
      status: "same",
      score: commonSkills.length > 0 ? 100 : 50,
    },
    {
      field: "Unique (Resume 1)",
      value1: unique1.toString(),
      value2: "-",
      status: "different",
      score: 70,
    },
    {
      field: "Unique (Resume 2)",
      value1: "-",
      value2: unique2.toString(),
      status: "different",
      score: 70,
    },
  ];

  return {
    section: "Skills",
    score1,
    score2,
    details,
  };
}

/**
 * Compare experience sections
 */
function compareExperience(
  resume1: Resume,
  resume2: Resume
): SectionComparison {
  const totalYears1 = calculateTotalYears(resume1.experience);
  const totalYears2 = calculateTotalYears(resume2.experience);

  const details: ComparisonDetail[] = [
    {
      field: "Experience Entries",
      value1: resume1.experience.length.toString(),
      value2: resume2.experience.length.toString(),
      status:
        resume1.experience.length === resume2.experience.length
          ? "same"
          : "different",
      score: Math.min(
        100,
        (Math.min(resume1.experience.length, resume2.experience.length) /
          Math.max(resume1.experience.length, resume2.experience.length, 1)) *
          100
      ),
    },
    {
      field: "Career Depth (Years)",
      value1: `${totalYears1}`,
      value2: `${totalYears2}`,
      status: totalYears1 === totalYears2 ? "same" : "different",
      score:
        totalYears1 === 0 && totalYears2 === 0
          ? 50
          : (Math.min(totalYears1, totalYears2) /
              Math.max(totalYears1, totalYears2, 1)) *
            100,
    },
  ];

  const avgScore =
    details.reduce((sum, d) => sum + d.score, 0) / details.length;

  return {
    section: "Experience",
    score1: avgScore,
    score2: avgScore,
    details,
  };
}

/**
 * Compare education sections
 */
function compareEducation(resume1: Resume, resume2: Resume): SectionComparison {
  const edu1Degrees = resume1.education.map((e) => e.degree.toLowerCase());
  const edu2Degrees = resume2.education.map((e) => e.degree.toLowerCase());
  const commonDegrees = edu1Degrees.filter((d) =>
    edu2Degrees.includes(d)
  ).length;

  const details: ComparisonDetail[] = [
    {
      field: "Education Entries",
      value1: resume1.education.length.toString(),
      value2: resume2.education.length.toString(),
      status:
        resume1.education.length === resume2.education.length
          ? "same"
          : "different",
      score: Math.min(
        100,
        (Math.min(resume1.education.length, resume2.education.length) /
          Math.max(resume1.education.length, resume2.education.length, 1)) *
          100
      ),
    },
    {
      field: "Common Degrees",
      value1: commonDegrees.toString(),
      value2: commonDegrees.toString(),
      status: "same",
      score:
        (commonDegrees / Math.max(edu1Degrees.length, edu2Degrees.length, 1)) *
        100,
    },
  ];

  const avgScore =
    details.reduce((sum, d) => sum + d.score, 0) / details.length;

  return {
    section: "Education",
    score1: avgScore,
    score2: avgScore,
    details,
  };
}

/**
 * Calculate overall comparison score
 */
function calculateOverallScore(sections: SectionComparison[]): number {
  if (sections.length === 0) return 0;

  const sectionWeights: { [key: string]: number } = {
    "Basic Info": 0.15,
    Skills: 0.35,
    Experience: 0.35,
    Education: 0.15,
  };

  let weightedSum = 0;
  let totalWeight = 0;

  sections.forEach((section) => {
    const weight = sectionWeights[section.section] || 0.1;
    const sectionAvgScore = (section.score1 + section.score2) / 2;
    weightedSum += sectionAvgScore * weight;
    totalWeight += weight;
  });

  return Math.round(weightedSum / totalWeight);
}

/**
 * Get score for comparison (0-100)
 */
export function calculateComparisonScore(
  resume1: Resume,
  resume2: Resume
): number {
  return compareResumes(resume1, resume2).overallScore;
}
