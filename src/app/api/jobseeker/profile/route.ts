import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { COLLECTIONS, collectionRef } from "@/lib/dal";
import { getAuthenticatedUserId, handleApiError } from "@/lib/utils/api-helpers";

import { JobseekerProfileSchema } from "@/lib/schemas/api/jobseeker-profile.schemas";

export async function GET(request: NextRequest) {
    try {
        const { userId, error } = await getAuthenticatedUserId(request);
        if (error) return error;

        const profileDoc = await collectionRef(COLLECTIONS.PROFILES).doc(userId!).get();
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

        const parseResult = JobseekerProfileSchema.safeParse(await request.json());
        if (!parseResult.success) {
            return handleApiError(parseResult.error, "Invalid profile data", 400);
        }

        // Minimal validation - expand as needed
        const updateData = {
            ...parseResult.data,
            userId,
            updatedAt: new Date().toISOString()
        };

        await collectionRef(COLLECTIONS.PROFILES).doc(userId!).set(updateData, { merge: true });

        return NextResponse.json({ success: true, profile: updateData });
    } catch (error) {
        return handleApiError(error, "Failed to update job seeker profile");
    }
}
