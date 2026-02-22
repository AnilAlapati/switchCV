// src/hooks/useAuthActions.ts
// Extracted auth action callbacks from useAuth.tsx to keep the provider under the 500-line limit.
// useAuthActions() is called inside AuthProvider and its result is spread into the context value.
"use client";

import { useCallback } from "react";
import {
    User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    signInWithPopup,
    GoogleAuthProvider,
} from "firebase/auth";
import { auth, db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc, serverTimestamp } from "firebase/firestore";
import {
    sanitizeUsername,
    USERNAME_REGEX,
    createAuthProfileHelpers,
} from "./useAuth.helpers";
import { reportError } from "@/lib/errorReporter";
import {
    getSignInErrorMessage,
    getSignUpErrorMessage,
    getGoogleSignInErrorMessage,
} from "./useAuth.errors";
import { logger } from "@/lib/logger";

type AuthProfileHelpers = ReturnType<typeof createAuthProfileHelpers>;

interface AuthActionsOptions {
    ensureAuthAvailable: () => void;
    setNeedsUsername: (v: boolean) => void;
    setVerificationEmail: (email: string | null) => void;
    helpers: AuthProfileHelpers;
    user: User | null;
}

const googleProvider =
    typeof window !== "undefined" ? new GoogleAuthProvider() : null;
if (googleProvider) {
    googleProvider.setCustomParameters({ prompt: "select_account" });
}

export const useAuthActions = ({
    ensureAuthAvailable,
    setNeedsUsername,
    setVerificationEmail,
    helpers,
    user,
}: AuthActionsOptions) => {
    const { reserveUsername, ensureUserProfile, releaseUsernameReservation } =
        helpers;

    const sendVerification = useCallback(
        async (targetUser?: User | null) => {
            ensureAuthAvailable();
            const activeUser = targetUser || auth.currentUser;
            if (!activeUser) {
                throw new Error("No signed-in user to verify.");
            }
            try {
                const resendVerificationEmailFn = httpsCallable(
                    functions,
                    "resendVerificationEmail",
                );
                await resendVerificationEmailFn();
                setVerificationEmail(activeUser.email ?? null);
            } catch (error) {
                throw error;
            }
        },
        [ensureAuthAvailable, setVerificationEmail],
    );

    const signIn = useCallback(
        async (email: string, password: string) => {
            ensureAuthAvailable();
            try {
                const credential = await signInWithEmailAndPassword(
                    auth,
                    email,
                    password,
                );
                setVerificationEmail(credential.user.email ?? null);
                await ensureUserProfile(credential.user);
            } catch (error) {
                const authError = error as { code?: string; message?: string };
                reportError(error, {
                    source: "useAuth.signIn",
                    severity: "warning",
                    meta: { code: authError.code },
                });
                throw new Error(getSignInErrorMessage(authError));
            }
        },
        [ensureUserProfile, ensureAuthAvailable, setVerificationEmail],
    );

    const signUp = useCallback(
        async (email: string, password: string, username: string) => {
            ensureAuthAvailable();
            let credential: { user: User } | null = null;
            let reservedUsername: string | null = null;
            try {
                const normalized = sanitizeUsername(username);
                if (!normalized || !USERNAME_REGEX.test(normalized)) {
                    throw new Error(
                        "Please choose a username between 3-30 characters using lowercase letters, numbers, hyphens, or underscores.",
                    );
                }

                credential = await createUserWithEmailAndPassword(auth, email, password);
                setVerificationEmail(credential.user.email ?? email);
                await credential.user.getIdToken(true);

                reservedUsername = await reserveUsername(
                    credential.user.uid,
                    normalized,
                    {
                        email,
                        displayName: normalized,
                        authProvider: "password",
                        createdAt: serverTimestamp(),
                    },
                );
                setNeedsUsername(false);
            } catch (error) {
                const firestoreError = error as { code?: string; message?: string };
                const errorMessage =
                    error instanceof Error ? error.message.toLowerCase() : "";
                const isPermissionError =
                    firestoreError.code === "permission-denied" ||
                    errorMessage.includes("missing or insufficient permissions") ||
                    errorMessage.includes("permission denied");

                if (!isPermissionError && credential?.user) {
                    if (reservedUsername) {
                        try {
                            await releaseUsernameReservation(
                                credential.user.uid,
                                reservedUsername,
                            );
                        } catch (releaseError) {
                            reportError(releaseError, {
                                source: "useAuth.signUp.rollback",
                                severity: "warning",
                            });
                        }
                    }
                    try {
                        await credential.user.delete();
                    } catch (deleteError) {
                        reportError(deleteError, {
                            source: "useAuth.signUp.rollback",
                            severity: "warning",
                        });
                    }
                }

                const authError = error as { code?: string; message?: string };
                reportError(error, {
                    source: "useAuth.signUp",
                    severity: "warning",
                    meta: { code: authError.code },
                });
                throw new Error(getSignUpErrorMessage(authError));
            }
        },
        [
            ensureAuthAvailable,
            reserveUsername,
            releaseUsernameReservation,
            setNeedsUsername,
            setVerificationEmail,
        ],
    );

    const logout = useCallback(async () => {
        ensureAuthAvailable();
        if (user?.uid) {
            const SESSION_KEY = `resume_creation_session_${user.uid}`;
            localStorage.removeItem(SESSION_KEY);
            logger.info({ userId: user.uid }, "Cleared resume session on logout");
        }
        await signOut(auth);
    }, [user?.uid, ensureAuthAvailable]);

    const signInWithGoogle = useCallback(async (): Promise<{
        needsUsername: boolean;
    }> => {
        ensureAuthAvailable();
        if (!googleProvider) {
            throw new Error("Google Sign-In is not available in this environment.");
        }
        try {
            const credential = await signInWithPopup(auth, googleProvider);
            setVerificationEmail(credential.user.email ?? null);
            const result = await ensureUserProfile(credential.user);
            setNeedsUsername(result.needsUsername);
            return { needsUsername: result.needsUsername };
        } catch (error) {
            const authError = error as { code?: string; message?: string };
            if (authError.code !== "auth/popup-closed-by-user") {
                logger.error(
                    { err: error, code: authError.code, source: "signInWithGoogle" },
                    "Google sign-in failed",
                );
                reportError(error, {
                    source: "useAuth.googleSignIn",
                    severity: "warning",
                    meta: { code: authError.code },
                });
            }
            throw new Error(getGoogleSignInErrorMessage(authError));
        }
    }, [ensureUserProfile, ensureAuthAvailable, setNeedsUsername, setVerificationEmail]);

    /**
     * Set username for a user who signed in via Google OAuth.
     * Calls the server-side API which uses the Admin SDK to bypass
     * client-side Firestore security rules.
     */
    const setUsername = useCallback(
        async (username: string): Promise<void> => {
            if (!user) {
                throw new Error("No user is signed in.");
            }
            const normalized = sanitizeUsername(username);
            if (!normalized || !USERNAME_REGEX.test(normalized)) {
                throw new Error(
                    "Please choose a username between 3-30 characters using lowercase letters, numbers, hyphens, or underscores.",
                );
            }
            const idToken = await user.getIdToken();
            const response = await fetch("/api/user/username/set", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ username: normalized }),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || "Failed to set username. Please try again.");
            }
            setNeedsUsername(false);
        },
        [user, setNeedsUsername],
    );

    /**
     * Check if the current user needs to set a username.
     * Called on app load to handle users who abandoned the username selection flow.
     */
    const checkNeedsUsername = useCallback(async (): Promise<boolean> => {
        if (!user || !db) {
            return false;
        }
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const data = userDoc.data();
            const needs = data?.needsUsername === true || !data?.username;
            setNeedsUsername(needs);
            return needs;
        } catch (error) {
            reportError(error, {
                source: "useAuth.checkNeedsUsername",
                severity: "warning",
            });
            return false;
        }
    }, [user, setNeedsUsername]);

    const resendVerificationEmail = useCallback(async () => {
        await sendVerification();
    }, [sendVerification]);

    return {
        signIn,
        signUp,
        signInWithGoogle,
        logout,
        setUsername,
        checkNeedsUsername,
        resendVerificationEmail,
    };
};
