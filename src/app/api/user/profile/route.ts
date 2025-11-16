import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

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
    const body = await request.json();
    const { uid, displayName, isRecruiter, companyName, subscriptionTier } =
      body;

    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
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
