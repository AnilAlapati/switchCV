/**
 * Template Selection Agent
 *
 * An intelligent agent that analyzes resume content and selects
 * the optimal template based on real-world resume UI best practices.
 *
 * Research-backed approach:
 * 1. Content density analysis
 * 2. Career level detection
 * 3. Visual balance prediction
 * 4. Industry-specific conventions
 */

import { DashboardResume } from "@/types";

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ContentAnalysis {
  // Quantitative metrics
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

  // Content density
  totalContentChars: number;
  contentDensity: "minimal" | "light" | "moderate" | "dense" | "very-dense";

  // Qualitative signals
  hasMetrics: boolean;
  hasLeadershipSignals: boolean;
  hasTechnicalDepth: boolean;

  // Career signals
  estimatedYearsExperience: number;
  seniorityLevel: "entry" | "junior" | "mid" | "senior" | "executive";
  roleType: "technical" | "management" | "product" | "creative" | "other";
}

export interface TemplateScore {
  templateId: string;
  scores: {
    contentFit: number; // 0-100: How well content fills the layout
    visualBalance: number; // 0-100: Left/right column balance
    careerMatch: number; // 0-100: Matches seniority expectations
    readability: number; // 0-100: Easy to scan and read
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

// ============================================================================
// Template Characteristics (Based on actual template layouts)
// ============================================================================

interface TemplateProfile {
  id: string;
  name: string;
  layout: "single-column" | "two-column" | "grid" | "bento";
  columnSplit?: string; // e.g., "60/40"
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

const TEMPLATE_PROFILES: TemplateProfile[] = [
  // === FREE TEMPLATES ===
  {
    id: "standard-v1",
    name: "Standard Professional",
    layout: "two-column",
    columnSplit: "60/40",
    tier: "free",
    bestFor: [
      "Mid-level professionals",
      "Balanced experience and skills",
      "Technical roles",
    ],
    avoidWhen: ["Very dense text", "Minimal content", "Executive roles"],
    idealContentDensity: ["light", "moderate"],
    idealSeniority: ["junior", "mid", "senior"],
    idealRoleTypes: ["technical", "other"],
    minExperiences: 1,
    maxExperiences: 4,
    minSkills: 5,
    idealProjectCount: 2,
  },
  {
    id: "modern-creative-v1",
    name: "Modern Creative",
    layout: "single-column",
    tier: "free",
    bestFor: [
      "Entry-level candidates",
      "Creative roles",
      "Minimal content that needs visual appeal",
    ],
    avoidWhen: [
      "Dense experience descriptions",
      "Executive roles",
      "Too much content",
    ],
    idealContentDensity: ["minimal", "light"],
    idealSeniority: ["entry", "junior"],
    idealRoleTypes: ["creative", "product", "other"],
    minExperiences: 0,
    maxExperiences: 2,
    minSkills: 3,
    idealProjectCount: 1,
  },
  {
    id: "executive-v1",
    name: "Executive Traditional",
    layout: "single-column",
    tier: "free",
    bestFor: [
      "Senior/executive roles",
      "Long detailed descriptions",
      "Leadership focus",
      "Dense content",
    ],
    avoidWhen: ["Minimal content", "Entry-level", "Portfolio showcase needed"],
    idealContentDensity: ["moderate", "dense", "very-dense"],
    idealSeniority: ["senior", "executive"],
    idealRoleTypes: ["management", "technical"],
    minExperiences: 2,
    maxExperiences: 10,
    minSkills: 5,
    idealProjectCount: 1,
  },
  {
    id: "masonry-v1",
    name: "Masonry Portfolio",
    layout: "grid",
    tier: "free",
    bestFor: [
      "Project showcase",
      "Balanced skills and projects",
      "Visual portfolio",
    ],
    avoidWhen: [
      "Text-heavy descriptions",
      "Few projects",
      "Executive roles",
      "Very dense content",
    ],
    idealContentDensity: ["light", "moderate"],
    idealSeniority: ["junior", "mid"],
    idealRoleTypes: ["technical", "creative"],
    minExperiences: 1,
    maxExperiences: 3,
    minSkills: 6,
    idealProjectCount: 3,
  },
  // === PREMIUM TEMPLATES ===
  {
    id: "bento-v1",
    name: "Bento",
    layout: "bento",
    tier: "premium",
    bestFor: [
      "Product managers",
      "Designers",
      "Modern tech roles",
      "Visual impact",
      "Well-rounded profiles",
    ],
    avoidWhen: ["Very minimal content", "Traditional industries"],
    idealContentDensity: ["light", "moderate", "dense"],
    idealSeniority: ["mid", "senior"],
    idealRoleTypes: ["product", "creative", "technical"],
    minExperiences: 2,
    maxExperiences: 5,
    minSkills: 5,
    idealProjectCount: 2,
  },
  {
    id: "terminal-v1",
    name: "Terminal",
    layout: "single-column",
    tier: "premium",
    bestFor: [
      "Software engineers",
      "DevOps engineers",
      "Open source contributors",
      "Technical roles",
      "Developer portfolios",
    ],
    avoidWhen: [
      "Non-technical roles",
      "Executive/management",
      "Traditional industries",
    ],
    idealContentDensity: ["light", "moderate", "dense"],
    idealSeniority: ["junior", "mid", "senior"],
    idealRoleTypes: ["technical"],
    minExperiences: 1,
    maxExperiences: 6,
    minSkills: 6,
    idealProjectCount: 2,
  },
  // === ENTERPRISE TEMPLATES ===
  {
    id: "editorial-v1",
    name: "Editorial",
    layout: "two-column",
    columnSplit: "66/33",
    tier: "enterprise",
    bestFor: [
      "Executives",
      "Consultants",
      "Writers",
      "Thought leaders",
      "Magazine-style presentation",
    ],
    avoidWhen: ["Entry-level", "Minimal content", "Technical portfolios"],
    idealContentDensity: ["moderate", "dense", "very-dense"],
    idealSeniority: ["senior", "executive"],
    idealRoleTypes: ["management", "product", "other"],
    minExperiences: 3,
    maxExperiences: 8,
    minSkills: 4,
    idealProjectCount: 2,
  },
  {
    id: "noir-v1",
    name: "Noir",
    layout: "single-column",
    tier: "enterprise",
    bestFor: [
      "C-Suite executives",
      "Founders",
      "VIPs",
      "Premium presentation",
      "Dark mode preference",
    ],
    avoidWhen: ["Entry-level", "Traditional industries", "Minimal content"],
    idealContentDensity: ["moderate", "dense"],
    idealSeniority: ["executive"],
    idealRoleTypes: ["management", "product"],
    minExperiences: 3,
    maxExperiences: 6,
    minSkills: 5,
    idealProjectCount: 2,
  },
];

// ============================================================================
// Content Analysis Functions
// ============================================================================

/**
 * Analyze resume content to extract metrics and signals
 */
export function analyzeResumeContent(resume: DashboardResume): ContentAnalysis {
  // Basic counts
  const summaryWordCount = resume.summary?.split(/\s+/).length || 0;
  const summaryCharCount = resume.summary?.length || 0;
  const experienceCount = resume.experience?.length || 0;
  const skillsCount = resume.skills?.length || 0;
  const projectsCount = resume.projects?.length || 0;
  const educationCount = resume.education?.length || 0;

  // Experience analysis
  const experienceDescriptions =
    resume.experience?.map((exp) => exp.description || "") || [];
  const totalExperienceChars = experienceDescriptions.reduce(
    (sum, desc) => sum + desc.length,
    0,
  );
  const avgDescriptionLength =
    experienceCount > 0 ? totalExperienceChars / experienceCount : 0;
  const maxDescriptionLength = Math.max(
    0,
    ...experienceDescriptions.map((d) => d.length),
  );

  // Project analysis
  const totalProjectChars =
    resume.projects?.reduce(
      (sum, proj) => sum + (proj.description?.length || 0),
      0,
    ) || 0;

  // Total content
  const totalContentChars =
    summaryCharCount + totalExperienceChars + totalProjectChars;

  // Content density classification
  let contentDensity: ContentAnalysis["contentDensity"];
  if (totalContentChars < 500) contentDensity = "minimal";
  else if (totalContentChars < 1000) contentDensity = "light";
  else if (totalContentChars < 2000) contentDensity = "moderate";
  else if (totalContentChars < 3500) contentDensity = "dense";
  else contentDensity = "very-dense";

  // Qualitative signals
  const allText = [
    resume.summary || "",
    ...experienceDescriptions,
    ...(resume.projects?.map((p) => p.description || "") || []),
  ]
    .join(" ")
    .toLowerCase();

  const hasMetrics = /\d+%|\$\d+|\d+x|\d+\+|\d+k|\d+m/i.test(allText);
  const hasLeadershipSignals =
    /\b(led|managed|directed|headed|oversaw|built team|hired|mentored|coached)\b/i.test(
      allText,
    );
  const hasTechnicalDepth =
    /\b(architected|designed system|microservices|distributed|scalab|kubernetes|aws|gcp|database|api|algorithm)\b/i.test(
      allText,
    );

  // Estimate years of experience from dates
  const estimatedYearsExperience = estimateYearsExperience(resume);

  // Determine seniority level
  const seniorityLevel = determineSeniorityLevel(
    resume,
    estimatedYearsExperience,
    hasLeadershipSignals,
  );

  // Determine role type
  const roleType = determineRoleType(resume);

  return {
    summaryWordCount,
    summaryCharCount,
    experienceCount,
    totalExperienceChars,
    avgDescriptionLength,
    maxDescriptionLength,
    skillsCount,
    projectsCount,
    totalProjectChars,
    educationCount,
    totalContentChars,
    contentDensity,
    hasMetrics,
    hasLeadershipSignals,
    hasTechnicalDepth,
    estimatedYearsExperience,
    seniorityLevel,
    roleType,
  };
}

function estimateYearsExperience(resume: DashboardResume): number {
  if (!resume.experience || resume.experience.length === 0) return 0;

  const currentYear = new Date().getFullYear();
  let earliestStart = currentYear;

  for (const exp of resume.experience) {
    if (exp.startDate) {
      const year = parseInt(exp.startDate.split("-")[0], 10);
      if (!isNaN(year) && year < earliestStart) {
        earliestStart = year;
      }
    }
  }

  return Math.max(0, currentYear - earliestStart);
}

function determineSeniorityLevel(
  resume: DashboardResume,
  yearsExp: number,
  hasLeadership: boolean,
): ContentAnalysis["seniorityLevel"] {
  const title = resume.personalInfo?.title?.toLowerCase() || "";

  // Check for explicit executive titles
  if (
    /\b(ceo|cto|cfo|coo|vp|vice president|director|head of|chief)\b/.test(title)
  ) {
    return "executive";
  }

  // Check for senior/principal/staff
  if (
    /\b(principal|staff|distinguished|fellow|senior.*manager)\b/.test(title)
  ) {
    return "executive";
  }

  if (/\b(senior|sr\.|lead|manager)\b/.test(title) || yearsExp >= 5) {
    return hasLeadership ? "senior" : "mid";
  }

  if (yearsExp >= 2 || /\b(ii|2|mid)\b/.test(title)) {
    return "mid";
  }

  if (yearsExp >= 1 || /\b(i|1|junior|associate)\b/.test(title)) {
    return "junior";
  }

  return "entry";
}

function determineRoleType(
  resume: DashboardResume,
): ContentAnalysis["roleType"] {
  const title = resume.personalInfo?.title?.toLowerCase() || "";

  // C-suite and founders are always management
  if (/\b(cto|ceo|cfo|coo|cio|founder|co-founder|cofounder)\b/.test(title)) {
    return "management";
  }

  // Product roles (check BEFORE management to catch "Product Manager")
  if (/\b(product|pm|program)\b/.test(title)) {
    return "product";
  }

  // Management roles (director, vp, manager WITHOUT "product" prefix)
  if (/\b(director|vp|head|chief|lead.*team)\b/.test(title)) {
    return "management";
  }
  // Engineering Manager is still management
  if (/\b(engineering manager|eng.*manager)\b/.test(title)) {
    return "management";
  }
  // Generic manager without product/program prefix
  if (
    /\bmanager\b/.test(title) &&
    !/\b(product|program|project)\b/.test(title)
  ) {
    return "management";
  }

  if (/\b(design|creative|ux|ui|artist)\b/.test(title)) {
    return "creative";
  }

  if (
    /\b(engineer|developer|architect|devops|sre|data|ml|ai|security)\b/.test(
      title,
    )
  ) {
    return "technical";
  }

  return "other";
}

// ============================================================================
// Template Scoring Functions
// ============================================================================

/**
 * Score a template for a given content analysis
 */
function scoreTemplate(
  template: TemplateProfile,
  analysis: ContentAnalysis,
): TemplateScore {
  const scores = {
    contentFit: scoreContentFit(template, analysis),
    visualBalance: scoreVisualBalance(template, analysis),
    careerMatch: scoreCareerMatch(template, analysis),
    readability: scoreReadability(template, analysis),
  };

  // Weighted total (content fit and career match are most important)
  let totalScore =
    scores.contentFit * 0.3 +
    scores.visualBalance * 0.25 +
    scores.careerMatch * 0.3 +
    scores.readability * 0.15;

  // Tiebreaker: Masonry gets a boost when there are 3+ projects (portfolio showcase)
  if (template.id === "masonry-v1" && analysis.projectsCount >= 3) {
    totalScore += 5; // Small boost to break ties in favor of project showcase
  }

  // Confidence based on how well analysis matches template ideal
  const matchingFactors = [
    template.idealContentDensity.includes(analysis.contentDensity),
    template.idealSeniority.includes(analysis.seniorityLevel),
    template.idealRoleTypes.includes(analysis.roleType),
  ].filter(Boolean).length;

  const confidence: TemplateScore["confidence"] =
    matchingFactors >= 3 ? "high" : matchingFactors >= 2 ? "medium" : "low";

  const reasoning = generateReasoning(template, analysis, scores);

  return {
    templateId: template.id,
    scores,
    totalScore: Math.round(totalScore),
    confidence,
    reasoning,
  };
}

function scoreContentFit(
  template: TemplateProfile,
  analysis: ContentAnalysis,
): number {
  let score = 50; // Base score

  // Content density match
  if (template.idealContentDensity.includes(analysis.contentDensity)) {
    score += 25;
  } else {
    // Penalize mismatches
    const densityOrder = [
      "minimal",
      "light",
      "moderate",
      "dense",
      "very-dense",
    ];
    const idealIndex = densityOrder.indexOf(template.idealContentDensity[0]);
    const actualIndex = densityOrder.indexOf(analysis.contentDensity);
    const diff = Math.abs(idealIndex - actualIndex);
    score -= diff * 10;
  }

  // Experience count fit
  if (
    analysis.experienceCount >= template.minExperiences &&
    analysis.experienceCount <= template.maxExperiences
  ) {
    score += 15;
  } else if (analysis.experienceCount > template.maxExperiences) {
    score -= 15; // Too many experiences for this template
  }

  // Skills count fit
  if (analysis.skillsCount >= template.minSkills) {
    score += 10;
  }

  // Project count fit (especially important for masonry)
  if (template.id === "masonry-v1") {
    if (analysis.projectsCount >= 2) score += 15;
    else score -= 20;
  }

  return Math.max(0, Math.min(100, score));
}

function scoreVisualBalance(
  template: TemplateProfile,
  analysis: ContentAnalysis,
): number {
  let score = 70; // Base score

  if (template.layout === "two-column" || template.layout === "grid") {
    // Two-column needs balanced content
    const experienceHeavy = analysis.totalExperienceChars > 1500;
    const hasEnoughSkillsProjects =
      analysis.skillsCount >= 6 || analysis.projectsCount >= 2;

    if (experienceHeavy && !hasEnoughSkillsProjects) {
      score -= 30; // Will have empty right column
    } else if (!experienceHeavy && hasEnoughSkillsProjects) {
      score += 20; // Good balance
    }
  } else {
    // Single column handles any content well
    score += 10;
  }

  // Long descriptions work better in single-column
  if (analysis.maxDescriptionLength > 600) {
    if (template.layout === "single-column") {
      score += 15;
    } else {
      score -= 15;
    }
  }

  return Math.max(0, Math.min(100, score));
}

function scoreCareerMatch(
  template: TemplateProfile,
  analysis: ContentAnalysis,
): number {
  let score = 50;

  // Seniority match
  if (template.idealSeniority.includes(analysis.seniorityLevel)) {
    score += 30;
  } else {
    score -= 20;
  }

  // Role type match
  if (template.idealRoleTypes.includes(analysis.roleType)) {
    score += 20;
  }

  // Leadership signals for executive template
  if (template.id === "executive-v1" && analysis.hasLeadershipSignals) {
    score += 15;
  }

  // CRITICAL: Executives should ALWAYS prefer executive template
  // Even with minimal content, creative template doesn't match executive gravitas
  if (analysis.seniorityLevel === "executive") {
    if (template.id === "executive-v1") {
      score += 25; // Strong bonus for executive template
    } else if (template.id === "modern-creative-v1") {
      score -= 30; // Penalty - creative template doesn't convey authority
    } else if (template.id === "bento-v1") {
      score -= 15; // Executives prefer traditional over trendy
    }
  }

  // Senior management roles also lean toward executive template
  if (
    analysis.seniorityLevel === "senior" &&
    analysis.roleType === "management"
  ) {
    if (template.id === "executive-v1") {
      score += 15;
    }
  }

  // PREMIUM: Bento template - the "Apple aesthetic" for modern professionals
  if (template.id === "bento-v1") {
    // Product roles LOVE the modern visual grid style
    if (analysis.roleType === "product") {
      score += 30; // Strong preference for product people
    }
    // Designers and creative roles also appreciate it
    if (analysis.roleType === "creative") {
      score += 25;
    }
    // Well-rounded profiles with skills + projects work best
    if (analysis.skillsCount >= 5 && analysis.projectsCount >= 1) {
      score += 10;
    }
    // Mid-level professionals benefit most from visual appeal
    if (
      analysis.seniorityLevel === "mid" ||
      analysis.seniorityLevel === "senior"
    ) {
      score += 10;
    }
  }

  // PREMIUM: Terminal for technical roles (except executives)
  if (template.id === "terminal-v1") {
    if (
      analysis.roleType === "technical" &&
      analysis.seniorityLevel !== "executive"
    ) {
      score += 15; // Technical roles get the developer aesthetic
    }
    if (analysis.hasTechnicalDepth) {
      score += 10; // Bonus for technical depth
    }
  }

  // ENTERPRISE: Editorial for thought leaders and executives
  if (template.id === "editorial-v1") {
    // Perfect for executives with lots of content
    if (analysis.seniorityLevel === "executive") {
      score += 25;
    }
    // Long-form content benefits from magazine layout
    if (analysis.avgDescriptionLength > 150) {
      score += 15;
    }
    // Management and product leaders
    if (analysis.roleType === "management" || analysis.roleType === "product") {
      score += 10;
    }
    // Dense content thrives in multi-column layout
    if (
      analysis.contentDensity === "dense" ||
      analysis.contentDensity === "very-dense"
    ) {
      score += 10;
    }
  }

  // ENTERPRISE: Noir for C-suite and founders
  if (template.id === "noir-v1") {
    // THE choice for C-suite
    if (analysis.seniorityLevel === "executive") {
      score += 30;
    }
    // Leadership signals mean this person commands presence
    if (analysis.hasLeadershipSignals) {
      score += 20;
    }
    // Founders and executives with moderate content
    if (
      analysis.contentDensity === "moderate" ||
      analysis.contentDensity === "dense"
    ) {
      score += 10;
    }
    // Penalty for entry-level (mismatch)
    if (
      analysis.seniorityLevel === "entry" ||
      analysis.seniorityLevel === "junior"
    ) {
      score -= 40;
    }
  }

  // Metrics are good for any professional template
  if (analysis.hasMetrics) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

function scoreReadability(
  template: TemplateProfile,
  analysis: ContentAnalysis,
): number {
  let score = 70;

  // Dense content + single column = better readability
  if (
    analysis.contentDensity === "dense" ||
    analysis.contentDensity === "very-dense"
  ) {
    if (template.layout === "single-column") {
      score += 20;
    } else {
      score -= 10;
    }
  }

  // Minimal content + creative template = better visual appeal
  if (analysis.contentDensity === "minimal") {
    if (template.id === "modern-creative-v1") {
      score += 25;
    } else if (template.id === "executive-v1") {
      score -= 20; // Will look empty
    }
  }

  return Math.max(0, Math.min(100, score));
}

function generateReasoning(
  template: TemplateProfile,
  analysis: ContentAnalysis,
  scores: TemplateScore["scores"],
): string {
  const reasons: string[] = [];

  if (scores.contentFit >= 70) {
    reasons.push(
      `Content density (${analysis.contentDensity}) fits well with ${template.name}`,
    );
  }

  if (scores.careerMatch >= 70) {
    reasons.push(
      `${analysis.seniorityLevel}-level ${analysis.roleType} role matches this template's design`,
    );
  }

  if (scores.visualBalance >= 70) {
    reasons.push("Good visual balance between sections");
  }

  if (analysis.hasLeadershipSignals && template.id === "executive-v1") {
    reasons.push("Leadership experience highlighted effectively");
  }

  if (analysis.projectsCount >= 2 && template.id === "masonry-v1") {
    reasons.push("Projects showcased in grid layout");
  }

  return reasons.length > 0
    ? reasons.join(". ") + "."
    : "General fit for this content profile.";
}

// ============================================================================
// Main Agent Function
// ============================================================================

/**
 * Select the best template for a resume based on content analysis
 */
export function selectBestTemplate(
  resume: DashboardResume,
): TemplateRecommendation {
  // Step 1: Analyze content
  const analysis = analyzeResumeContent(resume);

  // Step 2: Score all templates
  const allScores = TEMPLATE_PROFILES.map((template) =>
    scoreTemplate(template, analysis),
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
  resume: DashboardResume,
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
      `${s.templateId}: ${s.totalScore} (content:${s.scores.contentFit} balance:${s.scores.visualBalance} career:${s.scores.careerMatch} read:${s.scores.readability}) [${s.confidence}]`,
  )
  .join("\n")}

=== Recommendation ===
${recommendation.explanation}
`;

  return { ...recommendation, debug };
}
