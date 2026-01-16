"use client";

import { logger } from "@/lib/logger";
// src/hooks/useResume.tsx

import { useMemo } from "react";
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

    // Fallback to legacy 'resumeProfiles' only if no resumes found
    const legacyResumesRef = collection(db, "resumeProfiles");
    const legacyQ = query(
      legacyResumesRef,
      where("userId", "==", userId),
      limit(20)
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
        `Loaded ${allLegacyResumes.length} resumes from 'resumeProfiles'`
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

  const { data, error, isLoading, mutate } = useSWR<ResumesData>(
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
    }
  );

  const resume = data?.primaryResume || null;
  const resumes = data?.resumes || [];

  const hasResume = useMemo(() => resume !== null, [resume]);

  const resumeId = useMemo(() => {
    // Use numericId if available, otherwise fall back to Firestore document ID
    const id = resume?.numericId || resume?.id || null;
    logger.info({
      numericId: resume?.numericId,
      docId: resume?.id,
      resolved: id,
    }, "Resume ID resolved:");
    return id;
  }, [resume]);

  return {
    resume: resume as DashboardResume | null,
    resumes: resumes as DashboardResume[],
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : "Failed to fetch resume") : null,
    hasResume,
    resumeId,
    refetch: () => {
      if (user) {
        mutate();
      }
    },
  };
};
