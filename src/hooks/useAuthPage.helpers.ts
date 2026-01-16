import { useCallback } from "react";
import { USERNAME_CONFIG } from "@/config/constants";
import type { UsernameCheckResponse } from "@/app/api/user/username/check/route";
import type { UsernameStatus } from "./useAuthPage.types";

interface UsernameCheckSetters {
  setUsernameStatus: (status: UsernameStatus) => void;
  setUsernameError: (error: string) => void;
  setUsernameSuggestion: (suggestion: string) => void;
}

export function useUsernameChecker(
  debouncedUsername: string,
  setters: UsernameCheckSetters
) {
  const { setUsernameStatus, setUsernameError, setUsernameSuggestion } =
    setters;

  const checkUsernameAvailability = useCallback(async () => {
    if (
      !debouncedUsername ||
      debouncedUsername.length < USERNAME_CONFIG.MIN_LENGTH
    ) {
      setUsernameStatus("idle");
      setUsernameError("");
      setUsernameSuggestion("");
      return;
    }

    setUsernameStatus("checking");
    setUsernameError("");

    try {
      const response = await fetch(
        `/api/user/username/check?username=${encodeURIComponent(
          debouncedUsername
        )}`
      );
      const data: UsernameCheckResponse = await response.json();

      if (response.status === 429) {
        setUsernameStatus("error");
        setUsernameError(data.reason || "Too many requests. Please wait.");
        return;
      }

      if (data.available) {
        setUsernameStatus("available");
        setUsernameError("");
        setUsernameSuggestion("");
      } else {
        const isInvalid =
          data.reason?.includes("format") ||
          data.reason?.includes("characters") ||
          data.reason?.includes("at least") ||
          data.reason?.includes("contain");
        setUsernameStatus(isInvalid ? "invalid" : "taken");
        setUsernameError(data.reason || "Username is not available");
        setUsernameSuggestion(data.suggestion || "");
      }
    } catch {
      setUsernameStatus("error");
      setUsernameError("Failed to check availability. Please try again.");
    }
  }, [
    debouncedUsername,
    setUsernameStatus,
    setUsernameError,
    setUsernameSuggestion,
  ]);

  return { checkUsernameAvailability };
}
