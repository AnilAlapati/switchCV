/**
 * Resume Migration Utilities
 *
 * Functions to migrate existing resumes to new format with numeric IDs
 */

import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generateNumericResumeId } from "@/lib/numericIdGenerator";
import type { ResumeProfile } from "@/types";

interface ResumeWithoutNumericId extends ResumeProfile {
  id: string;
  numericId?: undefined;
}

/**
 * Find all resumes without numeric IDs
 * Note: In Firestore, we can't query for undefined/missing fields directly
 * So we fetch all and filter in code
 */
export const findResumesWithoutNumericIds = async (): Promise<
  ResumeWithoutNumericId[]
> => {
  try {
    const resumesRef = collection(db, "resumeProfiles");
    // Get all published resumes
    const q = query(resumesRef, where("published", "==", true));
    const snapshot = await getDocs(q);

    // Filter for those without numericId
    const resumesWithoutId = snapshot.docs
      .filter((docSnap) => {
        const data = docSnap.data() as any;
        return !data.numericId;
      })
      .map((docSnap) => ({
        ...(docSnap.data() as ResumeProfile),
        id: docSnap.id,
      })) as ResumeWithoutNumericId[];

    console.log(`Found ${resumesWithoutId.length} resumes without numeric IDs`);
    return resumesWithoutId;
  } catch (error) {
    console.error("Error finding resumes without numeric IDs:", error);
    throw error;
  }
};

/**
 * Migrate a single resume by assigning it a numeric ID
 */
export const migrateResumeToNumericId = async (
  resumeDocId: string
): Promise<number> => {
  try {
    const numericId = await generateNumericResumeId();
    const resumeRef = doc(db, "resumeProfiles", resumeDocId);

    await updateDoc(resumeRef, {
      numericId,
    });

    console.log(
      `✅ Migrated resume ${resumeDocId} with numeric ID: ${numericId}`
    );
    return numericId;
  } catch (error) {
    console.error(
      `Error migrating resume ${resumeDocId} to numeric ID:`,
      error
    );
    throw error;
  }
};

/**
 * Migrate all resumes without numeric IDs
 */
export const migrateAllResumesToNumericIds = async (): Promise<number> => {
  try {
    const resumesWithoutIds = await findResumesWithoutNumericIds();

    if (resumesWithoutIds.length === 0) {
      console.log("✅ All resumes already have numeric IDs");
      return 0;
    }

    console.log(
      `🔄 Migrating ${resumesWithoutIds.length} resumes to numeric IDs...`
    );

    let migratedCount = 0;
    for (const resume of resumesWithoutIds) {
      try {
        await migrateResumeToNumericId(resume.id);
        migratedCount++;
      } catch (error) {
        console.error(`Failed to migrate resume ${resume.id}:`, error);
      }
    }

    console.log(
      `✅ Migration complete: ${migratedCount}/${resumesWithoutIds.length} resumes updated`
    );
    return migratedCount;
  } catch (error) {
    console.error("Error in batch migration:", error);
    throw error;
  }
};

/**
 * Assign numeric ID to a specific user's resumes that don't have one
 */
export const migrateUserResumesToNumericIds = async (
  userId: string
): Promise<number> => {
  try {
    const resumesRef = collection(db, "resumeProfiles");
    const q = query(resumesRef, where("userId", "==", userId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log(`✅ No resumes found for user ${userId}`);
      return 0;
    }

    // Filter for those without numericId
    const resumesWithoutId = snapshot.docs.filter((docSnap) => {
      const data = docSnap.data() as any;
      return !data.numericId;
    });

    if (resumesWithoutId.length === 0) {
      console.log(`✅ All resumes for user ${userId} have numeric IDs`);
      return 0;
    }

    console.log(
      `🔄 Migrating ${resumesWithoutId.length} resume(s) for user ${userId}...`
    );

    let migratedCount = 0;
    for (const docSnap of resumesWithoutId) {
      try {
        await migrateResumeToNumericId(docSnap.id);
        migratedCount++;
      } catch (error) {
        console.error(`Failed to migrate resume ${docSnap.id}:`, error);
      }
    }

    console.log(
      `✅ User migration complete: ${migratedCount}/${resumesWithoutId.length} resumes updated`
    );
    return migratedCount;
  } catch (error) {
    console.error(`Error migrating user ${userId} resumes:`, error);
    throw error;
  }
};
