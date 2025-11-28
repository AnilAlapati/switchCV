import { renderHook } from "@testing-library/react";
import { useAnalyticsTracking } from "../../hooks/useAnalyticsTracking";
import { logger } from "@/lib/logger";

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
  },
}));

describe("useAnalyticsTracking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should track generic events", () => {
    const { result } = renderHook(() => useAnalyticsTracking());

    result.current.trackEvent({
      eventName: "test_event",
      properties: { foo: "bar" },
    });

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "test_event",
        properties: { foo: "bar" },
      }),
      "📊 Analytics Event:"
    );
  });

  it("should track category/action events", () => {
    const { result } = renderHook(() => useAnalyticsTracking());

    result.current.track("category", "action", { foo: "bar" });

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "category_action",
        properties: { foo: "bar" },
      }),
      "📊 Analytics Event:"
    );
  });

  it("should track search events", () => {
    const { result } = renderHook(() => useAnalyticsTracking());

    result.current.trackSearch("query", 10, { filter: "value" });

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "search_performed",
        properties: expect.objectContaining({
          query: "query",
          resultCount: 10,
          filters: { filter: "value" },
        }),
      }),
      "📊 Analytics Event:"
    );
  });

  it("should track profile view events", () => {
    const { result } = renderHook(() => useAnalyticsTracking());

    result.current.trackProfileView("user123", { name: "John" });

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "profile_viewed",
        properties: expect.objectContaining({
          userId: "user123",
          profileData: { name: "John" },
        }),
      }),
      "📊 Analytics Event:"
    );
  });

  it("should track access request events", () => {
    const { result } = renderHook(() => useAnalyticsTracking());

    result.current.trackAccessRequest("user123", "resume456");

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "access_requested",
        properties: expect.objectContaining({
          userId: "user123",
          resumeId: "resume456",
        }),
      }),
      "📊 Analytics Event:"
    );
  });
});
