import {
  calculateReadinessScore,
  readinessLabel,
  formatLastUpdatedMessage,
  buildJobSeekerActionPlan,
  buildJobSeekerInsights,
} from "@/lib/dashboard/jobSeekerInsights";
import { JobSeekerMetrics } from "@/types/dashboard";

describe("jobSeekerInsights", () => {
  const mockMetrics: JobSeekerMetrics = {
    profileViews: 10,
    contactRequests: 2,
    downloads: 5,
    quality: 75,
    lastUpdated: new Date().toISOString(),
  };

  describe("calculateReadinessScore", () => {
    it("returns 20 if hasResume is false", () => {
      expect(calculateReadinessScore(null, false)).toBe(20);
      expect(calculateReadinessScore(mockMetrics, false)).toBe(20);
    });

    it("calculates score correctly for base case", () => {
      // Base: 25
      // Quality: 75 * 0.4 = 30
      // Visibility: 10 * (20/30) = 6.66
      // Interest: 2 * (15/10) = 3
      // Engagement: 5 * (15/10) = 7.5
      // Freshness: 0 (updated today)
      // Total: 25 + 30 + 6.66 + 3 + 7.5 - 0 = 72.16 -> 72
      const score = calculateReadinessScore(mockMetrics, true);
      expect(score).toBe(72);
    });

    it("applies freshness penalty correctly", () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago -> penalty 5
      const metrics = { ...mockMetrics, lastUpdated: oldDate.toISOString() };

      // Previous score was ~72. With penalty 5, should be ~67.
      const score = calculateReadinessScore(metrics, true);
      expect(score).toBe(67);

      const veryOldDate = new Date();
      veryOldDate.setDate(veryOldDate.getDate() - 30); // 30 days ago -> penalty 10
      const oldMetrics = {
        ...mockMetrics,
        lastUpdated: veryOldDate.toISOString(),
      };

      // Previous score ~72. With penalty 10, should be ~62.
      const oldScore = calculateReadinessScore(oldMetrics, true);
      expect(oldScore).toBe(62);

      const nullDateMetrics = { ...mockMetrics, lastUpdated: null };
      // Null date -> penalty 10
      const nullScore = calculateReadinessScore(nullDateMetrics, true);
      expect(nullScore).toBe(62);
    });

    it("clamps metrics correctly", () => {
      const highMetrics: JobSeekerMetrics = {
        profileViews: 100, // max 30 -> 20 pts
        contactRequests: 50, // max 10 -> 15 pts
        downloads: 50, // max 10 -> 15 pts
        quality: 150, // max 100 -> 40 pts
        lastUpdated: new Date().toISOString(),
      };
      // Base: 25
      // Quality: 40
      // Visibility: 20
      // Interest: 15
      // Engagement: 15
      // Freshness: 0
      // Total: 115 -> clamped to 100
      expect(calculateReadinessScore(highMetrics, true)).toBe(100);
    });

    it("handles null metrics", () => {
      // Default metrics are all 0.
      // Base: 25
      // Quality: 0
      // Visibility: 0
      // Interest: 0
      // Engagement: 0
      // Freshness: null -> 10 penalty
      // Total: 15
      expect(calculateReadinessScore(null, true)).toBe(15);
    });
  });

  describe("readinessLabel", () => {
    it("returns correct labels for score ranges", () => {
      expect(readinessLabel(90)).toBe("Interview ready");
      expect(readinessLabel(85)).toBe("Interview ready");
      expect(readinessLabel(80)).toBe("On track");
      expect(readinessLabel(65)).toBe("On track");
      expect(readinessLabel(60)).toBe("Momentum building");
      expect(readinessLabel(45)).toBe("Momentum building");
      expect(readinessLabel(40)).toBe("Let's get moving");
    });
  });

  describe("formatLastUpdatedMessage", () => {
    it("handles null/undefined", () => {
      expect(formatLastUpdatedMessage(null)).toBe("No updates logged yet");
    });

    it("handles today", () => {
      expect(formatLastUpdatedMessage(new Date().toISOString())).toBe(
        "Updated today"
      );
    });

    it("handles yesterday", () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      expect(formatLastUpdatedMessage(d.toISOString())).toBe(
        "Updated yesterday"
      );
    });

    it("handles recent days", () => {
      const d = new Date();
      d.setDate(d.getDate() - 5);
      expect(formatLastUpdatedMessage(d.toISOString())).toBe(
        "Updated 5 days ago"
      );
    });

    it("handles < 30 days", () => {
      const d = new Date();
      d.setDate(d.getDate() - 20);
      expect(formatLastUpdatedMessage(d.toISOString())).toBe(
        "Updated 20 days ago"
      );
    });

    it("handles > 30 days", () => {
      // Mocking Date.now() might be cleaner but this works if we don't rely on "days ago" logic for > 30
      // The code uses `toLocaleDateString` for > 30 days (actually logic says < 30 returns days ago, else date)
      // Wait, the code says:
      // if (days < 30) return `Updated ${days} days ago`;
      // const date = new Date(lastUpdated ?? "");
      // return `Last update on ${date.toLocaleDateString()}`;

      // So for > 30 days it returns date string.
      // To test this reliably without mocking time, I'll just check if it contains "Last update on"
      // But wait, getDaysSince uses Date.now().
      // Let's just trust the logic for now or mock Date.now if needed.
      // For this test, I'll use a fixed date far in the past.
      expect(formatLastUpdatedMessage("2020-01-01")).toContain(
        "Last update on"
      );
    });

    it("handles invalid date", () => {
      // getDaysSince returns null for invalid date
      expect(formatLastUpdatedMessage("invalid-date")).toBe(
        "No updates logged yet"
      );
    });
  });

  describe("buildJobSeekerActionPlan", () => {
    it("returns onboarding items if hasResume is false", () => {
      const plan = buildJobSeekerActionPlan({ hasResume: false });
      expect(plan).toHaveLength(2);
      expect(plan[0].id).toBe("create-resume");
      expect(plan[1].id).toBe("profile-basics");
    });

    it("returns improvement items for low quality resume", () => {
      const metrics = { ...mockMetrics, quality: 30 };
      const plan = buildJobSeekerActionPlan({
        metrics,
        hasResume: true,
        resumeId: "123",
      });
      const qualityItem = plan.find((i) => i.id === "improve-quality");
      expect(qualityItem).toBeDefined();
      expect(qualityItem?.status).toBe("inProgress");
    });

    it("returns refresh item for old resume", () => {
      const d = new Date();
      d.setDate(d.getDate() - 20);
      const metrics = { ...mockMetrics, lastUpdated: d.toISOString() };
      const plan = buildJobSeekerActionPlan({
        metrics,
        hasResume: true,
        resumeId: "123",
      });
      const refreshItem = plan.find((i) => i.id === "refresh-resume");
      expect(refreshItem).toBeDefined();
    });

    it("returns visibility item for low views", () => {
      const metrics = { ...mockMetrics, profileViews: 5 };
      const plan = buildJobSeekerActionPlan({
        metrics,
        hasResume: true,
        resumeUrl: "http://test.com",
      });
      const visibilityItem = plan.find((i) => i.id === "share-visibility");
      expect(visibilityItem).toBeDefined();
    });

    it("returns contact item for no requests", () => {
      const metrics = { ...mockMetrics, contactRequests: 0 };
      const plan = buildJobSeekerActionPlan({
        metrics,
        hasResume: true,
        resumeId: "123",
      });
      const contactItem = plan.find((i) => i.id === "contact-cta");
      expect(contactItem).toBeDefined();
    });

    it("always includes interview prep item", () => {
      const plan = buildJobSeekerActionPlan({
        metrics: mockMetrics,
        hasResume: true,
      });
      const prepItem = plan.find((i) => i.id === "prep-interview");
      expect(prepItem).toBeDefined();
    });

    it("limits to 4 items", () => {
      // Trigger all conditions
      const metrics = {
        quality: 30,
        lastUpdated: null, // triggers refresh
        profileViews: 0, // triggers visibility
        contactRequests: 0, // triggers contact
        downloads: 0,
      };
      const plan = buildJobSeekerActionPlan({
        metrics,
        hasResume: true,
        resumeId: "123",
        resumeUrl: "url",
      });
      // Potential items: improve-quality, refresh-resume, share-visibility, contact-cta, prep-interview (5 items)
      // Should be sliced to 4
      expect(plan.length).toBeLessThanOrEqual(4);
    });
  });

  describe("buildJobSeekerInsights", () => {
    it("generates insights with correct tones", () => {
      const metrics: JobSeekerMetrics = {
        profileViews: 20, // positive
        contactRequests: 5, // positive
        quality: 90, // positive
        downloads: 0,
        lastUpdated: null,
      };
      const insights = buildJobSeekerInsights(metrics);
      expect(insights).toHaveLength(3);
      expect(insights[0].tone).toBe("positive");
      expect(insights[1].tone).toBe("positive");
      expect(insights[2].tone).toBe("positive");
    });

    it("generates caution tones for low metrics", () => {
      const metrics: JobSeekerMetrics = {
        profileViews: 0, // caution
        contactRequests: 0, // caution
        quality: 50, // caution
        downloads: 0,
        lastUpdated: null,
      };
      const insights = buildJobSeekerInsights(metrics);
      expect(insights[0].tone).toBe("caution");
      expect(insights[1].tone).toBe("caution");
      expect(insights[2].tone).toBe("caution");
    });

    it("generates info tones for mid metrics", () => {
      const metrics: JobSeekerMetrics = {
        profileViews: 10, // info
        contactRequests: 1, // info
        quality: 70, // info
        downloads: 0,
        lastUpdated: null,
      };
      const insights = buildJobSeekerInsights(metrics);
      expect(insights[0].tone).toBe("info");
      expect(insights[1].tone).toBe("info");
      expect(insights[2].tone).toBe("info");
    });
  });
});
