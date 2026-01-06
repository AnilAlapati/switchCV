import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserId, handleApiError } from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
    try {
        const { userId, error } = await getAuthenticatedUserId(request);
        if (error) return error;

        const body = await request.json();
        const { role } = body;

        if (!role || !["jobseeker", "recruiter"].includes(role)) {
            return handleApiError(new Error("Invalid role"), "Invalid role provided", 400);
        }

        const isRecruiter = role === "recruiter";

        await adminDb.collection("users").doc(userId!).set({
            role,
            isRecruiter,
            roleSelectedAt: new Date().toISOString(), // Use ISO string for Admin SDK consistency
            roleUpdatedAt: new Date().toISOString(),
            roleUpdatedBy: "user-selection"
        }, { merge: true });

        logger.info({ userId, role }, "User role updated successfully");

        return NextResponse.json({ success: true, role });
    } catch (err) {
        logger.error({ err }, "Failed to update user role");
        return handleApiError(err, "Failed to update user role");
    }
}
