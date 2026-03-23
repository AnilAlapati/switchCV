import { useCallback, useEffect } from "react";
import { applyActionCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { USERNAME_CONFIG } from "@/config/constants";
import type { UsernameCheckResponse } from "@/app/api/user/username/check/route";
import type { UsernameStatus } from "./useAuthPage.types";
import type { MutableRefObject } from "react";

interface UsernameCheckSetters {
  setUsernameStatus: (status: UsernameStatus) => void;
  setUsernameError: (error: string) => void;
  setUsernameSuggestion: (suggestion: string) => void;
}

interface EmailVerificationParams {
  refreshUser: () => Promise<void>;
  searchParams: { get: (key: string) => string | null };
  verificationAttempted: MutableRefObject<boolean>;
  setError: (value: string) => void;
  setVerificationProcessing: (value: boolean) => void;
  setVerificationSuccess: (value: boolean) => void;
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

export function useEmailVerificationHandler({
  refreshUser,
  searchParams,
  verificationAttempted,
  setError,
  setVerificationProcessing,
  setVerificationSuccess,
}: EmailVerificationParams) {
  useEffect(() => {
    const handleEmailVerification = async () => {
      const mode = searchParams.get("mode");
      const oobCode = searchParams.get("oobCode");
      const isCustomSuccess = searchParams.get("verificationSuccess") === "true";

      if (isCustomSuccess && !verificationAttempted.current) {
        verificationAttempted.current = true;
        setVerificationSuccess(true);
        await refreshUser();
        return;
      }

      if (
        (mode === "verifyEmail" || mode === "verify-email") &&
        oobCode &&
        auth &&
        !verificationAttempted.current
      ) {
        verificationAttempted.current = true;
        setVerificationProcessing(true);
        setError("");

        try {
          await applyActionCode(auth, oobCode);

          if (auth.currentUser) {
            await auth.currentUser.reload();
            await auth.currentUser.getIdToken(true);
          }

          setVerificationSuccess(true);
          setError("");
          await refreshUser();
        } catch (err) {
          const firebaseError = err as { code?: string; message?: string };
          if (firebaseError.code === "auth/expired-action-code") {
            setError(
              "This verification link has expired. Please request a new one.",
            );
          } else if (firebaseError.code === "auth/invalid-action-code") {
            setError(
              "This verification link is invalid or has already been used.",
            );
          } else {
            setError(
              firebaseError.message ||
                "Failed to verify email. Please try again.",
            );
          }
        } finally {
          setVerificationProcessing(false);
        }
      }
    };

    void handleEmailVerification();
  }, [
    refreshUser,
    searchParams,
    setError,
    setVerificationProcessing,
    setVerificationSuccess,
    verificationAttempted,
  ]);
}
