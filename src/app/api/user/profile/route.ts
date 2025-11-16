import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  isRecruiter: boolean;
  companyName?: string;
  subscriptionTier: "basic" | "premium"; // basic or premium
  createdAt?: string;
  updatedAt: string;
}

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

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId");

    if (!requestedUserId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Users can only access their own profile
    if (userId !== requestedUserId) {
      return NextResponse.json(
        { error: "Forbidden: Cannot access other user's profile" },
        { status: 403 }
      );
    }

    const userDoc = await adminDb.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(userDoc.data());
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: Valid Firebase ID token required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      uid,
      email,
      displayName,
      isRecruiter,
      companyName,
      subscriptionTier,
    } = body;

    if (!uid || !email) {
      return NextResponse.json(
        { error: "uid and email are required" },
        { status: 400 }
      );
    }

    // Users can only create profiles for themselves
    if (userId !== uid) {
      return NextResponse.json(
        { error: "Forbidden: Cannot create profiles for other users" },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const userProfileData: UserProfile = {
      uid,
      email,
      displayName: displayName || "",
      isRecruiter: isRecruiter || false,
      companyName: companyName || "",
      subscriptionTier: subscriptionTier || "basic", // default to basic
      createdAt: now,
      updatedAt: now,
    };

    await adminDb
      .collection("users")
      .doc(uid)
      .set(userProfileData, { merge: true });

    return NextResponse.json({
      success: true,
      message: "User profile created successfully",
      data: userProfileData,
    });
  } catch (error) {
    console.error("Error creating user profile:", error);
    return NextResponse.json(
      { error: "Failed to create user profile" },
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

    const body = await request.json();
    const { uid, displayName, isRecruiter, companyName, subscriptionTier } =
      body;

    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    // Users can only update their own profile
    if (userId !== uid) {
      return NextResponse.json(
        { error: "Forbidden: Cannot update other user's profile" },
        { status: 403 }
      );
    }

    const updateData: Partial<UserProfile> = {
      updatedAt: new Date().toISOString(),
    };

    if (displayName !== undefined) updateData.displayName = displayName;
    if (isRecruiter !== undefined) updateData.isRecruiter = isRecruiter;
    if (companyName !== undefined) updateData.companyName = companyName;
    if (subscriptionTier !== undefined)
      updateData.subscriptionTier = subscriptionTier;

    await adminDb.collection("users").doc(uid).set(updateData, { merge: true });

    return NextResponse.json({
      success: true,
      message: "User profile updated successfully",
      data: updateData,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 }
    );
  }
}
