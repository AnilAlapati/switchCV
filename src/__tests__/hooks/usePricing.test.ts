import { renderHook } from "@testing-library/react";
import { usePricing, useTierPrice } from "@/hooks/usePricing";
import useSWR from "swr";

// Mock useSWR
jest.mock("swr");

describe("usePricing hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSWR as jest.Mock).mockReturnValue({
      data: null,
      error: null,
      isLoading: false,
    });
  });

  describe("usePricing", () => {
    it("should return fallback pricing for jobseeker when no config data", () => {
      const { result } = renderHook(() => usePricing("jobseeker"));

      expect(result.current.basic.displayText).toBe("Free");
      expect(result.current.basic.price).toBe(0);
      expect(result.current.premium.displayText).toBe("$9.99");
      expect(result.current.premium.price).toBe(9.99);
      expect(result.current.enterprise.displayText).toBe("$39.99");
      expect(result.current.enterprise.price).toBe(39.99);
    });

    it("should return fallback pricing for recruiter when no config data", () => {
      const { result } = renderHook(() => usePricing("recruiter"));

      expect(result.current.basic.displayText).toBe("Free");
      expect(result.current.premium.displayText).toBe("$19.99");
      expect(result.current.premium.price).toBe(19.99);
      expect(result.current.enterprise.displayText).toBe("Custom");
      expect(result.current.enterprise.price).toBe(0);
    });

    it("should return pricing from config when available for jobseeker", () => {
      (useSWR as jest.Mock).mockReturnValue({
        data: {
          config: {
            pricing: {
              jobseeker: {
                basic: { price: 0, currency: "USD", displayText: "Free" },
                premium: {
                  price: 14.99,
                  currency: "USD",
                  displayText: "$14.99",
                },
                enterprise: {
                  price: 49.99,
                  currency: "USD",
                  displayText: "$49.99",
                },
              },
              recruiter: {
                basic: { price: 0, currency: "USD", displayText: "Free" },
                premium: {
                  price: 29.99,
                  currency: "USD",
                  displayText: "$29.99",
                },
                enterprise: {
                  price: 0,
                  currency: "USD",
                  displayText: "Custom",
                },
              },
            },
          },
        },
        error: null,
        isLoading: false,
      });

      const { result } = renderHook(() => usePricing("jobseeker"));

      expect(result.current.premium.price).toBe(14.99);
      expect(result.current.premium.displayText).toBe("$14.99");
      expect(result.current.enterprise.price).toBe(49.99);
    });

    it("should return pricing from config when available for recruiter", () => {
      (useSWR as jest.Mock).mockReturnValue({
        data: {
          config: {
            pricing: {
              jobseeker: {
                basic: { price: 0, currency: "USD", displayText: "Free" },
                premium: { price: 9.99, currency: "USD", displayText: "$9.99" },
                enterprise: {
                  price: 39.99,
                  currency: "USD",
                  displayText: "$39.99",
                },
              },
              recruiter: {
                basic: { price: 0, currency: "USD", displayText: "Free" },
                premium: {
                  price: 29.99,
                  currency: "USD",
                  displayText: "$29.99",
                },
                enterprise: {
                  price: 0,
                  currency: "USD",
                  displayText: "Contact Sales",
                },
              },
            },
          },
        },
        error: null,
        isLoading: false,
      });

      const { result } = renderHook(() => usePricing("recruiter"));

      expect(result.current.premium.price).toBe(29.99);
      expect(result.current.premium.displayText).toBe("$29.99");
      expect(result.current.enterprise.displayText).toBe("Contact Sales");
    });

    it("should return fallback when config exists but pricing is missing", () => {
      (useSWR as jest.Mock).mockReturnValue({
        data: { config: { tiers: {} } },
        error: null,
        isLoading: false,
      });

      const { result } = renderHook(() => usePricing("jobseeker"));

      expect(result.current.basic.displayText).toBe("Free");
      expect(result.current.premium.displayText).toBe("$9.99");
    });

    it("should use correct SWR deduplication interval", () => {
      renderHook(() => usePricing("jobseeker"));

      expect(useSWR).toHaveBeenCalledWith(
        "/api/system-config",
        expect.any(Function),
        { dedupingInterval: 300000, revalidateOnFocus: false },
      );
    });
  });

  describe("useTierPrice", () => {
    it("should return specific tier pricing with fallback", () => {
      const { result } = renderHook(() => useTierPrice("jobseeker", "premium"));

      expect(result.current.price).toBe(9.99);
      expect(result.current.displayText).toBe("$9.99");
      expect(result.current.currency).toBe("USD");
    });

    it("should return basic tier pricing as free", () => {
      const { result } = renderHook(() => useTierPrice("recruiter", "basic"));

      expect(result.current.price).toBe(0);
      expect(result.current.displayText).toBe("Free");
    });

    it("should return config values when available", () => {
      (useSWR as jest.Mock).mockReturnValue({
        data: {
          config: {
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
                premium: {
                  price: 14.99,
                  currency: "EUR",
                  displayText: "€14.99",
                },
                enterprise: {
                  price: 0,
                  currency: "EUR",
                  displayText: "Individuell",
                },
              },
            },
          },
        },
        error: null,
        isLoading: false,
      });

      const { result } = renderHook(() => useTierPrice("jobseeker", "premium"));

      expect(result.current.price).toBe(7.99);
      expect(result.current.currency).toBe("EUR");
      expect(result.current.displayText).toBe("€7.99");
    });
  });
});
