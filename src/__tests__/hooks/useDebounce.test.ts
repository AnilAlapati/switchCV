/**
 * Tests for useDebounce hooks
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDebounce, useDebouncedValue } from "@/hooks/useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("useDebounce", () => {
    it("returns initial value immediately", () => {
      const { result } = renderHook(() => useDebounce("initial", 500));
      expect(result.current).toBe("initial");
    });

    it("returns debounced value after delay", async () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: "initial", delay: 500 } }
      );

      expect(result.current).toBe("initial");

      // Change value
      rerender({ value: "updated", delay: 500 });

      // Value should still be initial before delay
      expect(result.current).toBe("initial");

      // Fast forward past delay
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Now value should be updated
      expect(result.current).toBe("updated");
    });

    it("cancels previous timer on rapid changes", async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: "a" } }
      );

      rerender({ value: "b" });
      act(() => {
        jest.advanceTimersByTime(100);
      });

      rerender({ value: "c" });
      act(() => {
        jest.advanceTimersByTime(100);
      });

      rerender({ value: "d" });
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Still showing initial value
      expect(result.current).toBe("a");

      // After full delay from last change
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should show final value
      expect(result.current).toBe("d");
    });

    it("works with objects", async () => {
      const obj1 = { name: "test" };
      const obj2 = { name: "updated" };

      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 200),
        { initialProps: { value: obj1 } }
      );

      expect(result.current).toBe(obj1);

      rerender({ value: obj2 });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(result.current).toBe(obj2);
    });
  });

  describe("useDebouncedValue", () => {
    it("returns initial value with isPending false", () => {
      const { result } = renderHook(() => useDebouncedValue("initial", 500));

      expect(result.current.debouncedValue).toBe("initial");
      expect(result.current.isPending).toBe(false);
    });

    it("sets isPending true when value changes", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebouncedValue(value, 500),
        { initialProps: { value: "initial" } }
      );

      expect(result.current.isPending).toBe(false);

      rerender({ value: "changed" });

      // isPending should be true (value differs from debounced)
      expect(result.current.isPending).toBe(true);
      expect(result.current.debouncedValue).toBe("initial");
    });

    it("sets isPending false after debounce completes", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebouncedValue(value, 500),
        { initialProps: { value: "initial" } }
      );

      rerender({ value: "changed" });
      expect(result.current.isPending).toBe(true);

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current.isPending).toBe(false);
      expect(result.current.debouncedValue).toBe("changed");
    });

    it("uses default delay from USERNAME_CONFIG", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebouncedValue(value),
        { initialProps: { value: "test" } }
      );

      expect(result.current.isPending).toBe(false); // Initial state

      rerender({ value: "updated" });
      expect(result.current.isPending).toBe(true);

      // Default is 1000ms
      act(() => {
        jest.advanceTimersByTime(1001);
      });

      expect(result.current.isPending).toBe(false);
    });
  });
});
