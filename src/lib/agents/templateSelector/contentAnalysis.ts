import type { DashboardResume } from "@/types";
import type { ContentAnalysis } from "./types";

export function analyzeResumeContent(resume: DashboardResume): ContentAnalysis {
  const summaryWordCount = resume.summary?.split(/\s+/).length || 0;
  const summaryCharCount = resume.summary?.length || 0;
  const experienceCount = resume.experience?.length || 0;
  const skillsCount = resume.skills?.length || 0;
  const projectsCount = resume.projects?.length || 0;
  const educationCount = resume.education?.length || 0;

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
    ...experienceDescriptions.map((description) => description.length),
  );

  const totalProjectChars =
    resume.projects?.reduce(
      (sum, project) => sum + (project.description?.length || 0),
      0,
    ) || 0;

  const totalContentChars =
    summaryCharCount + totalExperienceChars + totalProjectChars;

  let contentDensity: ContentAnalysis["contentDensity"];
  if (totalContentChars < 500) contentDensity = "minimal";
  else if (totalContentChars < 1000) contentDensity = "light";
  else if (totalContentChars < 2000) contentDensity = "moderate";
  else if (totalContentChars < 3500) contentDensity = "dense";
  else contentDensity = "very-dense";

  const allText = [
    resume.summary || "",
    ...experienceDescriptions,
    ...(resume.projects?.map((project) => project.description || "") || []),
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

  const estimatedYearsExperience = estimateYearsExperience(resume);
  const seniorityLevel = determineSeniorityLevel(
    resume,
    estimatedYearsExperience,
    hasLeadershipSignals,
  );
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

  for (const experience of resume.experience) {
    if (experience.startDate) {
      const year = parseInt(experience.startDate.split("-")[0], 10);
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

  if (/\b(ceo|cto|cfo|coo|vp|vice president|director|head of|chief)\b/.test(title)) {
    return "executive";
  }

  if (/\b(principal|staff|distinguished|fellow|senior.*manager)\b/.test(title)) {
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

function determineRoleType(resume: DashboardResume): ContentAnalysis["roleType"] {
  const title = resume.personalInfo?.title?.toLowerCase() || "";

  if (/\b(cto|ceo|cfo|coo|cio|founder|co-founder|cofounder)\b/.test(title)) {
    return "management";
  }

  if (/\b(product|pm|program)\b/.test(title)) {
    return "product";
  }

  if (/\b(director|vp|head|chief|lead.*team)\b/.test(title)) {
    return "management";
  }

  if (/\b(engineering manager|eng.*manager)\b/.test(title)) {
    return "management";
  }

  if (/\bmanager\b/.test(title) && !/\b(product|program|project)\b/.test(title)) {
    return "management";
  }

  if (/\b(design|creative|ux|ui|artist)\b/.test(title)) {
    return "creative";
  }

  if (/\b(engineer|developer|architect|devops|sre|data|ml|ai|security)\b/.test(title)) {
    return "technical";
  }

  return "other";
}
