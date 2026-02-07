 
import { renderHook, act } from "@testing-library/react";
import { useUsernameChecker } from "@/hooks/useAuthPage.helpers";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("useUsernameChecker", () => {
  let mockSetters: {
    setUsernameStatus: jest.Mock;
    setUsernameError: jest.Mock;
    setUsernameSuggestion: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetters = {
      setUsernameStatus: jest.fn(),
      setUsernameError: jest.fn(),
      setUsernameSuggestion: jest.fn(),
    };
  });

  describe("checkUsernameAvailability", () => {
    it("should set idle status when username is empty", async () => {
      const { result } = renderHook(() => useUsernameChecker("", mockSetters));

      await act(async () => {
        await result.current.checkUsernameAvailability();
      });

      expect(mockSetters.setUsernameStatus).toHaveBeenCalledWith("idle");
      expect(mockSetters.setUsernameError).toHaveBeenCalledWith("");
      expect(mockSetters.setUsernameSuggestion).toHaveBeenCalledWith("");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should set idle status when username is too short", async () => {
      const { result } = renderHook(() =>
        useUsernameChecker("ab", mockSetters)
      );

      await act(async () => {
        await result.current.checkUsernameAvailability();
      });

      expect(mockSetters.setUsernameStatus).toHaveBeenCalledWith("idle");
      expect(mockSetters.setUsernameError).toHaveBeenCalledWith("");
      expect(mockSetters.setUsernameSuggestion).toHaveBeenCalledWith("");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should set checking status and make API call for valid username", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ available: true }),
      });

      const { result } = renderHook(() =>
        useUsernameChecker("validuser", mockSetters)
      );

      await act(async () => {
        await result.current.checkUsernameAvailability();
      });

      expect(mockSetters.setUsernameStatus).toHaveBeenCalledWith("checking");
      expect(mockSetters.setUsernameError).toHaveBeenCalledWith("");
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/user/username/check?username=validuser"
      );
    });

    it("should set available status when username is available", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ available: true }),
      });

      const { result } = renderHook(() =>
        useUsernameChecker("availableuser", mockSetters)
      );

      await act(async () => {
        await result.current.checkUsernameAvailability();
      });

      expect(mockSetters.setUsernameStatus).toHaveBeenCalledWith("available");
      expect(mockSetters.setUsernameError).toHaveBeenCalledWith("");
      expect(mockSetters.setUsernameSuggestion).toHaveBeenCalledWith("");
    });

    it("should set taken status when username is not available", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            available: false,
            reason: "Username is already taken",
          }),
      });

      const { result } = renderHook(() =>
        useUsernameChecker("takenuser", mockSetters)
      );

      await act(async () => {
        await result.current.checkUsernameAvailability();
      });

      expect(mockSetters.setUsernameStatus).toHaveBeenCalledWith("taken");
      expect(mockSetters.setUsernameError).toHaveBeenCalledWith(
        "Username is already taken"
      );
      expect(mockSetters.setUsernameSuggestion).toHaveBeenCalledWith("");
    });

    it("should set taken status with suggestion when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            available: false,
            reason: "Username is already taken",
            suggestion: "takenuser123",
          }),
      });

      const { result } = renderHook(() =>
        useUsernameChecker("takenuser", mockSetters)
      );

      await act(async () => {
        await result.current.checkUsernameAvailability();
      });

      expect(mockSetters.setUsernameStatus).toHaveBeenCalledWith("taken");
      expect(mockSetters.setUsernameError).toHaveBeenCalledWith(
        "Username is already taken"
      );
      expect(mockSetters.setUsernameSuggestion).toHaveBeenCalledWith(
        "takenuser123"
      );
    });

    it("should set invalid status for format errors", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            available: false,
            reason:
              "Username can only contain lowercase letters, numbers, hyphens, and underscores",
          }),
      });

      const { result } = renderHook(() =>
        useUsernameChecker("invalid@user", mockSetters)
      );

      await act(async () => {
        await result.current.checkUsernameAvailability();
      });

      expect(mockSetters.setUsernameStatus).toHaveBeenCalledWith("invalid");
      expect(mockSetters.setUsernameError).toHaveBeenCalledWith(
        "Username can only contain lowercase letters, numbers, hyphens, and underscores"
      );
    });

    it("should set invalid status for character errors", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            available: false,
            reason: "Username contains invalid characters",
          }),
      });

      const { result } = renderHook(() =>
        useUsernameChecker("user@domain", mockSetters)
      );

      await act(async () => {
        await result.current.checkUsernameAvailability();
      });

      expect(mockSetters.setUsernameStatus).toHaveBeenCalledWith("invalid");
      expect(mockSetters.setUsernameError).toHaveBeenCalledWith(
        "Username contains invalid characters"
      );
    });

    it("should set invalid status for length errors", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            available: false,
            reason: "Username must be at least 3 characters",
          }),
      });

      const { result } = renderHook(() =>
        useUsernameChecker("abc", mockSetters)
      );

      await act(async () => {
        await result.current.checkUsernameAvailability();
      });

      expect(mockSetters.setUsernameStatus).toHaveBeenCalledWith("invalid");
      expect(mockSetters.setUsernameError).toHaveBeenCalledWith(
        "Username must be at least 3 characters"
      );
    });

    it("should handle rate limit (429) response", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 429,
        json: () =>
          Promise.resolve({
            reason: "Too many requests. Please wait a moment and try again.",
          }),
      });

      const { result } = renderHook(() =>
        useUsernameChecker("testuser", mockSetters)
      );

      await act(async () => {
        await result.current.checkUsernameAvailability();
      });

      expect(mockSetters.setUsernameStatus).toHaveBeenCalledWith("error");
      expect(mockSetters.setUsernameError).toHaveBeenCalledWith(
        "Too many requests. Please wait a moment and try again."
      );
    });

    it("should handle rate limit with default message when no reason provided", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 429,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() =>
        useUsernameChecker("testuser", mockSetters)
      );

      await act(async () => {
        await result.current.checkUsernameAvailability();
      });

      expect(mockSetters.setUsernameStatus).toHaveBeenCalledWith("error");
      expect(mockSetters.setUsernameError).toHaveBeenCalledWith(
        "Too many requests. Please wait."
      );
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() =>
        useUsernameChecker("testuser", mockSetters)
      );

      await act(async () => {
        await result.current.checkUsernameAvailability();
      });

      expect(mockSetters.setUsernameStatus).toHaveBeenCalledWith("error");
      expect(mockSetters.setUsernameError).toHaveBeenCalledWith(
        "Failed to check availability. Please try again."
      );
    });

    it("should handle malformed JSON response", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      const { result } = renderHook(() =>
        useUsernameChecker("testuser", mockSetters)
      );

      await act(async () => {
        await result.current.checkUsernameAvailability();
      });

      expect(mockSetters.setUsernameStatus).toHaveBeenCalledWith("error");
      expect(mockSetters.setUsernameError).toHaveBeenCalledWith(
        "Failed to check availability. Please try again."
      );
    });

    it("should encode special characters in username", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ available: true }),
      });

      const { result } = renderHook(() =>
        useUsernameChecker("user@domain.com", mockSetters)
      );

      await act(async () => {
        await result.current.checkUsernameAvailability();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/user/username/check?username=user%40domain.com"
      );
    });

    it("should use default error message when no reason provided for unavailable username", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            available: false,
          }),
      });

      const { result } = renderHook(() =>
        useUsernameChecker("testuser", mockSetters)
      );

      await act(async () => {
        await result.current.checkUsernameAvailability();
      });

      expect(mockSetters.setUsernameStatus).toHaveBeenCalledWith("taken");
      expect(mockSetters.setUsernameError).toHaveBeenCalledWith(
        "Username is not available"
      );
    });
  });
});
