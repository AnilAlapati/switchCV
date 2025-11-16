// src/app/api/recruiter/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit as firestoreLimit,
} from "firebase/firestore";
import { SearchResult } from "@/components/dashboard/RecruiterSearchBox";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get("q");

    if (!searchQuery) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    const searchLower = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search in resumes collection
    try {
      const resumesRef = collection(db, "resumes");
      const resumesQuery = query(
        resumesRef,
        where("published", "==", true),
        orderBy("createdAt", "desc"),
        firestoreLimit(50)
      );

      const resumesSnapshot = await getDocs(resumesQuery);

      for (const doc of resumesSnapshot.docs) {
        const resumeData = doc.data();
        const title = resumeData.title || "Untitled Resume";
        const userId = resumeData.userId;
        const slug = resumeData.slug || "";
        const summary =
          resumeData.summary || resumeData.generatedText?.polished || "";
        const skills = resumeData.skills?.map((s: any) => s.name) || [];

        // Check if matches search query (resume number, title, or skill)
        const resumeNumber = doc.id.substring(0, 6);
        const matchesNumber = resumeNumber.includes(searchLower);
        const matchesTitle = title.toLowerCase().includes(searchLower);
        const matchesSkill = skills.some((skill: string) =>
          skill.toLowerCase().includes(searchLower)
        );

        if (!matchesNumber && !matchesTitle && !matchesSkill) {
          continue;
        }

        // Fetch user info
        try {
          const userDoc = await getDocs(
            query(collection(db, "users"), where("uid", "==", userId))
          );
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
            results.push({
              resumeId: doc.id,
              title,
              userName: userData.displayName || userData.email || "Anonymous",
              userEmail: userData.email || "N/A",
              slug,
              createdAt: resumeData.createdAt || new Date().toISOString(),
              skills: skills.slice(0, 10),
              summary,
            });
          }
        } catch (err) {
          console.error("Error fetching user for resume:", err);
          // Continue with just resume data if user fetch fails
          results.push({
            resumeId: doc.id,
            title,
            userName: "Unknown User",
            userEmail: "N/A",
            slug,
            createdAt: resumeData.createdAt || new Date().toISOString(),
            skills: skills.slice(0, 10),
            summary,
          });
        }
      }

      // Also search in users by name/email if no resumes found
      if (results.length === 0) {
        const usersRef = collection(db, "users");
        const usersQuery = query(
          usersRef,
          where("publicProfile.visible", "==", true)
        );
        const usersSnapshot = await getDocs(usersQuery);

        for (const doc of usersSnapshot.docs) {
          const userData = doc.data();
          const displayName = userData.displayName || "";
          const email = userData.email || "";

          if (
            displayName.toLowerCase().includes(searchLower) ||
            email.toLowerCase().includes(searchLower)
          ) {
            // Get user's resumes
            const userResumesQuery = query(
              collection(db, "resumes"),
              where("userId", "==", doc.id),
              where("published", "==", true)
            );
            const userResumesSnapshot = await getDocs(userResumesQuery);

            for (const resumeDoc of userResumesSnapshot.docs) {
              const resumeData = resumeDoc.data();
              results.push({
                resumeId: resumeDoc.id,
                title: resumeData.title || "Untitled Resume",
                userName: displayName,
                userEmail: email,
                slug: resumeData.slug || "",
                createdAt: resumeData.createdAt || new Date().toISOString(),
                skills:
                  resumeData.skills?.map((s: any) => s.name).slice(0, 10) || [],
                summary:
                  resumeData.summary ||
                  resumeData.generatedText?.polished ||
                  "",
              });
            }
          }
        }
      }

      // Remove duplicates
      const uniqueResults = Array.from(
        new Map(results.map((r) => [r.resumeId, r])).values()
      );

      return NextResponse.json({
        results: uniqueResults.slice(0, 20),
        count: uniqueResults.length,
        query: searchQuery,
      });
    } catch (error) {
      console.error("Search error:", error);
      return NextResponse.json(
        {
          error: "Search failed",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Request handling error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
