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
import { logger } from "@/lib/logger";
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

    logger.info(
      { count: resumesWithoutId.length },
      "Found resumes without numeric IDs"
    );
    return resumesWithoutId;
  } catch (error) {
    logger.error({ err: error }, "Error finding resumes without numeric IDs");
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

    logger.info({ resumeDocId, numericId }, "Migrated resume with numeric ID");
    return numericId;
  } catch (error) {
    logger.error(
      { err: error, resumeDocId },
      "Error migrating resume to numeric ID"
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
      logger.info("All resumes already have numeric IDs");
      return 0;
    }

    logger.info(
      { count: resumesWithoutIds.length },
      "Migrating resumes to numeric IDs"
    );

    let migratedCount = 0;
    for (const resume of resumesWithoutIds) {
      try {
        await migrateResumeToNumericId(resume.id);
        migratedCount++;
      } catch (error) {
        logger.error(
          { err: error, resumeId: resume.id },
          "Failed to migrate resume"
        );
      }
    }

    logger.info(
      { migratedCount, total: resumesWithoutIds.length },
      "Migration complete"
    );
    return migratedCount;
  } catch (error) {
    logger.error({ err: error }, "Error in batch migration");
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
      logger.info({ userId }, "No resumes found for user");
      return 0;
    }

    // Filter for those without numericId
    const resumesWithoutId = snapshot.docs.filter((docSnap) => {
      const data = docSnap.data() as any;
      return !data.numericId;
    });

    if (resumesWithoutId.length === 0) {
      logger.info({ userId }, "All resumes for user have numeric IDs");
      return 0;
    }

    logger.info(
      { userId, count: resumesWithoutId.length },
      "Migrating user resumes"
    );

    let migratedCount = 0;
    for (const docSnap of resumesWithoutId) {
      try {
        await migrateResumeToNumericId(docSnap.id);
        migratedCount++;
      } catch (error) {
        logger.error(
          { err: error, resumeId: docSnap.id },
          "Failed to migrate resume"
        );
      }
    }

    logger.info(
      { userId, migratedCount, total: resumesWithoutId.length },
      "User migration complete"
    );
    return migratedCount;
  } catch (error) {
    logger.error({ err: error, userId }, "Error migrating user resumes");
    throw error;
  }
};
