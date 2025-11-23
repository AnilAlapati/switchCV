import {
  calculatePipelineScore,
  pipelineLabel,
  formatLastActivity,
  buildRecruiterActionPlan,
  buildRecruiterInsights,
} from "@/lib/dashboard/recruiterInsights";

describe("recruiterInsights", () => {
  describe("calculatePipelineScore", () => {
    it("should calculate score with default metrics", () => {
      const score = calculatePipelineScore(null);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should calculate score with provided metrics", () => {
      const metrics = {
        totalSearches: 40,
        totalProfileViews: 60,
        totalCandidatesInteracted: 30,
        accessRequests: { pending: 0, approved: 0, denied: 0 },
        lastActivityAt: null,
      };
      const score = calculatePipelineScore(metrics);
      // 35 + 30 + 25 - 0 + 20 = 110 -> clamped to 100
      expect(score).toBe(100);
    });

    it("should penalize pending requests", () => {
      const metrics = {
        totalSearches: 40,
        totalProfileViews: 60,
        totalCandidatesInteracted: 30,
        accessRequests: { pending: 10, approved: 0, denied: 0 },
        lastActivityAt: null,
      };
      const score = calculatePipelineScore(metrics);
      // 35 + 30 + 25 - 20 + 20 = 90
      expect(score).toBe(90);
    });
  });

  describe("pipelineLabel", () => {
    it("should return correct labels", () => {
      expect(pipelineLabel(90)).toBe("Pipeline humming");
      expect(pipelineLabel(70)).toBe("Strong momentum");
      expect(pipelineLabel(50)).toBe("Pipeline warming");
      expect(pipelineLabel(30)).toBe("Needs attention");
    });
  });

  describe("formatLastActivity", () => {
    it("should handle null/undefined", () => {
      expect(formatLastActivity(null)).toBe("No activity tracked yet");
    });

    it("should handle today", () => {
      expect(formatLastActivity(new Date().toISOString())).toBe(
        "Touched today"
      );
    });

    it("should handle yesterday", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(formatLastActivity(yesterday.toISOString())).toBe(
        "Touched yesterday"
      );
    });

    it("should handle recent days", () => {
      const recent = new Date();
      recent.setDate(recent.getDate() - 3);
      expect(formatLastActivity(recent.toISOString())).toBe(
        "Active 3 days ago"
      );
    });

    it("should handle older days", () => {
      const old = new Date();
      old.setDate(old.getDate() - 10);
      expect(formatLastActivity(old.toISOString())).toBe(
        "Last touch 10 days ago"
      );
    });
  });

  describe("buildRecruiterActionPlan", () => {
    it("should build plan with defaults", () => {
      const plan = buildRecruiterActionPlan({});
      expect(plan.length).toBeGreaterThan(0);
      expect(plan.some((i) => i.id === "refine-search")).toBe(true);
    });

    it("should include review requests if pending > 0", () => {
      const plan = buildRecruiterActionPlan({
        metrics: {
          totalSearches: 0,
          totalProfileViews: 0,
          totalCandidatesInteracted: 0,
          accessRequests: { pending: 5, approved: 0, denied: 0 },
          lastActivityAt: null,
        },
      });
      expect(plan.some((i) => i.id === "review-requests")).toBe(true);
    });

    it("should include follow-up if interaction < views", () => {
      const plan = buildRecruiterActionPlan({
        metrics: {
          totalSearches: 0,
          totalProfileViews: 10,
          totalCandidatesInteracted: 2,
          accessRequests: { pending: 0, approved: 0, denied: 0 },
          lastActivityAt: null,
        },
      });
      expect(plan.some((i) => i.id === "follow-up")).toBe(true);
    });

    it("should use onLaunchSearch callback", () => {
      const onLaunchSearch = jest.fn();
      const plan = buildRecruiterActionPlan({ onLaunchSearch });
      const searchItem = plan.find((i) => i.id === "refine-search");
      expect(searchItem?.cta?.onClick).toBeDefined();
      searchItem?.cta?.onClick?.();
      expect(onLaunchSearch).toHaveBeenCalled();
    });
  });

  describe("buildRecruiterInsights", () => {
    it("should build insights", () => {
      const insights = buildRecruiterInsights(null);
      expect(insights).toHaveLength(3);
      expect(insights[0].id).toBe("search-activity");
      expect(insights[1].id).toBe("engagement");
      expect(insights[2].id).toBe("approvals");
    });

    it("should adjust tone based on metrics", () => {
      const insights = buildRecruiterInsights({
        totalSearches: 10,
        totalProfileViews: 0,
        totalCandidatesInteracted: 5,
        accessRequests: { pending: 2, approved: 0, denied: 0 },
        lastActivityAt: null,
      });

      expect(insights[0].tone).toBe("info"); // searches > 0
      expect(insights[1].tone).toBe("positive"); // interacted > 0
      expect(insights[2].tone).toBe("caution"); // pending > 0
    });
  });
});
