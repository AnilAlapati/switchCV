/**
 * Gap Analysis Engine
 * Analyze skill gaps between user inventory and job requirements
 */

import {
  Skill,
  SkillInventory,
  JobRequirement,
  JobPosting,
  SkillGap,
  GapAnalysisReport,
  ProficiencyLevel,
  LearningResource,
  LearningRecommendation,
} from "./skillMatrix.types";

const proficiencyHierarchy: Record<ProficiencyLevel, number> = {
  [ProficiencyLevel.BEGINNER]: 1,
  [ProficiencyLevel.INTERMEDIATE]: 2,
  [ProficiencyLevel.ADVANCED]: 3,
  [ProficiencyLevel.EXPERT]: 4,
};

/**
 * Calculate gap between user's current and required proficiency
 */
function calculateGapSize(
  userProficiency: ProficiencyLevel | null,
  requiredProficiency: ProficiencyLevel
): number {
  const userLevel = userProficiency ? proficiencyHierarchy[userProficiency] : 0;
  const requiredLevel = proficiencyHierarchy[requiredProficiency];

  return Math.max(0, requiredLevel - userLevel);
}

/**
 * Analyze gap for a single skill requirement
 */
export function analyzeSkillGap(
  skillRequirement: JobRequirement,
  userSkill: Skill | undefined,
  learningPath?: LearningResource[]
): SkillGap {
  const userProficiency = userSkill?.proficiencyLevel || null;
  const gap = calculateGapSize(
    userProficiency,
    skillRequirement.minimumProficiency
  );

  const isCritical = gap > 2 && skillRequirement.importance === "must-have";

  return {
    skill: {
      ...skillRequirement.skill,
      id: skillRequirement.skill.id || `skill_${Date.now()}`,
    },
    userProficiency,
    requiredProficiency: skillRequirement.minimumProficiency,
    gap,
    gapDescription: getGapDescription(
      userProficiency,
      skillRequirement.minimumProficiency
    ),
    isCritical,
    learningPath: learningPath || [],
  };
}

/**
 * Generate human-readable gap description
 */
function getGapDescription(
  userProficiency: ProficiencyLevel | null,
  requiredProficiency: ProficiencyLevel
): string {
  if (!userProficiency) {
    return `No experience. Need to reach ${requiredProficiency} level.`;
  }

  const userLevel = proficiencyHierarchy[userProficiency];
  const requiredLevel = proficiencyHierarchy[requiredProficiency];

  if (userLevel >= requiredLevel) {
    return `Meet requirement. Currently ${userProficiency}, need ${requiredProficiency}.`;
  }

  const gap = requiredLevel - userLevel;
  const descriptions: Record<number, string> = {
    1: "Small gap - upgrade skills slightly",
    2: "Medium gap - significant skill development needed",
    3: "Large gap - extensive learning required",
    4: "No experience - complete skill acquisition needed",
  };

  return descriptions[gap] || "Unknown gap level";
}

/**
 * Analyze all gaps for a job posting
 */
export function performGapAnalysis(
  inventory: SkillInventory,
  jobPosting: JobPosting
): GapAnalysisReport {
  const skillGaps: SkillGap[] = [];
  let totalGap = 0;
  let criticalGapsCount = 0;

  for (const requirement of jobPosting.requirements) {
    const userSkill = inventory.skills.find(
      (s) => s.name.toLowerCase() === requirement.skill.name.toLowerCase()
    );

    const gap = analyzeSkillGap(requirement, userSkill);
    skillGaps.push(gap);

    totalGap += gap.gap;
    if (gap.isCritical) {
      criticalGapsCount++;
    }
  }

  // Calculate overall readiness
  const totalRequired = jobPosting.requirements.length * 4; // 4 is max proficiency level
  const overallReadiness = Math.max(0, 100 - (totalGap / totalRequired) * 100);

  // Identify strengths (skills user has that exceed requirements)
  const strengths = inventory.skills.filter((skill) => {
    const requirement = jobPosting.requirements.find(
      (r) => r.skill.name.toLowerCase() === skill.name.toLowerCase()
    );

    return (
      requirement &&
      proficiencyHierarchy[skill.proficiencyLevel] >
        proficiencyHierarchy[requirement.minimumProficiency]
    );
  });

  // Generate recommendations
  const recommendations = generateRecommendations(skillGaps);

  // Calculate estimated time to ready (in days)
  const estimatedTimeToReady = calculateTimeToReady(skillGaps);

  // Calculate match percentage
  const matchPercentage = calculateMatchPercentage(
    skillGaps,
    jobPosting.requirements
  );

  return {
    id: generateReportId(),
    userId: inventory.userId,
    jobPostingId: jobPosting.id,
    jobTitle: jobPosting.title,
    analyzedAt: new Date(),
    overallReadiness: Math.round(overallReadiness),
    skillGaps,
    matchPercentage,
    criticalGapsCount,
    strengths,
    recommendations,
    estimatedTimeToReady,
  };
}

/**
 * Generate learning recommendations
 */
function generateRecommendations(
  skillGaps: SkillGap[]
): LearningRecommendation[] {
  return skillGaps
    .filter((gap) => gap.gap > 0)
    .sort((a, b) => {
      // Sort by gap size and criticality
      if (a.isCritical && !b.isCritical) return -1;
      if (!a.isCritical && b.isCritical) return 1;
      return b.gap - a.gap;
    })
    .map((gap) => ({
      skill: gap.skill,
      priority: gap.isCritical ? "high" : gap.gap > 1 ? "medium" : "low",
      resources: gap.learningPath || generateDefaultLearningResources(gap),
      suggestedPath: generateSuggestedPath(gap),
      estimatedTimeframe: estimateTimeframe(gap.gap),
    }));
}

/**
 * Generate default learning resources for a skill gap
 */
function generateDefaultLearningResources(gap: SkillGap): LearningResource[] {
  const baseResources: Record<string, LearningResource[]> = {
    technical: [
      {
        id: `res_${Date.now()}_1`,
        title: `Complete ${gap.skill.name} Masterclass`,
        type: "course",
        difficulty: "intermediate",
        estimatedHours: 30,
        provider: "Udemy",
      },
      {
        id: `res_${Date.now()}_2`,
        title: `${gap.skill.name} Official Documentation`,
        type: "tutorial",
        difficulty: "intermediate",
        estimatedHours: 20,
      },
      {
        id: `res_${Date.now()}_3`,
        title: `Build Project with ${gap.skill.name}`,
        type: "project",
        difficulty: "advanced",
        estimatedHours: 40,
      },
    ],
    "soft-skills": [
      {
        id: `res_${Date.now()}_1`,
        title: `${gap.skill.name} Professional Development Course`,
        type: "course",
        difficulty: "beginner",
        estimatedHours: 20,
      },
      {
        id: `res_${Date.now()}_2`,
        title: `${gap.skill.name} Book: Industry Best Practices`,
        type: "book",
        difficulty: "intermediate",
        estimatedHours: 15,
      },
    ],
  };

  return baseResources[gap.skill.category] || baseResources.technical;
}

/**
 * Generate suggested learning path
 */
function generateSuggestedPath(gap: SkillGap): string {
  const gap_size = gap.gap;

  if (gap_size >= 3) {
    return "Foundation → Intermediate → Advanced → Practice";
  } else if (gap_size === 2) {
    return "Core Concepts → Intermediate Projects → Real-world Practice";
  } else {
    return "Skill Refinement → Advanced Topics → Expert Application";
  }
}

/**
 * Estimate timeframe for skill development
 */
function estimateTimeframe(gapSize: number): string {
  const estimates: Record<number, string> = {
    1: "2-4 weeks",
    2: "1-2 months",
    3: "2-3 months",
    4: "3-6 months",
  };

  return estimates[gapSize] || "Variable";
}

/**
 * Calculate time to ready (in days)
 */
function calculateTimeToReady(skillGaps: SkillGap[]): number {
  const criticalGaps = skillGaps.filter((g) => g.isCritical);

  if (criticalGaps.length === 0) {
    return 0;
  }

  // Estimate hours per gap
  const estimatedHours = skillGaps.reduce((sum, gap) => {
    const hoursPerLevel = gap.isCritical ? 50 : 30;
    return sum + gap.gap * hoursPerLevel;
  }, 0);

  // Assuming 10 hours per week learning
  const weeks = Math.ceil(estimatedHours / 10);
  return Math.ceil(weeks * 7);
}

/**
 * Calculate match percentage
 */
function calculateMatchPercentage(
  skillGaps: SkillGap[],
  requirements: JobRequirement[]
): number {
  if (requirements.length === 0) return 100;

  let matchScore = 0;

  for (const gap of skillGaps) {
    const requirement = requirements.find(
      (r) => r.skill.name === gap.skill.name
    );

    if (!requirement) continue;

    if (gap.gap === 0) {
      // Perfect match
      matchScore += requirement.importance === "must-have" ? 100 : 50;
    } else if (gap.gap <= 1) {
      // Close match
      matchScore += requirement.importance === "must-have" ? 50 : 25;
    }
    // Gap > 1 contributes 0
  }

  return Math.min(100, Math.round((matchScore / requirements.length) * 100));
}

/**
 * Compare multiple job postings and rank by fit
 */
export function compareJobFit(
  inventory: SkillInventory,
  jobPostings: JobPosting[]
): Array<{ job: JobPosting; report: GapAnalysisReport }> {
  return jobPostings
    .map((job) => ({
      job,
      report: performGapAnalysis(inventory, job),
    }))
    .sort((a, b) => b.report.matchPercentage - a.report.matchPercentage);
}

// Helper function
function generateReportId(): string {
  return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
