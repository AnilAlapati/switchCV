import {
  DEFAULT_JOB_METRICS,
  DEFAULT_RECRUITER_METRICS,
  normalizeJobSeekerMetrics,
  normalizeRecruiterMetrics,
} from "@/app/dashboard/metricsDefaults";

describe("metricsDefaults", () => {
  describe("normalizeJobSeekerMetrics", () => {
    it("returns defaults for null/undefined", () => {
      expect(normalizeJobSeekerMetrics(null)).toEqual(DEFAULT_JOB_METRICS);
      expect(normalizeJobSeekerMetrics(undefined)).toEqual(DEFAULT_JOB_METRICS);
    });

    it("merges partial data with defaults", () => {
      const partial = { profileViews: 10 };
      const expected = { ...DEFAULT_JOB_METRICS, profileViews: 10 };
      expect(normalizeJobSeekerMetrics(partial)).toEqual(expected);
    });

    it("preserves all fields", () => {
      const full = {
        profileViews: 1,
        contactRequests: 2,
        downloads: 3,
        quality: 4,
        lastUpdated: "2023-01-01",
      };
      expect(normalizeJobSeekerMetrics(full)).toEqual(full);
    });
  });

  describe("normalizeRecruiterMetrics", () => {
    it("returns defaults for null/undefined", () => {
      expect(normalizeRecruiterMetrics(null)).toEqual(
        DEFAULT_RECRUITER_METRICS
      );
      expect(normalizeRecruiterMetrics(undefined)).toEqual(
        DEFAULT_RECRUITER_METRICS
      );
    });

    it("merges partial data with defaults", () => {
      const partial = { totalSearches: 10 };
      const expected = { ...DEFAULT_RECRUITER_METRICS, totalSearches: 10 };
      expect(normalizeRecruiterMetrics(partial)).toEqual(expected);
    });

    it("handles nested accessRequests", () => {
      const partial = {
        accessRequests: { pending: 5 },
      } as any;
      const expected = {
        ...DEFAULT_RECRUITER_METRICS,
        accessRequests: { pending: 5, approved: 0, denied: 0 },
      };
      expect(normalizeRecruiterMetrics(partial)).toEqual(expected);
    });
  });
});
