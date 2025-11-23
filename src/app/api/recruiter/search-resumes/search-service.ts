import { adminDb } from "@/lib/firebase-admin";
import { getDocumentIdFromResumeId } from "@/lib/resumeIdMapping";

export interface SearchResultCard {
  resumeId: string;
  title: string;
  userName: string;
  userId: string;
  skills?: string[];
  location?: string;
  createdAt: string;
  accessStatus?: "none" | "pending" | "approved" | "denied";
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const maskedUser = user.substring(0, 2) + "***";
  return `${maskedUser}@${domain}`;
}

export function getDisplayName(userData: any): string {
  if (userData.displayName) return userData.displayName;
  if (userData.email) return maskEmail(userData.email);
  return "Unknown";
}

export async function checkAccessStatus(
  resumeId: string,
  recruiterId: string
): Promise<"none" | "pending" | "approved" | "denied"> {
  try {
    const requests = await adminDb
      .collection("resumes")
      .doc(resumeId)
      .collection("accessRequests")
      .where("fromUserId", "==", recruiterId)
      .get();

    if (requests.empty) return "none";

    const statuses = requests.docs.map((doc) => doc.data().status);
    if (statuses.includes("approved")) return "approved";
    if (statuses.includes("pending")) return "pending";
    if (statuses.includes("denied")) return "denied";

    return "none";
  } catch (error) {
    console.error("Error checking access status:", error);
    return "none";
  }
}

export async function performBasicSearch(
  userId: string,
  recruiterId: string
): Promise<{ results: SearchResultCard[]; notification?: string }> {
  const results: SearchResultCard[] = [];

  try {
    console.log(`[Search] Searching for resume/user: ${userId}`);

    // First, try to find by resume ID using the mapping
    const mapping = await getDocumentIdFromResumeId(userId);

    if (mapping) {
      console.log(
        `[Search] Found mapping for resume ID "${userId}" -> doc "${mapping.documentId}"`
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

        const userData = userSnapshot.data();
        const accessStatus = await checkAccessStatus(
          mapping.documentId,
          recruiterId
        );

        results.push({
          resumeId: userId,
          title: resumeData.title || "Untitled Resume",
          userName: getDisplayName(userData),
          userId: mapping.userId,
          createdAt: resumeData.createdAt || new Date().toISOString(),
          accessStatus,
        });

        return { results };
      }
    }

    console.log(`[Search] No mapping found, trying direct document lookup`);

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

      const userData = userSnapshot.data();
      const accessStatus = await checkAccessStatus(
        resumeSnapshot.id,
        recruiterId
      );

      results.push({
        resumeId: resumeSnapshot.id,
        title: resumeData.title || "Untitled Resume",
        userName: getDisplayName(userData),
        userId: resumeData.userId,
        createdAt: resumeData.createdAt || new Date().toISOString(),
        accessStatus,
      });

      return { results };
    }

    console.log(`[Search] Trying user ID lookup for "${userId}"`);

    const userSnapshot = await adminDb.collection("users").doc(userId).get();

    if (!userSnapshot.exists) {
      return {
        results: [],
        notification: "Candidate not found (try with resume ID or user ID)",
      };
    }

    const userData = userSnapshot.data();

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
    const accessStatus = await checkAccessStatus(resumeDoc.id, recruiterId);

    results.push({
      resumeId: resumeDoc.id,
      title: resumeData.title || "Untitled Resume",
      userName: getDisplayName(userData),
      userId: userId,
      createdAt: resumeData.createdAt || new Date().toISOString(),
      accessStatus,
    });

    return { results };
  } catch (error) {
    console.error("Basic search error:", error);
    throw error;
  }
}

export async function performPremiumSearch(
  skills: string[] | undefined,
  location: string | undefined,
  recruiterId: string
): Promise<{ results: SearchResultCard[] }> {
  const results: SearchResultCard[] = [];

  try {
    const resumesSnapshot = await adminDb
      .collection("resumes")
      .where("published", "==", true)
      .get();

    const seenUserIds = new Set<string>();

    for (const resumeDoc of resumesSnapshot.docs) {
      const resumeData = resumeDoc.data();
      const userId = resumeData.userId;

      if (seenUserIds.has(userId)) continue;

      const userSnapshot = await adminDb.collection("users").doc(userId).get();

      if (!userSnapshot.exists) continue;

      const userData = userSnapshot.data();
      if (!userData) continue;

      const resumeSkills =
        resumeData.skills?.map((s: any) =>
          typeof s === "string" ? s : s.name
        ) || [];
      const resumeLocation = userData.location || resumeData.location || "";

      const skillsMatch =
        !skills ||
        skills.length === 0 ||
        skills.some((skill) =>
          resumeSkills.some((rs: string) =>
            rs.toLowerCase().includes(skill.toLowerCase())
          )
        );

      const locationMatch =
        !location ||
        resumeLocation.toLowerCase().includes(location.toLowerCase());

      if (skillsMatch || locationMatch) {
        seenUserIds.add(userId);
        const accessStatus = await checkAccessStatus(resumeDoc.id, recruiterId);

        results.push({
          resumeId: resumeDoc.id,
          title: resumeData.title || "Untitled Resume",
          userName: getDisplayName(userData),
          userId: userId,
          skills: resumeSkills.slice(0, 5),
          location: resumeLocation || undefined,
          createdAt: resumeData.createdAt || new Date().toISOString(),
          accessStatus,
        });
      }
    }

    return { results: results.slice(0, 50) };
  } catch (error) {
    console.error("Premium search error:", error);
    throw error;
  }
}
