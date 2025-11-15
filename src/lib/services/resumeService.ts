/**
 * Resume fetching and data retrieval service
 */

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { ResumeProfile } from "@/types";

export const fetchResumeBySlug = async (
  slug: string
): Promise<ResumeProfile | null> => {
  try {
    const resumesRef = collection(db, "resumes");
    const q = query(resumesRef, where("slug", "==", slug));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as unknown as ResumeProfile;
  } catch (error) {
    console.error("Error fetching resume:", error);
    return null;
  }
};

export const trackResumeView = async (
  resumeId: string,
  viewerId?: string
): Promise<void> => {
  try {
    const viewsRef = collection(db, "resumeViews");
    const timestamp = new Date().toISOString();

    await getDocs(
      query(
        viewsRef,
        where("resumeId", "==", resumeId),
        where("timestamp", "==", timestamp)
      )
    );

    // Track view would go here
    // For now, just silently tracking in Firestore
  } catch (error) {
    console.error("Error tracking resume view:", error);
  }
};
