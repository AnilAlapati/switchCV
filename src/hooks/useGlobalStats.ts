import { useEffect, useState } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

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

export function useGlobalStats() {
  const [stats, setStats] = useState<GlobalStats>(DEFAULT_STATS);

  useEffect(() => {
    if (!db || (db as { __isMock?: boolean }).__isMock) {
      return;
    }

    const statsRef = doc(db, "analytics", "globalStats");

    const applyStats = (data?: Record<string, unknown> | null) => {
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
          data?.profileCompletionRate ??
            data?.completionRate ??
            data?.completion,
          DEFAULT_STATS.completion
        ),
      });
    };

    if (typeof onSnapshot === "function") {
      const unsubscribe = onSnapshot(
        statsRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            setStats(DEFAULT_STATS);
            return;
          }

          const data = snapshot.data();
          applyStats(data as Record<string, unknown>);
        },
        (error) => {
          console.error("Error fetching stats:", error);
          setStats(DEFAULT_STATS);
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
          setStats(DEFAULT_STATS);
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
        console.error("Error fetching stats:", error);
        setStats(DEFAULT_STATS);
      }
    };

    fetchStatsOnce();

    return () => {
      cancelled = true;
    };
  }, []);

  return { stats };
}
