import {
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
      expect(formatLastUpdatedMessage("2020-01-01")).toContain(
        "Last update on"
      );
    });

    it("handles invalid date", () => {
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

    it("limits to 4 items", () => {
      const metrics = {
        quality: 30,
        lastUpdated: null,
        profileViews: 0,
        contactRequests: 0,
        downloads: 0,
      };
      const plan = buildJobSeekerActionPlan({
        metrics,
        hasResume: true,
        resumeId: "123",
        resumeUrl: "url",
      });
      expect(plan.length).toBeLessThanOrEqual(4);
    });
  });

  describe("buildJobSeekerInsights", () => {
    it("generates insights with correct tones", () => {
      const metrics: JobSeekerMetrics = {
        profileViews: 20,
        contactRequests: 5,
        quality: 90,
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
        profileViews: 0,
        contactRequests: 0,
        quality: 50,
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
        profileViews: 10,
        contactRequests: 1,
        quality: 70,
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
