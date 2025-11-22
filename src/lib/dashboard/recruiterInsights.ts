// src/lib/dashboard/recruiterInsights.ts
import type {
  ActionItem,
  OpportunityInsight,
  RecruiterMetrics,
} from "@/types/dashboard";

const DEFAULT_RECRUITER_METRICS: RecruiterMetrics = {
  totalSearches: 0,
  totalProfileViews: 0,
  totalCandidatesInteracted: 0,
  accessRequests: {
    pending: 0,
    approved: 0,
    denied: 0,
  },
  lastActivityAt: null,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const DAYS_IN_MS = 86_400_000;

function getDaysSince(timestamp: string | null | undefined) {
  if (!timestamp) return null;
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return null;
  const diff = Date.now() - parsed.getTime();
  if (diff < 0) return 0;
  return Math.floor(diff / DAYS_IN_MS);
}

export function calculatePipelineScore(
  metrics: RecruiterMetrics | null | undefined
) {
  const data = metrics ?? DEFAULT_RECRUITER_METRICS;

  const searchScore = clamp(data.totalSearches, 0, 40) * (35 / 40);
  const viewScore = clamp(data.totalProfileViews, 0, 60) * (30 / 60);
  const engagementScore =
    clamp(data.totalCandidatesInteracted, 0, 30) * (25 / 30);
  const pendingPenalty = clamp(data.accessRequests.pending, 0, 10) * 2; // emphasise follow-ups

  const score = searchScore + viewScore + engagementScore - pendingPenalty + 20;
  return clamp(Math.round(score), 0, 100);
}

export function pipelineLabel(score: number) {
  if (score >= 85) return "Pipeline humming";
  if (score >= 65) return "Strong momentum";
  if (score >= 45) return "Pipeline warming";
  return "Needs attention";
}

export function formatLastActivity(lastActivityAt: string | null) {
  const days = getDaysSince(lastActivityAt);
  if (days === null) return "No activity tracked yet";
  if (days === 0) return "Touched today";
  if (days === 1) return "Touched yesterday";
  if (days < 7) return `Active ${days} days ago`;
  return `Last touch ${days} days ago`;
}

interface RecruiterActionPlanOptions {
  metrics?: RecruiterMetrics | null;
  onLaunchSearch?: () => void;
}

export function buildRecruiterActionPlan(
  options: RecruiterActionPlanOptions
): ActionItem[] {
  const { metrics, onLaunchSearch } = options;
  const data = metrics ?? DEFAULT_RECRUITER_METRICS;
  const items: ActionItem[] = [];

  if (data.accessRequests.pending > 0) {
    items.push({
      id: "review-requests",
      title: "Review pending access requests",
      description:
        "Unlock resumes that are waiting on your approval so candidates hear back quickly.",
      status: "inProgress",
      priority: "high",
      meta: `${data.accessRequests.pending} pending`,
    });
  }

  if (data.totalCandidatesInteracted < data.totalProfileViews) {
    items.push({
      id: "follow-up",
      title: "Follow up with viewed candidates",
      description:
        "Send a quick note to the most promising profiles you opened this week.",
      status: "notStarted",
      priority: "medium",
      meta: `${data.totalCandidatesInteracted} of ${data.totalProfileViews} views contacted`,
    });
  }

  items.push({
    id: "refine-search",
    title: "Run a focused search",
    description:
      "Use premium filters for skills, location, and experience to uncover fresh talent.",
    status: "notStarted",
    priority: "medium",
    cta: onLaunchSearch
      ? {
          label: "Open search",
          onClick: onLaunchSearch,
        }
      : {
          label: "Open search",
          href: "/recruiter/search",
        },
  });

  items.push({
    id: "nurture-pipeline",
    title: "Tag candidates for follow-up",
    description:
      "Add notes and status tags so you can quickly circle back when roles open up.",
    status: "inProgress",
    priority: "low",
  });

  return items.slice(0, 4);
}

export function buildRecruiterInsights(
  metrics: RecruiterMetrics | null | undefined
): OpportunityInsight[] {
  const data = metrics ?? DEFAULT_RECRUITER_METRICS;
  const pending = data.accessRequests.pending;

  return [
    {
      id: "search-activity",
      title: "Search activity",
      metricLabel: "Searches",
      metricValue: data.totalSearches.toString(),
      description:
        data.totalSearches > 0
          ? "Keep iterating filters weekly to surface new candidates."
          : "Kick off a search to populate your pipeline.",
      tone: data.totalSearches > 0 ? "info" : "caution",
    },
    {
      id: "engagement",
      title: "Candidate engagement",
      metricLabel: "Candidates contacted",
      metricValue: data.totalCandidatesInteracted.toString(),
      description:
        data.totalCandidatesInteracted > 0
          ? "Great outreach effort. Log follow-up dates to stay organised."
          : "Message the top profiles you viewed to start conversations.",
      tone: data.totalCandidatesInteracted > 0 ? "positive" : "info",
    },
    {
      id: "approvals",
      title: "Access requests",
      metricLabel: "Pending approvals",
      metricValue: pending.toString(),
      description:
        pending > 0
          ? "Approve or decline pending requests to keep candidates informed."
          : "No outstanding requests. Great responsiveness!",
      tone: pending > 0 ? "caution" : "positive",
    },
  ];
}
