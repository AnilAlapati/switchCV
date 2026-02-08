/**
 * Template Selection Agent
 *
 * Main entry point for template selection. Uses content analysis
 * and scoring algorithms to select the best resume template.
 *
 * This file has been refactored to use modular components:
 * - types.ts: Type definitions
 * - contentAnalysis.ts: Resume content analysis
 * - templateProfiles.ts: Template configuration
 * - templateScoring.ts: Scoring algorithms
 */

import type { DashboardResume } from "@/types";
import type {
  ContentAnalysis,
  TemplateRecommendation,
} from "./types";
import { analyzeResumeContent } from "./contentAnalysis";
import { TEMPLATE_PROFILES } from "./templateProfiles";
import { scoreTemplate } from "./templateScoring";

// Re-export types for convenience
export type { ContentAnalysis, TemplateScore, TemplateRecommendation } from "./types";

// Re-export analyzeResumeContent for direct use
export { analyzeResumeContent } from "./contentAnalysis";

/**
 * Select the best template for a resume based on content analysis
 */
export function selectBestTemplate(
  resume: DashboardResume
): TemplateRecommendation {
  // Step 1: Analyze content
  const analysis = analyzeResumeContent(resume);

  // Step 2: Score all templates
  const allScores = TEMPLATE_PROFILES.map((template) =>
    scoreTemplate(template, analysis)
  ).sort((a, b) => b.totalScore - a.totalScore);

  // Step 3: Select best template
  const best = allScores[0];
  const secondBest = allScores[1];

  // Generate explanation
  const scoreDiff = best.totalScore - secondBest.totalScore;
  let explanation: string;

  if (scoreDiff > 15) {
    explanation = `**${best.templateId}** is clearly the best choice. ${best.reasoning}`;
  } else if (scoreDiff > 5) {
    explanation = `**${best.templateId}** is recommended over ${secondBest.templateId}. ${best.reasoning}`;
  } else {
    explanation = `**${best.templateId}** and ${secondBest.templateId} are both good options. Going with ${best.templateId} because: ${best.reasoning}`;
  }

  return {
    recommendedTemplate: best.templateId,
    allScores,
    analysis,
    explanation,
  };
}

/**
 * Get template recommendation with detailed debug info
 */
export function getTemplateRecommendationDebug(
  resume: DashboardResume
): TemplateRecommendation & { debug: string } {
  const recommendation = selectBestTemplate(resume);
  const { analysis, allScores } = recommendation;

  const debug = `
=== Content Analysis ===
Summary: ${analysis.summaryWordCount} words (${analysis.summaryCharCount} chars)
Experience: ${analysis.experienceCount} entries (${analysis.totalExperienceChars} chars total)
Avg Description: ${Math.round(analysis.avgDescriptionLength)} chars
Max Description: ${analysis.maxDescriptionLength} chars
Skills: ${analysis.skillsCount}
Projects: ${analysis.projectsCount}
Education: ${analysis.educationCount}

Content Density: ${analysis.contentDensity}
Total Content: ${analysis.totalContentChars} chars

=== Career Signals ===
Years Experience: ~${analysis.estimatedYearsExperience}
Seniority Level: ${analysis.seniorityLevel}
Role Type: ${analysis.roleType}
Has Metrics: ${analysis.hasMetrics}
Has Leadership: ${analysis.hasLeadershipSignals}
Has Tech Depth: ${analysis.hasTechnicalDepth}

=== Template Scores ===
${allScores
      .map(
        (s) =>
          `${s.templateId}: ${s.totalScore} (content:${s.scores.contentFit} balance:${s.scores.visualBalance} career:${s.scores.careerMatch} read:${s.scores.readability}) [${s.confidence}]`
      )
      .join("\n")}

=== Recommendation ===
${recommendation.explanation}
`;

  return { ...recommendation, debug };
}
