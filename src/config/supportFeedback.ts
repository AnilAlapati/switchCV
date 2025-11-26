export const FEEDBACK_CATEGORIES = [
  { value: "bug", label: "Product Bug" },
  { value: "idea", label: "Feature Idea" },
  { value: "data", label: "Profile/Data Issue" },
  { value: "billing", label: "Billing or Access" },
  { value: "other", label: "General Feedback" },
] as const;

export const FEEDBACK_URGENCY = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "Urgent" },
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]["value"];
export type FeedbackUrgency = (typeof FEEDBACK_URGENCY)[number]["value"];

export const CATEGORY_LABELS: Record<FeedbackCategory, string> =
  FEEDBACK_CATEGORIES.reduce(
    (acc, item) => ({ ...acc, [item.value]: item.label }),
    {} as Record<FeedbackCategory, string>
  );

export const URGENCY_LABELS: Record<FeedbackUrgency, string> =
  FEEDBACK_URGENCY.reduce(
    (acc, item) => ({ ...acc, [item.value]: item.label }),
    {} as Record<FeedbackUrgency, string>
  );

export const DEFAULT_FEEDBACK_CATEGORY: FeedbackCategory = "other";
export const DEFAULT_FEEDBACK_URGENCY: FeedbackUrgency = "normal";
