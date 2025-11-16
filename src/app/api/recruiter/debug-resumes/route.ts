import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    // Get all published resumes
    const resumesSnapshot = await adminDb
      .collection("resumes")
      .where("published", "==", true)
      .limit(50)
      .get();

    const resumes = [];

    for (const doc of resumesSnapshot.docs) {
      const resumeData = doc.data();
      const userDoc = await adminDb
        .collection("users")
        .doc(resumeData.userId)
        .get();

      resumes.push({
        resumeId: doc.id,
        title: resumeData.title || "Untitled",
        userId: resumeData.userId,
        userName: userDoc.exists
          ? userDoc.data()?.displayName || userDoc.data()?.email || "Unknown"
          : "Unknown",
        published: resumeData.published,
        createdAt: resumeData.createdAt,
      });
    }

    return NextResponse.json({
      message: "All published resumes",
      total: resumes.length,
      resumes,
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { error: "Failed to fetch resumes" },
      { status: 500 }
    );
  }
}
