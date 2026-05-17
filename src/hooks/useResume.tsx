"use client";

import { logger } from "@/lib/logger";
// src/hooks/useResume.tsx

import { useMemo, useCallback, useEffect } from "react";
import useSWR from "swr";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./useAuth";
import { ResumeProfile, DashboardResume } from "@/types";

interface ResumesData {
  resumes: DashboardResume[];
  primaryResume: DashboardResume | null;
}

const fetchUserResumes = async (userId: string): Promise<ResumesData> => {
  try {
    // Query for user's resume profiles from 'resumes' collection
    const resumesRef = collection(db, "resumes");
    const q = query(resumesRef, where("userId", "==", userId), limit(20));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const allResumes = querySnapshot.docs.map((doc) => ({
        ...(doc.data() as DashboardResume),
        id: doc.id,
        numericId: doc.data().numericId as number,
      }));

      // Sort by createdAt desc (newest first)
      allResumes.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      logger.info(`Loaded ${allResumes.length} resumes from 'resumes'`);
      return {
        resumes: allResumes,
        primaryResume: allResumes[0] || null,
      };
    }

    // --- ENHANCEMENT: Aggressive fallback for new users/race conditions ---
    // If we're here, query by UID didn't find anything in the main collection.
    // This happens for users who:
    // 1. Are genuinely new (0 resumes)
    // 2. Just created a resume, and the UID query hasn't indexed the new entry yet
    // 3. Have legacy data in resumeProfiles

    // We already do a legacy fallback below, but we should verify if there's any
    // "lingering" data or if we should trigger a small delay/retry here.
    // For now, we continue to legacy fallback, but we add a log.
    logger.info(
      `No resumes found in 'resumes' for ${userId}, checking legacy 'resumeProfiles'...`,
    );

    // Fallback to legacy 'resumeProfiles' only if no resumes found
    const legacyResumesRef = collection(db, "resumeProfiles");
    const legacyQ = query(
      legacyResumesRef,
      where("userId", "==", userId),
      limit(20),
    );
    const legacySnapshot = await getDocs(legacyQ);

    if (!legacySnapshot.empty) {
      const allLegacyResumes = legacySnapshot.docs.map((doc) => ({
        ...(doc.data() as ResumeProfile),
        id: doc.id,
      }));

      // Sort by lastUpdatedAt desc (newest first)
      allLegacyResumes.sort((a, b) => {
        const dateA = new Date(a.lastUpdatedAt || 0).getTime();
        const dateB = new Date(b.lastUpdatedAt || 0).getTime();
        return dateB - dateA;
      });

      logger.info(
        `Loaded ${allLegacyResumes.length} resumes from 'resumeProfiles'`,
      );
      return {
        resumes: allLegacyResumes,
        primaryResume: allLegacyResumes[0] || null,
      };
    }

    logger.info("No resume found for user");
    return {
      resumes: [],
      primaryResume: null,
    };
  } catch (err) {
    logger.error({ err: err }, "Error fetching resume:");
    throw err;
  }
};

export const useResume = (options: { enabled?: boolean } = {}) => {
  const { user } = useAuth();
  const { enabled = true } = options;

  const shouldFetch = enabled && !!user;
  const key = shouldFetch ? `resumes-${user!.uid}` : null;

  const { data, error, isLoading, mutate, isValidating } = useSWR<ResumesData>(
    key,
    () => fetchUserResumes(user!.uid),
    {
      // Cache for 5 minutes
      dedupingInterval: 300000,
      // Don't revalidate on focus to reduce Firestore reads
      revalidateOnFocus: false,
      // Don't revalidate on reconnect
      revalidateOnReconnect: false,
      // Keep previous data while revalidating
      keepPreviousData: true,
      // Enable automated retries for network issues
      shouldRetryOnError: true,
      errorRetryCount: 3,
      // If we got NO resumes, but the user just performed an action,
      // we might want to refresh more aggressively.
      // SWR refreshInterval is usually for polling, but we'll stick to manual mutate for now.
    },
  );

  const resume = data?.primaryResume || null;
  const resumes = data?.resumes || [];

  const hasResume = useMemo(() => resume !== null, [resume]);

  // When the API returns "no resume", but we are still validating or auth just finished,
  // we might be in a race condition where Firestore hasn't indexed the new doc yet.
  const [retryingForPropagation, setRetryingForPropagation] = useState(false);

  useEffect(() => {
    // If we have no resumes and we're not loading, but it's a first load or after a mutation
    if (!isLoading && !hasResume && !retryingForPropagation && user) {
      const lastActionTime = localStorage.getItem(
        `last_resume_action_${user.uid}`,
      );
      const now = Date.now();

      // If a resume was created/updated in the last 10 seconds, retry fetching
      if (lastActionTime && now - parseInt(lastActionTime) < 10000) {
        logger.info(
          "Detected recent resume action with empty result, retrying for propagation...",
        );
        setRetryingForPropagation(true);
        const timer = setTimeout(() => {
          mutate();
          setRetryingForPropagation(false);
          // Clear it after 5 retries or 10 seconds to avoid infinite loops
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, hasResume, user, mutate, retryingForPropagation]);

  const resumeId = useMemo(() => {
    // Use numericId if available, otherwise fall back to Firestore document ID
    const id = resume?.numericId || resume?.id || null;
    return id;
  }, [resume]);

  useEffect(() => {
    if (resumeId !== undefined) {
      logger.info(
        {
          numericId: resume?.numericId,
          docId: resume?.id,
          resolved: resumeId,
        },
        "Resume ID resolved:",
      );
    }
  }, [resumeId, resume?.numericId, resume?.id]);

  return {
    resume: resume as DashboardResume | null,
    resumes: resumes as DashboardResume[],
    loading: isLoading || (retryingForPropagation && !hasResume),
    error: error
      ? error instanceof Error
        ? error.message
        : "Failed to fetch resume"
      : null,
    hasResume,
    resumeId,
    refetch: useCallback(() => {
      if (user) {
        mutate();
      }
    }, [user, mutate]),
  };
};
