// src/lib/dashboard/jobSeekerInsights.ts
import type {
  ActionItem,
  JobSeekerMetrics,
  OpportunityInsight,
} from "@/types/dashboard";

const DEFAULT_JOB_METRICS: JobSeekerMetrics = {
  profileViews: 0,
  contactRequests: 0,
  downloads: 0,
  quality: 0,
  lastUpdated: null,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const DAYS_IN_MS = 86_400_000;

function getDaysSince(timestamp: string | null | undefined) {
  if (!timestamp) return null;
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const now = Date.now();
  const diff = now - parsed.getTime();
  if (diff < 0) return 0;
  return Math.floor(diff / DAYS_IN_MS);
}

export function calculateReadinessScore(
  metrics: JobSeekerMetrics | null | undefined,
  hasResume: boolean
) {
  const data = metrics ?? DEFAULT_JOB_METRICS;
  if (!hasResume) return 20;

  const qualityScore = clamp(data.quality, 0, 100) * 0.4; // 40 pts
  const visibilityScore = clamp(data.profileViews, 0, 30) * (20 / 30); // 20 pts
  const interestScore = clamp(data.contactRequests, 0, 10) * (15 / 10); // 15 pts
  const engagementScore = clamp(data.downloads, 0, 10) * (15 / 10); // 15 pts
  const freshnessPenalty = (() => {
    const days = getDaysSince(data.lastUpdated);
    if (days === null) return 10;
    if (days <= 7) return 0;
    if (days <= 21) return 5;
    return 10;
  })();

  const base = 25; // credit for having a resume live
  const score =
    base +
    qualityScore +
    visibilityScore +
    interestScore +
    engagementScore -
    freshnessPenalty;

  return clamp(Math.round(score), 0, 100);
}

export function readinessLabel(score: number) {
  if (score >= 85) return "Interview ready";
  if (score >= 65) return "On track";
  if (score >= 45) return "Momentum building";
  return "Let's get moving";
}

export function formatLastUpdatedMessage(lastUpdated: string | null) {
  const days = getDaysSince(lastUpdated);
  if (days === null) return "No updates logged yet";
  if (days === 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  if (days < 7) return `Updated ${days} days ago`;
  if (days < 30) return `Updated ${days} days ago`; // keep raw count for clarity
  const date = new Date(lastUpdated ?? "");
  return `Last update on ${date.toLocaleDateString()}`;
}

export function buildJobSeekerActionPlan(options: {
  metrics?: JobSeekerMetrics | null;
  hasResume: boolean;
  resumeId?: string | number | null;
  resumeUrl?: string | null;
}): ActionItem[] {
  const { metrics, hasResume, resumeId, resumeUrl } = options;
  const data = metrics ?? DEFAULT_JOB_METRICS;
  const items: ActionItem[] = [];
  const lastUpdatedDays = getDaysSince(data.lastUpdated);

  if (!hasResume) {
    items.push({
      id: "create-resume",
      title: "Create your SwitchCV resume",
      description:
        "Launch a tailored resume in minutes. We will pre-fill the essentials so you can share it today.",
      status: "blocked",
      priority: "high",
      cta: {
        label: "Start now",
        href: "/create-resume",
      },
    });
    // Secondary guidance still useful without resume
    items.push({
      id: "profile-basics",
      title: "Complete your profile basics",
      description:
        "Add a strong headline, target role, and location so recruiters know exactly what you want next.",
      status: "notStarted",
      priority: "medium",
      cta: {
        label: "Update profile",
        href: "/profile",
      },
    });
    return items;
  }

  // Resume exists
  if (data.quality < 70) {
    items.push({
      id: "improve-quality",
      title: "Tighten your resume messaging",
      description:
        "Raise your quality score by refining bullet points and aligning keywords to your target role.",
      status: data.quality < 40 ? "inProgress" : "notStarted",
      priority: "high",
      meta: `Current score ${clamp(data.quality, 0, 100)}%`,
      cta: resumeId
        ? {
            label: "Open editor",
            href: `/resumes/${resumeId}/edit`,
          }
        : undefined,
    });
  }

  if (lastUpdatedDays === null || lastUpdatedDays > 14) {
    items.push({
      id: "refresh-resume",
      title: "Refresh recent achievements",
      description:
        "Keep your latest wins on page one. Hiring managers scan recency first.",
      status: "notStarted",
      priority: "high",
      meta:
        lastUpdatedDays === null
          ? "No updates recorded"
          : `Last update ${lastUpdatedDays} day${
              lastUpdatedDays === 1 ? "" : "s"
            } ago`,
      cta: resumeId
        ? {
            label: "Add update",
            href: `/resumes/${resumeId}/edit`,
          }
        : undefined,
    });
  }

  if (data.profileViews < 10) {
    items.push({
      id: "share-visibility",
      title: "Increase profile visibility",
      description:
        "Share your resume with two recruiters or peers and ask for targeted feedback.",
      status: "notStarted",
      priority: "medium",
      meta: `${data.profileViews} profile view${
        data.profileViews === 1 ? "" : "s"
      } recorded`,
      cta: resumeUrl
        ? {
            label: "Copy resume link",
            href: resumeUrl,
            target: "_blank",
          }
        : undefined,
    });
  }

  if (data.contactRequests === 0) {
    items.push({
      id: "contact-cta",
      title: "Add a clear contact invitation",
      description:
        "Highlight a call-to-action in your summary so interested recruiters know how to reach you.",
      status: "notStarted",
      priority: "medium",
      cta: resumeId
        ? {
            label: "Edit summary",
            href: `/resumes/${resumeId}/edit`,
          }
        : undefined,
    });
  }

  items.push({
    id: "prep-interview",
    title: "Practice your interview stories",
    description:
      "Document three STAR examples for your top accomplishments. Rehearsed stories convert interviews into offers.",
    status: "inProgress",
    priority: "low",
    cta: {
      label: "Outline stories",
      href: "/create-resume", // fallback while dedicated interview prep is shipped
    },
  });

  return items.slice(0, 4);
}

export function buildJobSeekerInsights(
  metrics: JobSeekerMetrics | null | undefined
): OpportunityInsight[] {
  const data = metrics ?? DEFAULT_JOB_METRICS;
  const profileTone =
    data.profileViews >= 15
      ? "positive"
      : data.profileViews === 0
      ? "caution"
      : "info";
  const requestsTone =
    data.contactRequests >= 3
      ? "positive"
      : data.contactRequests === 0
      ? "caution"
      : "info";
  const qualityTone =
    data.quality >= 80 ? "positive" : data.quality < 60 ? "caution" : "info";

  return [
    {
      id: "visibility",
      title: "Visibility",
      metricLabel: "Profile views",
      metricValue: data.profileViews.toString(),
      description:
        profileTone === "positive"
          ? "Great momentum. Keep sharing the link while responses come in."
          : "Share your resume with mentors or recruiters to spark fresh views.",
      tone: profileTone,
    },
    {
      id: "interest",
      title: "Recruiter interest",
      metricLabel: "Contact requests",
      metricValue: data.contactRequests.toString(),
      description:
        requestsTone === "positive"
          ? "Recruiters are engaging. Respond within 24 hours to stay top of mind."
          : "Add a friendly CTA in your summary to invite recruiters to reach out.",
      tone: requestsTone,
    },
    {
      id: "quality",
      title: "Resume quality",
      metricLabel: "Quality score",
      metricValue: `${clamp(data.quality, 0, 100)}%`,
      description:
        qualityTone === "positive"
          ? "Your messaging reads strong. Focus on fresh wins to keep it sharp."
          : "Tweak your headlines and quantify outcomes to lift the quality score.",
      tone: qualityTone,
    },
  ];
}
