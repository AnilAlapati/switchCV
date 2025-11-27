import { logger } from "@/lib/logger";
import { useEffect, useState, useSyncExternalStore, useCallback } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

interface GlobalStats {
  resumes: string;
  users: string;
  completion: string;
}

const DEFAULT_STATS: GlobalStats = {
  resumes: "12k+",
  users: "10k+",
  completion: "98%",
};

function formatCount(value: unknown, fallback: string) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.round(value);
    const needsPlus = rounded >= 1;
    return `${rounded}${needsPlus ? "+" : ""}`;
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return fallback;
}

function formatCompletion(value: unknown, fallback: string) {
  if (typeof value === "number") {
    const normalized = value <= 1 ? value * 100 : value;
    return `${Math.round(normalized)}%`;
  }

  if (typeof value === "string" && value.trim()) {
    return value.endsWith("%") ? value : `${value}%`;
  }

  return fallback;
}

// External store for auth state - avoids calling setState in effect
let authState: boolean | null = null;
const authListeners: Set<() => void> = new Set();
let authInitialized = false;

function initAuthListener() {
  if (authInitialized) return;
  authInitialized = true;

  if (
    typeof window !== "undefined" &&
    auth &&
    !(auth as { __isMock?: boolean }).__isMock
  ) {
    onAuthStateChanged(auth, (user) => {
      authState = !!user;
      authListeners.forEach((listener) => listener());
    });
  } else if (typeof window !== "undefined") {
    authState = false; // No auth available
  }
}

function subscribeToAuth(callback: () => void) {
  initAuthListener();
  authListeners.add(callback);
  return () => authListeners.delete(callback);
}

function getAuthSnapshot() {
  initAuthListener();
  return authState;
}

function getServerAuthSnapshot() {
  return null; // Server-side: auth state unknown
}

// For testing - allows resetting auth state
export function __resetAuthState() {
  authState = null;
  authInitialized = false;
  authListeners.clear();
}

// For testing - allows setting auth state directly
export function __setAuthState(state: boolean | null) {
  authState = state;
  authListeners.forEach((listener) => listener());
}

export function useGlobalStats() {
  const [stats, setStats] = useState<GlobalStats>(DEFAULT_STATS);

  // Use useSyncExternalStore for auth state - lint-friendly pattern
  const isAuthenticated = useSyncExternalStore(
    subscribeToAuth,
    getAuthSnapshot,
    getServerAuthSnapshot
  );

  const applyStats = useCallback((data?: Record<string, unknown> | null) => {
    setStats({
      resumes: formatCount(
        data?.resumeCount ?? data?.resumes ?? data?.totalResumes,
        DEFAULT_STATS.resumes
      ),
      users: formatCount(
        data?.activeUsers ?? data?.userCount ?? data?.users,
        DEFAULT_STATS.users
      ),
      completion: formatCompletion(
        data?.profileCompletionRate ?? data?.completionRate ?? data?.completion,
        DEFAULT_STATS.completion
      ),
    });
  }, []);

  useEffect(() => {
    // Wait until we know auth state, and only fetch if authenticated
    if (isAuthenticated === null) {
      return; // Still determining auth state
    }

    if (!isAuthenticated) {
      // User is not authenticated - use default stats (analytics requires auth)
      return;
    }

    if (!db || (db as { __isMock?: boolean }).__isMock) {
      return;
    }

    const statsRef = doc(db, "analytics", "globalStats");

    if (typeof onSnapshot === "function") {
      const unsubscribe = onSnapshot(
        statsRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            applyStats(null);
            return;
          }

          const data = snapshot.data();
          applyStats(data as Record<string, unknown>);
        },
        (error) => {
          logger.error({ err: error }, "Error fetching stats:");
          applyStats(null);
        }
      );

      return unsubscribe;
    }

    let cancelled = false;

    const fetchStatsOnce = async () => {
      if (typeof getDoc !== "function") {
        return;
      }

      try {
        const snapshot = await getDoc(statsRef);
        if (cancelled) {
          return;
        }

        if (typeof snapshot?.exists !== "function" || !snapshot.exists()) {
          applyStats(null);
          return;
        }

        const rawData =
          typeof snapshot.data === "function" ? snapshot.data() : null;

        applyStats(
          rawData && typeof rawData === "object"
            ? (rawData as Record<string, unknown>)
            : null
        );
      } catch (error) {
        if (cancelled) {
          return;
        }
        logger.error({ err: error }, "Error fetching stats:");
        applyStats(null);
      }
    };

    fetchStatsOnce();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, applyStats]);

  return { stats };
}
