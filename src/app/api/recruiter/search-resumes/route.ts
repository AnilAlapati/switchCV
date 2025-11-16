import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getDocumentIdFromResumeId } from "@/lib/resumeIdMapping";

interface SearchRequest {
  recruiterId: string; // Current recruiter's ID
  userId?: string; // For basic search - search by candidate user ID or resume ID
  skills?: string[]; // For premium search - search by skills
  location?: string; // For premium search - search by location
}

interface SearchResultCard {
  resumeId: string;
  title: string;
  userName: string;
  userId: string;
  skills?: string[];
  location?: string;
  createdAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequest = await request.json();
    const { recruiterId, userId, skills, location } = body;

    if (!recruiterId) {
      return NextResponse.json(
        { error: "recruiterId is required" },
        { status: 400 }
      );
    }

    // Get recruiter's subscription tier
    const recruiterDoc = await adminDb
      .collection("users")
      .doc(recruiterId)
      .get();

    if (!recruiterDoc.exists) {
      return NextResponse.json(
        { error: "Recruiter not found" },
        { status: 404 }
      );
    }

    const recruiterData = recruiterDoc.data();
    const subscriptionTier = recruiterData?.subscriptionTier || "basic";

    // eslint-disable-next-line prefer-const
    let results: SearchResultCard[] = [];

    // BASIC TIER: Search by user ID only, max 1 result
    if (subscriptionTier === "basic") {
      if (!userId) {
        return NextResponse.json(
          {
            error: "userId is required for basic search",
            notification: "Basic plan allows searching by candidate ID only",
          },
          { status: 400 }
        );
      }

      try {
        console.log(`[Search] Searching for resume/user: ${userId}`);

        // First, try to find by resume ID using the mapping
        const mapping = await getDocumentIdFromResumeId(userId);

        if (mapping) {
          console.log(
            `[Search] Found mapping for resume ID "${userId}" -> doc "${mapping.documentId}"`
          );

          // Get the resume using the mapped document ID
          const resumeSnapshot = await adminDb
            .collection("resumes")
            .doc(mapping.documentId)
            .get();

          if (resumeSnapshot.exists) {
            const resumeData = resumeSnapshot.data();

            if (!resumeData) {
              return NextResponse.json({
                results: [],
                notification: "Resume data not found",
                tier: "basic",
                maxResults: 1,
              });
            }

            console.log(
              `[Search] Resume found - Published: ${resumeData.published}`
            );

            // Check if resume is published
            if (!resumeData.published) {
              return NextResponse.json({
                results: [],
                notification: "This resume is not published",
                tier: "basic",
                maxResults: 1,
              });
            }

            // Get user profile
            const userSnapshot = await adminDb
              .collection("users")
              .doc(mapping.userId)
              .get();

            if (!userSnapshot.exists) {
              return NextResponse.json({
                results: [],
                notification: "Candidate profile not found",
                tier: "basic",
                maxResults: 1,
              });
            }

            const userData = userSnapshot.data();

            results.push({
              resumeId: userId, // Use the friendly ID
              title: resumeData.title || "Untitled Resume",
              userName: userData?.displayName || userData?.email || "Unknown",
              userId: mapping.userId,
              createdAt: resumeData.createdAt || new Date().toISOString(),
            });

            console.log(`[Search] Resume found and returned: ${userId}`);

            return NextResponse.json({
              results,
              tier: "basic",
              maxResults: 1,
              count: results.length,
            });
          }
        }

        console.log(`[Search] No mapping found, trying direct document lookup`);

        // Try to find by document ID directly (backward compatibility)
        const resumeSnapshot = await adminDb
          .collection("resumes")
          .doc(userId)
          .get();

        if (resumeSnapshot.exists) {
          const resumeData = resumeSnapshot.data();

          if (!resumeData) {
            return NextResponse.json({
              results: [],
              notification: "Resume data not found",
              tier: "basic",
              maxResults: 1,
            });
          }

          if (!resumeData.published) {
            return NextResponse.json({
              results: [],
              notification: "This resume is not published",
              tier: "basic",
              maxResults: 1,
            });
          }

          const userSnapshot = await adminDb
            .collection("users")
            .doc(resumeData.userId)
            .get();

          if (!userSnapshot.exists) {
            return NextResponse.json({
              results: [],
              notification: "Candidate profile not found",
              tier: "basic",
              maxResults: 1,
            });
          }

          const userData = userSnapshot.data();

          results.push({
            resumeId: resumeSnapshot.id,
            title: resumeData.title || "Untitled Resume",
            userName: userData?.displayName || userData?.email || "Unknown",
            userId: resumeData.userId,
            createdAt: resumeData.createdAt || new Date().toISOString(),
          });

          return NextResponse.json({
            results,
            tier: "basic",
            maxResults: 1,
            count: results.length,
          });
        }

        console.log(`[Search] Trying user ID lookup for "${userId}"`);

        // If not found by resume ID, try by user ID
        const userSnapshot = await adminDb
          .collection("users")
          .doc(userId)
          .get();

        console.log(
          `[Search] User lookup for "${userId}": ${
            userSnapshot.exists ? "FOUND" : "NOT FOUND"
          }`
        );

        if (!userSnapshot.exists) {
          console.log(`[Search] No results found for "${userId}"`);
          return NextResponse.json({
            results: [],
            notification: "Candidate not found (try with resume ID or user ID)",
            tier: "basic",
            maxResults: 1,
          });
        }

        const userData = userSnapshot.data();

        // Get user's resumes (published only)
        const resumesSnapshot = await adminDb
          .collection("resumes")
          .where("userId", "==", userId)
          .where("published", "==", true)
          .limit(1) // Max 1 for basic tier
          .get();

        if (resumesSnapshot.empty) {
          return NextResponse.json({
            results: [],
            notification: "No published resume found for this candidate",
            tier: "basic",
            maxResults: 1,
          });
        }

        const resumeDoc = resumesSnapshot.docs[0];
        const resumeData = resumeDoc.data();

        results.push({
          resumeId: resumeDoc.id,
          title: resumeData.title || "Untitled Resume",
          userName: userData?.displayName || userData?.email || "Unknown",
          userId: userId,
          createdAt: resumeData.createdAt || new Date().toISOString(),
        });
      } catch (error) {
        console.error("Basic search error:", error);
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
      }

      return NextResponse.json({
        results,
        notification: results.length === 0 ? "No resume found" : undefined,
        tier: "basic",
        maxResults: 1,
        count: results.length,
      });
    }

    // PREMIUM TIER: Search by skills and/or location, multiple results
    if (subscriptionTier === "premium") {
      if (!skills && !location) {
        return NextResponse.json(
          { error: "Either skills or location is required for premium search" },
          { status: 400 }
        );
      }

      try {
        // Get all published resumes
        const resumesSnapshot = await adminDb
          .collection("resumes")
          .where("published", "==", true)
          .get();

        const seenUserIds = new Set<string>();

        for (const resumeDoc of resumesSnapshot.docs) {
          const resumeData = resumeDoc.data();
          const userId = resumeData.userId;

          // Skip if we've already added a resume from this user
          if (seenUserIds.has(userId)) {
            continue;
          }

          // Get user data
          const userSnapshot = await adminDb
            .collection("users")
            .doc(userId)
            .get();

          if (!userSnapshot.exists) continue;

          const userData = userSnapshot.data();
          if (!userData) continue;

          const resumeSkills =
            resumeData.skills?.map((s: any) =>
              typeof s === "string" ? s : s.name
            ) || [];
          const resumeLocation = userData.location || resumeData.location || "";

          // Check skill match
          const skillsMatch =
            !skills ||
            skills.length === 0 ||
            skills.some((skill) =>
              resumeSkills.some((rs: string) =>
                rs.toLowerCase().includes(skill.toLowerCase())
              )
            );

          // Check location match
          const locationMatch =
            !location ||
            resumeLocation.toLowerCase().includes(location.toLowerCase());

          // Add if matches either criteria
          if (skillsMatch || locationMatch) {
            seenUserIds.add(userId);
            results.push({
              resumeId: resumeDoc.id,
              title: resumeData.title || "Untitled Resume",
              userName: userData.displayName || userData.email || "Unknown",
              userId: userId,
              skills: resumeSkills.slice(0, 5), // Show max 5 skills
              location: resumeLocation || undefined,
              createdAt: resumeData.createdAt || new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        console.error("Premium search error:", error);
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
      }

      return NextResponse.json({
        results: results.slice(0, 50), // Limit to 50 results
        tier: "premium",
        count: results.length,
        totalSearched: results.length,
      });
    }

    return NextResponse.json(
      { error: "Invalid subscription tier" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Request handling error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
