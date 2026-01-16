import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserId, handleApiError } from "@/lib/utils/api-helpers";

export async function GET(request: NextRequest) {
    try {
        const { userId, error } = await getAuthenticatedUserId(request);
        if (error) return error;

        const profileDoc = await adminDb.collection("profiles").doc(userId!).get();
        const profile = profileDoc.data() || {};

        return NextResponse.json(profile, {
            headers: {
                "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
            },
        });
    } catch (error) {
        return handleApiError(error, "Failed to fetch job seeker profile");
    }
}

export async function POST(request: NextRequest) {
    try {
        const { userId, error } = await getAuthenticatedUserId(request);
        if (error) return error;

        const body = await request.json();

        // Minimal validation - expand as needed
        const updateData = {
            ...body,
            userId,
            updatedAt: new Date().toISOString()
        };

        await adminDb.collection("profiles").doc(userId!).set(updateData, { merge: true });

        return NextResponse.json({ success: true, profile: updateData });
    } catch (error) {
        return handleApiError(error, "Failed to update job seeker profile");
    }
}
