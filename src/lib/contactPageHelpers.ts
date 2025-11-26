import type { FeedbackCategory } from "@/config/supportFeedback";

export const CATEGORY_HELP_TEXT: Record<FeedbackCategory, string> = {
  bug: "Report issues that block resume creation, recruiter flows, or analytics.",
  idea: "Suggest improvements, AI prompts, or UI workflows you'd like to see.",
  data: "Flag profile inaccuracies, missing resumes, or privacy concerns.",
  billing: "Questions about access tiers, recruiter credits, or subscription limits.",
  other: "Anything else you'd like the team to review.",
};
