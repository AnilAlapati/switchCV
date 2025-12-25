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
  tier?: string;
  resumeData?: any;
  userProfile?: any;
}): ActionItem[] {
  const {
    metrics,
    hasResume,
    resumeId,
    resumeUrl,
    tier,
    resumeData,
    userProfile,
  } = options;
  const data = metrics ?? DEFAULT_JOB_METRICS;
  const items: ActionItem[] = [];
  const lastUpdatedDays = getDaysSince(data.lastUpdated);
  const isBasic = tier === "basic";
  const premiumTooltip =
    "AI Edit feature is available for Premium or Enterprise users";

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
  // 1. Quantify Impact (High Priority)
  const hasNumbers = resumeData?.experience?.some((exp: any) =>
    /\d+%|\d+\s?%|\$\d+|\d+\s?USD|\d+\+/.test(exp.description || "")
  );
  if (!hasNumbers && hasResume) {
    items.push({
      id: "quantify-impact",
      title: "Quantify your impact",
      description:
        "Recruiters love numbers. Add percentages, dollar amounts, or headcounts to your bullet points to prove your value.",
      status: "notStarted",
      priority: "high",
      cta: resumeId
        ? {
          label: "Add metrics",
          href: isBasic ? undefined : `/resumes/${resumeId}/edit`,
          disabled: isBasic,
          tooltip: isBasic ? premiumTooltip : undefined,
        }
        : undefined,
    });
  }

  // 2. Portfolio/Projects check
  const hasProjects = resumeData?.projects?.length > 0;
  if (!hasProjects && hasResume) {
    items.push({
      id: "add-projects",
      title: "Showcase your projects",
      description:
        "Add a recent project or link to your GitHub to provide concrete proof of your technical skills.",
      status: "notStarted",
      priority: "medium",
      cta: resumeId
        ? {
          label: "Add projects",
          href: isBasic ? undefined : `/resumes/${resumeId}/edit`,
          disabled: isBasic,
          tooltip: isBasic ? premiumTooltip : undefined,
        }
        : undefined,
    });
  }

  // 3. Profile Picture check
  if (userProfile && !userProfile.photoURL) {
    items.push({
      id: "add-photo",
      title: "Add a profile photo",
      description:
        "Profiles with photos get 14x more views. Upload a professional headshot to build trust with recruiters.",
      status: "notStarted",
      priority: "medium",
      cta: {
        label: "Upload photo",
        href: "/profile",
      },
    });
  }

  // 4. Share on LinkedIn
  if (hasResume && resumeUrl) {
    items.push({
      id: "share-linkedin",
      title: "Share on LinkedIn",
      description:
        "Broadcast your availability. Sharing your SwitchCV link on LinkedIn increases visibility by up to 40%.",
      status: "notStarted",
      priority: "high",
      cta: {
        label: "Share now",
        href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
          resumeUrl
        )}`,
        target: "_blank",
      },
    });
  }

  // 5. Quality check
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
          href: isBasic ? undefined : `/resumes/${resumeId}/edit`,
          disabled: isBasic,
          tooltip: isBasic ? premiumTooltip : undefined,
        }
        : undefined,
    });
  }

  // 6. Freshness check
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
          : `Last update ${lastUpdatedDays} day${lastUpdatedDays === 1 ? "" : "s"
          } ago`,
      cta: resumeId
        ? {
          label: "Add update",
          href: isBasic ? undefined : `/resumes/${resumeId}/edit`,
          disabled: isBasic,
          tooltip: isBasic ? premiumTooltip : undefined,
        }
        : undefined,
    });
  }

  // 7. Download PDF
  if (hasResume && resumeId) {
    items.push({
      id: "download-pdf",
      title: "Download your PDF",
      description:
        "Keep a local copy of your latest resume ready for offline applications or email attachments.",
      status: "notStarted",
      priority: "low",
      cta: {
        label: "View & Download",
        href: `/resumes/${resumeId}`,
        target: "_blank",
      },
    });
  }

  // 8. Interview Prep
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
