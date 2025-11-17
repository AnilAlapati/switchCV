// src/app/api/user/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

/**
 * Helper function to verify the Firebase ID token from the request
 */
async function verifyAuth(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const idToken = authHeader.slice(7); // Remove "Bearer " prefix
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken.uid;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: Valid Firebase ID token required" },
        { status: 401 }
      );
    }

    // Verify that the user can only access their own settings
    const requestedUserId = new URL(request.url).searchParams.get("userId");
    if (!requestedUserId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    if (userId !== requestedUserId) {
      return NextResponse.json(
        { error: "Forbidden: Cannot access other user's settings" },
        { status: 403 }
      );
    }

    // Get user document using Admin SDK (bypasses Firestore security rules)
    const userDoc = await adminDb.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    const settings = {
      isRecruiter: userData?.isRecruiter || false,
      displayName: userData?.displayName || "",
      companyName: userData?.companyName || "",
      updatedAt: userData?.settingsUpdatedAt || new Date().toISOString(),
    };

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching user settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: Valid Firebase ID token required" },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const {
      userId: requestedUserId,
      isRecruiter,
      companyName,
      displayName,
    } = body;

    if (!requestedUserId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Verify that the user can only update their own settings
    if (userId !== requestedUserId) {
      return NextResponse.json(
        { error: "Forbidden: Cannot update other user's settings" },
        { status: 403 }
      );
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      settingsUpdatedAt: new Date().toISOString(),
    };

    // Only add fields that were explicitly provided
    if (typeof isRecruiter === "boolean") {
      updateData.isRecruiter = isRecruiter;
    }
    if (companyName !== undefined && companyName !== null) {
      updateData.companyName = companyName;
    }
    if (displayName !== undefined && displayName !== null) {
      updateData.displayName = displayName;
    }

    // Use set with merge to create the document if it doesn't exist
    await adminDb
      .collection("users")
      .doc(userId)
      .set(updateData, { merge: true });

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
    });
  } catch (error) {
    console.error("Error updating user settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
