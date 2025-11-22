// src/hooks/useResume.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./useAuth";
import { ResumeProfile } from "@/types";

interface ResumeProfileWithId extends ResumeProfile {
  id: string;
  numericId?: number;
}

export const useResume = () => {
  const { user } = useAuth();
  const [resume, setResume] = useState<ResumeProfileWithId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    const fetchUserResume = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Query for user's resume profiles
        // 1. Try new 'resumes' collection first
        const resumesRef = collection(db, "resumes");
        const q = query(resumesRef, where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // Get the first (most recent) resume
          const resumeDoc = querySnapshot.docs[0];
          const data = resumeDoc.data();
          const resumeData: ResumeProfileWithId = {
            ...(data as any), // Cast to any to handle structure differences
            id: resumeDoc.id,
            numericId: data.numericId,
          };
          console.log("Resume loaded from 'resumes':", resumeData);
          setResume(resumeData);
        } else {
          // 2. Fallback to legacy 'resumeProfiles'
          const legacyResumesRef = collection(db, "resumeProfiles");
          const legacyQ = query(
            legacyResumesRef,
            where("userId", "==", user.uid)
          );
          const legacySnapshot = await getDocs(legacyQ);

          if (!legacySnapshot.empty) {
            const resumeDoc = legacySnapshot.docs[0];
            const resumeData: ResumeProfileWithId = {
              ...(resumeDoc.data() as ResumeProfile),
              id: resumeDoc.id,
            };
            console.log("Resume loaded from 'resumeProfiles':", resumeData);
            setResume(resumeData);
          } else {
            console.log("No resume found for user");
            setResume(null);
          }
        }
      } catch (err) {
        console.error("Error fetching resume:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch resume");
      } finally {
        setLoading(false);
      }
    };

    fetchUserResume();
  }, [user, refetchTrigger]);

  const hasResume = () => {
    return resume !== null;
  };

  const getResumeId = () => {
    // Use numericId if available, otherwise fall back to Firestore document ID
    const id = resume?.numericId || resume?.id || null;
    console.log("Resume ID resolved:", {
      numericId: resume?.numericId,
      docId: resume?.id,
      resolved: id,
    });
    return id;
  };

  return {
    resume,
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
