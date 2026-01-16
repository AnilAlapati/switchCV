// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";
import { getDocumentIdFromResumeId } from "@/lib/resumeIdMapping";
import { AccessStatusMap, getAccessStatus } from "./access-status";
import { getDisplayName } from "./search-result";
import type { SearchResultCard } from "./search-result";
import { logger } from "@/lib/logger";
import type { User } from "@/types";

export { buildAccessStatusMap } from "./access-status";
export type { SearchResultCard } from "./search-result";

const PREMIUM_RESULT_LIMIT = 50;
const PREMIUM_SCAN_LIMIT = 200;

export async function performBasicSearch(
  userId: string,
  recruiterId: string,
  accessStatusMap?: AccessStatusMap
): Promise<{ results: SearchResultCard[]; notification?: string }> {
  const results: SearchResultCard[] = [];

  try {
    logger.info({ userId }, "[Search] Searching for resume/user");

    // First, try to find by resume ID using the mapping
    const mapping = await getDocumentIdFromResumeId(userId);

    if (mapping) {
      logger.info(
        {
          resumeId: userId,
          documentId: mapping.documentId,
        },
        "[Search] Found resume mapping"
      );

      const resumeSnapshot = await adminDb
        .collection("resumes")
        .doc(mapping.documentId)
        .get();

      if (resumeSnapshot.exists) {
        const resumeData = resumeSnapshot.data();

        if (!resumeData) {
          return { results: [], notification: "Resume data not found" };
        }

        if (!resumeData.published) {
          return { results: [], notification: "This resume is not published" };
        }

        const userSnapshot = await adminDb
          .collection("users")
          .doc(mapping.userId)
          .get();

        if (!userSnapshot.exists) {
          return { results: [], notification: "Candidate profile not found" };
        }

        const userData = userSnapshot.data() || {};
        const accessStatus = await getAccessStatus(
          mapping.documentId,
          recruiterId,
          accessStatusMap
        );

        results.push({
          resumeId: userId,
          title: resumeData.title || "Untitled Resume",
          userName: getDisplayName(userData as Partial<User>),
          userId: mapping.userId,
          createdAt: resumeData.createdAt || new Date().toISOString(),
          accessStatus,
        });

        return { results };
      }
    }

    logger.info("[Search] No mapping found, trying direct lookup");

    // Try to find by document ID directly
    const resumeSnapshot = await adminDb
      .collection("resumes")
      .doc(userId)
      .get();

    if (resumeSnapshot.exists) {
      const resumeData = resumeSnapshot.data();

      if (!resumeData) {
        return { results: [], notification: "Resume data not found" };
      }

      if (!resumeData.published) {
        return { results: [], notification: "This resume is not published" };
      }

      const userSnapshot = await adminDb
        .collection("users")
        .doc(resumeData.userId)
        .get();

      if (!userSnapshot.exists) {
        return { results: [], notification: "Candidate profile not found" };
      }

      const userData = userSnapshot.data() || {};
      const accessStatus = await getAccessStatus(
        resumeSnapshot.id,
        recruiterId,
        accessStatusMap
      );

      results.push({
        resumeId: resumeSnapshot.id,
        title: resumeData.title || "Untitled Resume",
        userName: getDisplayName(userData as Partial<User>),
        userId: resumeData.userId,
        createdAt: resumeData.createdAt || new Date().toISOString(),
        accessStatus,
      });

      return { results };
    }

    logger.info({ userId }, "[Search] Trying user ID lookup");

    const userSnapshot = await adminDb.collection("users").doc(userId).get();

    if (!userSnapshot.exists) {
      return {
        results: [],
        notification: "Candidate not found (try with resume ID or user ID)",
      };
    }

    const userData = userSnapshot.data() || {};

    const resumesSnapshot = await adminDb
      .collection("resumes")
      .where("userId", "==", userId)
      .where("published", "==", true)
      .limit(1)
      .get();

    if (resumesSnapshot.empty) {
      return {
        results: [],
        notification: "No published resume found for this candidate",
      };
    }

    const resumeDoc = resumesSnapshot.docs[0];
    const resumeData = resumeDoc.data();
    const accessStatus = await getAccessStatus(
      resumeDoc.id,
      recruiterId,
      accessStatusMap
    );

    results.push({
      resumeId: resumeDoc.id,
      title: resumeData.title || "Untitled Resume",
      userName: getDisplayName(userData as Partial<User>),
      userId: userId,
      createdAt: resumeData.createdAt || new Date().toISOString(),
      accessStatus,
    });

    return { results };
  } catch (error) {
    logger.error({ err: error }, "Basic search error");
    throw error;
  }
}

export async function performPremiumSearch(
  skills: string[] | undefined,
  location: string | undefined,
  recruiterId: string,
  accessStatusMap?: AccessStatusMap
): Promise<{ results: SearchResultCard[] }> {
  const results: SearchResultCard[] = [];

  try {
    const normalizedSkills =
      skills?.map((skill) => skill.trim().toLowerCase()).filter(Boolean) || [];
    const normalizedLocation = location?.trim().toLowerCase() || "";

    let resumesQuery: FirebaseFirestore.Query = adminDb
      .collection("resumes")
      .where("published", "==", true);

    if (typeof resumesQuery.limit === "function") {
      resumesQuery = resumesQuery.limit(PREMIUM_SCAN_LIMIT);
    }

    const resumesSnapshot = await resumesQuery.get();
    const seenUserIds = new Set<string>();

    const userIdsToFetch = new Set<string>();
    for (const resumeDoc of resumesSnapshot.docs) {
      const uid = resumeDoc.data()?.userId;
      if (uid) {
        userIdsToFetch.add(uid);
      }
    }

    const userCache = new Map<string, Record<string, any> | null>();
    if (userIdsToFetch.size > 0) {
      const userRefs = Array.from(userIdsToFetch).map((id) =>
        adminDb.collection("users").doc(id)
      );
      const userSnapshots = await adminDb.getAll(...userRefs);
      userSnapshots.forEach((snapshot) => {
        userCache.set(
          snapshot.id,
          snapshot.exists ? (snapshot.data() as Record<string, any>) : null
        );
      });
    }

    for (const resumeDoc of resumesSnapshot.docs) {
      if (results.length >= PREMIUM_RESULT_LIMIT) {
        break;
      }

      const resumeData = resumeDoc.data();
      const userId = resumeData?.userId;

      if (!userId || seenUserIds.has(userId)) {
        continue;
      }

      if (!resumeData?.published) {
        continue;
      }

      const userData = userCache.get(userId) ?? null;

      if (!userData) {
        continue;
      }

      const resumeSkills = Array.isArray(resumeData.skills)
        ? resumeData.skills.map((skill: string | { name?: string }) =>
          typeof skill === "string" ? skill : skill?.name || ""
        )
        : [];
      const normalizedResumeSkills = resumeSkills
        .map((skill: string) => skill.toLowerCase())
        .filter(Boolean);

      const skillsMatch =
        normalizedSkills.length === 0 ||
        normalizedSkills.some((skill: string) =>
          normalizedResumeSkills.some((resumeSkill: string) =>
            resumeSkill.includes(skill)
          )
        );

      const candidateLocations = [
        userData.publicProfile?.location,
        userData.location,
        resumeData.location,
        resumeData.city,
        resumeData.region,
      ].filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0
      );

      const normalizedLocations = candidateLocations.map((value) =>
        value.toLowerCase()
      );

      const locationMatch =
        !normalizedLocation ||
        normalizedLocations.some((value) => value.includes(normalizedLocation));

      if (!skillsMatch && !locationMatch) {
        continue;
      }

      seenUserIds.add(userId);
      const accessStatus = await getAccessStatus(
        resumeDoc.id,
        recruiterId,
        accessStatusMap
      );

      results.push({
        resumeId: resumeDoc.id,
        title: resumeData.title || "Untitled Resume",
        userName: getDisplayName(userData),
        userId,
        skills: resumeSkills.filter(Boolean).slice(0, 5),
        location: candidateLocations[0] || undefined,
        createdAt: resumeData.createdAt || new Date().toISOString(),
        accessStatus,
      });
    }

    return { results };
  } catch (error) {
    logger.error({ err: error }, "Premium search error");
    throw error;
  }
}
