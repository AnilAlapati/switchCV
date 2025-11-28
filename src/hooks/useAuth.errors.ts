/**
 * Authentication error message mappings
 * Extracted to keep useAuth.tsx under line limit
 */

import { getSanitizedMessage } from "@/lib/errorReporter";
import type { UsernameReservationError } from "./useAuth.helpers";

type AuthError = { code?: string; message?: string };

export function getSignInErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "auth/invalid-credential":
      return "Invalid email or password. Please check your credentials or sign up first.";
    case "auth/user-not-found":
      return "No account found with this email. Please sign up first.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/too-many-requests":
      return "Too many failed login attempts. Please try again later.";
    default:
      return getSanitizedMessage(error, "Failed to sign in");
  }
}

export function getSignUpErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "auth/email-already-in-use":
      return "This email is already registered. Please sign in instead.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/invalid-email":
      return "Invalid email address.";
    default:
      if ((error as UsernameReservationError).code === "username-taken") {
        return "This username is already taken. Please choose another.";
      }
      return getSanitizedMessage(error, "Failed to create account");
  }
}

export function getGoogleSignInErrorMessage(error: AuthError): string {
  if (error.code === "auth/popup-closed-by-user") {
    return "Google sign-in was closed before completion.";
  }
  return getSanitizedMessage(error, "Failed to sign in with Google");
}
