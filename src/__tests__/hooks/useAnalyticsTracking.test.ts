import { renderHook } from "@testing-library/react";
import { useAnalyticsTracking } from "../../hooks/useAnalyticsTracking";

describe("useAnalyticsTracking", () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("should track generic events", () => {
    const { result } = renderHook(() => useAnalyticsTracking());

    result.current.trackEvent({
      eventName: "test_event",
      properties: { foo: "bar" },
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "📊 Analytics Event:",
      expect.objectContaining({
        event: "test_event",
        properties: { foo: "bar" },
      })
    );
  });

  it("should track category/action events", () => {
    const { result } = renderHook(() => useAnalyticsTracking());

    result.current.track("category", "action", { foo: "bar" });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "📊 Analytics Event:",
      expect.objectContaining({
        event: "category_action",
        properties: { foo: "bar" },
      })
    );
  });

  it("should track search events", () => {
    const { result } = renderHook(() => useAnalyticsTracking());

    result.current.trackSearch("query", 10, { filter: "value" });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "📊 Analytics Event:",
      expect.objectContaining({
        event: "search_performed",
        properties: expect.objectContaining({
          query: "query",
          resultCount: 10,
          filters: { filter: "value" },
        }),
      })
    );
  });

  it("should track profile view events", () => {
    const { result } = renderHook(() => useAnalyticsTracking());

    result.current.trackProfileView("user123", { name: "John" });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "📊 Analytics Event:",
      expect.objectContaining({
        event: "profile_viewed",
        properties: expect.objectContaining({
          userId: "user123",
          profileData: { name: "John" },
        }),
      })
    );
  });

  it("should track access request events", () => {
    const { result } = renderHook(() => useAnalyticsTracking());

    result.current.trackAccessRequest("user123", "resume456");

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "📊 Analytics Event:",
      expect.objectContaining({
        event: "access_requested",
        properties: expect.objectContaining({
          userId: "user123",
          resumeId: "resume456",
        }),
      })
    );
  });
});
