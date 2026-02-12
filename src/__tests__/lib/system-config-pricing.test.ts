import {
  defaultSystemConfig,
  mergeWithDefaultConfig,
} from "@/lib/system-config";

describe("system-config pricing", () => {
  describe("defaultSystemConfig", () => {
    it("should include pricing in default system config", () => {
      expect(defaultSystemConfig.pricing).toBeDefined();
    });

    it("should have correct jobseeker pricing defaults", () => {
      const jsPricing = defaultSystemConfig.pricing!.jobseeker;

      expect(jsPricing.basic.price).toBe(0);
      expect(jsPricing.basic.displayText).toBe("Free");
      expect(jsPricing.basic.currency).toBe("USD");

      expect(jsPricing.premium.price).toBe(9.99);
      expect(jsPricing.premium.displayText).toBe("$9.99");

      expect(jsPricing.enterprise.price).toBe(39.99);
      expect(jsPricing.enterprise.displayText).toBe("$39.99");
    });

    it("should have correct recruiter pricing defaults", () => {
      const rcPricing = defaultSystemConfig.pricing!.recruiter;

      expect(rcPricing.basic.price).toBe(0);
      expect(rcPricing.basic.displayText).toBe("Free");

      expect(rcPricing.premium.price).toBe(19.99);
      expect(rcPricing.premium.displayText).toBe("$19.99");

      expect(rcPricing.enterprise.price).toBe(0);
      expect(rcPricing.enterprise.displayText).toBe("Custom");
    });
  });

  describe("mergeWithDefaultConfig — pricing", () => {
    it("should use default pricing when partial has no pricing", () => {
      const merged = mergeWithDefaultConfig({});

      expect(merged.pricing).toEqual(defaultSystemConfig.pricing);
    });

    it("should merge partial pricing overrides for jobseeker", () => {
      const merged = mergeWithDefaultConfig({
        pricing: {
          jobseeker: {
            basic: { price: 0, currency: "USD", displayText: "Free" },
            premium: { price: 14.99, currency: "USD", displayText: "$14.99" },
            enterprise: {
              price: 49.99,
              currency: "USD",
              displayText: "$49.99",
            },
          },
          recruiter: {
            basic: { price: 0, currency: "USD", displayText: "Free" },
            premium: { price: 19.99, currency: "USD", displayText: "$19.99" },
            enterprise: { price: 0, currency: "USD", displayText: "Custom" },
          },
        },
      });

      expect(merged.pricing!.jobseeker.premium.price).toBe(14.99);
      expect(merged.pricing!.jobseeker.premium.displayText).toBe("$14.99");
      // Recruiter should use the provided values
      expect(merged.pricing!.recruiter.premium.price).toBe(19.99);
    });

    it("should not break existing config sections when pricing is added", () => {
      const merged = mergeWithDefaultConfig({
        pricing: {
          jobseeker: {
            basic: { price: 0, currency: "EUR", displayText: "Kostenlos" },
            premium: { price: 7.99, currency: "EUR", displayText: "€7.99" },
            enterprise: {
              price: 29.99,
              currency: "EUR",
              displayText: "€29.99",
            },
          },
          recruiter: {
            basic: { price: 0, currency: "EUR", displayText: "Kostenlos" },
            premium: { price: 14.99, currency: "EUR", displayText: "€14.99" },
            enterprise: {
              price: 0,
              currency: "EUR",
              displayText: "Individuell",
            },
          },
        },
      });

      // Verify other sections are intact
      expect(merged.maintenance).toEqual(defaultSystemConfig.maintenance);
      expect(merged.tiers).toEqual(defaultSystemConfig.tiers);
      expect(merged.ai).toEqual(defaultSystemConfig.ai);

      // Verify pricing was merged
      expect(merged.pricing!.jobseeker.premium.currency).toBe("EUR");
    });
  });
});
