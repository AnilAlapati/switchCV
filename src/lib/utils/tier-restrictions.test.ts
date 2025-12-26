import {
  getTierRestrictionMessage,
  hasFeatureAccess,
  getFeatureRestrictionMessage,
  TIER_RESTRICTION_MESSAGES,
} from "./tier-restrictions";

describe("tier-restrictions", () => {
  describe("getTierRestrictionMessage", () => {
    it("should return the correct message for each key", () => {
      expect(getTierRestrictionMessage("AI_EDIT")).toBe(
        TIER_RESTRICTION_MESSAGES.AI_EDIT
      );
      expect(getTierRestrictionMessage("PREMIUM_FEATURE")).toBe(
        TIER_RESTRICTION_MESSAGES.PREMIUM_FEATURE
      );
      expect(getTierRestrictionMessage("ENTERPRISE_FEATURE")).toBe(
        TIER_RESTRICTION_MESSAGES.ENTERPRISE_FEATURE
      );
    });
  });

  describe("hasFeatureAccess", () => {
    it("should return false if userTier is null or undefined", () => {
      expect(hasFeatureAccess(null, "premium")).toBe(false);
      expect(hasFeatureAccess(undefined, "premium")).toBe(false);
    });

    it("should handle enterprise requirement correctly", () => {
      expect(hasFeatureAccess("basic", "enterprise")).toBe(false);
      expect(hasFeatureAccess("premium", "enterprise")).toBe(false);
      expect(hasFeatureAccess("enterprise", "enterprise")).toBe(true);
    });

    it("should handle premium requirement correctly", () => {
      expect(hasFeatureAccess("basic", "premium")).toBe(false);
      expect(hasFeatureAccess("premium", "premium")).toBe(true);
      expect(hasFeatureAccess("enterprise", "premium")).toBe(true);
    });
  });

  describe("getFeatureRestrictionMessage", () => {
    it("should return enterprise message for enterprise requirement", () => {
      expect(getFeatureRestrictionMessage("enterprise")).toBe(
        TIER_RESTRICTION_MESSAGES.ENTERPRISE_FEATURE
      );
    });

    it("should return premium message for premium requirement", () => {
      expect(getFeatureRestrictionMessage("premium")).toBe(
        TIER_RESTRICTION_MESSAGES.PREMIUM_FEATURE
      );
    });
  });
});
