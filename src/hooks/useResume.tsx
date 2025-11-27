"use client";

import { logger } from "@/lib/logger";
// src/hooks/useResume.tsx

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./useAuth";
import { ResumeProfile } from "@/types";

interface ResumeProfileWithId extends ResumeProfile {
  id: string;
  numericId?: number;
}

export const useResume = (options: { enabled?: boolean } = {}) => {
  const { user } = useAuth();
  const { enabled = true } = options;
  const [resume, setResume] = useState<ResumeProfileWithId | null>(null);
  const [resumes, setResumes] = useState<ResumeProfileWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    const fetchUserResume = async () => {
      if (!user || !enabled) {
        setResume(null);
        setResumes([]);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Query for user's resume profiles
        // 1. Try new 'resumes' collection first
        const resumesRef = collection(db, "resumes");
        const q = query(resumesRef, where("userId", "==", user.uid), limit(20));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const allResumes = querySnapshot.docs.map((doc) => ({
            ...(doc.data() as any),
            id: doc.id,
            numericId: doc.data().numericId,
          }));

          // Sort by createdAt desc (newest first)
          allResumes.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });

          logger.info(`Loaded ${allResumes.length} resumes from 'resumes'`);
          setResumes(allResumes);
          setResume(allResumes[0]); // Set the most recent one as primary
        } else {
          // 2. Fallback to legacy 'resumeProfiles'
          const legacyResumesRef = collection(db, "resumeProfiles");
          const legacyQ = query(
            legacyResumesRef,
            where("userId", "==", user.uid),
            limit(20)
          );
          const legacySnapshot = await getDocs(legacyQ);

          if (!legacySnapshot.empty) {
            const allLegacyResumes = legacySnapshot.docs.map((doc) => ({
              ...(doc.data() as ResumeProfile),
              id: doc.id,
            }));
            // Sort by createdAt desc (newest first)
            allLegacyResumes.sort((a, b) => {
              const dateA = new Date(a.lastUpdatedAt || 0).getTime();
              const dateB = new Date(b.lastUpdatedAt || 0).getTime();
              return dateB - dateA;
            });

            logger.info(
              `Loaded ${allLegacyResumes.length} resumes from 'resumeProfiles'`
            );
            setResumes(allLegacyResumes);
            setResume(allLegacyResumes[0]);
          } else {
            logger.info("No resume found for user");
            setResume(null);
            setResumes([]);
          }
        }
      } catch (err) {
        logger.error({ err: err }, "Error fetching resume:");
        setError(err instanceof Error ? err.message : "Failed to fetch resume");
      } finally {
        setLoading(false);
      }
    };

    fetchUserResume();
  }, [user, refetchTrigger, enabled]);

  const hasResume = () => {
    return resume !== null;
  };

  const getResumeId = () => {
    // Use numericId if available, otherwise fall back to Firestore document ID
    const id = resume?.numericId || resume?.id || null;
    logger.info({
      numericId: resume?.numericId,
      docId: resume?.id,
      resolved: id,
    }, "Resume ID resolved:");
    return id;
  };

  return {
    resume,
    resumes,
    loading,
    error,
    hasResume: hasResume(),
    resumeId: getResumeId(),
    refetch: () => {
      if (user) {
        setRefetchTrigger((prev) => prev + 1);
      }
    },
  };
};
