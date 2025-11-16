// src/app/api/user/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
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
    const { userId, isRecruiter, companyName } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Use set with merge to create the document if it doesn't exist
    await adminDb
      .collection("users")
      .doc(userId)
      .set(
        {
          isRecruiter: isRecruiter || false,
          companyName: companyName || "",
          settingsUpdatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

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
