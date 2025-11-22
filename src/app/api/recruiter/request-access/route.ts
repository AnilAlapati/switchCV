// src/app/api/recruiter/request-access/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  increment,
} from "firebase/firestore";
import { handleApiError } from "@/lib/utils/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const { resumeId, requestedFields = ["email", "phone"] } =
      await request.json();

    if (!resumeId) {
      return handleApiError(null, "resumeId is required", 400);
    }

    // Get resume to find owner
    const resumeRef = doc(db, "resumes", resumeId);
    const resumeDoc = await getDoc(resumeRef);

    if (!resumeDoc.exists()) {
      return handleApiError(null, "Resume not found", 404);
    }

    const resumeData = resumeDoc.data();
    const userId = resumeData.userId;
    const title = resumeData.title || "Untitled Resume";

    // Get user info
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return handleApiError(null, "User not found", 404);
    }

    const userData = userDoc.data();

    // Check if request already exists
    const existingQuery = query(
      collection(db, "recruiterRequests"),
      where("resumeId", "==", resumeId),
      where("status", "==", "pending")
    );
    const existingDocs = await getDocs(existingQuery);

    if (!existingDocs.empty) {
      return handleApiError(
        new Error("A pending request already exists for this resume"),
        "A pending request already exists for this resume",
        409
      );
    }

    // Create new access request
    const requestsRef = collection(db, "recruiterRequests");
    const newRequest = await addDoc(requestsRef, {
      resumeId,
      userId,
      resumeTitle: title,
      userEmail: userData.email,
      requestedFields,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Increment request count in user document
    try {
      await updateDoc(userRef, {
        requestCount: increment(1),
      });
    } catch (err) {
      console.warn("Could not update request count:", err);
    }

    return NextResponse.json({
      success: true,
      requestId: newRequest.id,
      message:
        "Access request sent successfully. The candidate will be notified.",
    });
  } catch (error) {
    return handleApiError(error, "Failed to send access request");
  }
}
