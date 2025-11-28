import { logger } from "@/lib/logger";
import { useEffect, useState, useCallback } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface GlobalStats {
  resumes: string;
  jobSeekers: string;
  recruiters: string;
}

const DEFAULT_STATS: GlobalStats = {
  resumes: "—",
  jobSeekers: "—",
  recruiters: "—",
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

export function useGlobalStats() {
  const [stats, setStats] = useState<GlobalStats>(DEFAULT_STATS);

  const applyStats = useCallback((data?: Record<string, unknown> | null) => {
    setStats({
      resumes: formatCount(
        data?.resumeCount ?? data?.resumes ?? data?.totalResumes,
        DEFAULT_STATS.resumes
      ),
      jobSeekers: formatCount(
        data?.jobSeekerCount ?? data?.jobSeekers,
        DEFAULT_STATS.jobSeekers
      ),
      recruiters: formatCount(
        data?.recruiterCount ?? data?.recruiters,
        DEFAULT_STATS.recruiters
      ),
    });
  }, []);

  useEffect(() => {
    // globalStats is public - fetch regardless of auth state
    // (Firestore rules allow public read for analytics/globalStats)

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
  }, [applyStats]);

  return { stats };
}
