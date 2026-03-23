/**
 * Username Setting API
 *
 * Server-side endpoint to atomically reserve a username and update the user profile.
 * Uses Firestore Admin SDK to bypass client-side security rules.
 *
 * @route POST /api/user/username/set
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
    collectionRef,
    COLLECTIONS,
    runTransaction,
    serverTimestamp,
} from "@/lib/dal";
import { getAuthenticatedUserId, handleApiError } from "@/lib/utils/api-helpers";
import { RESERVED_USERNAMES, USERNAME_CONFIG } from "@/config/constants";
import { logger } from "@/lib/logger";

const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9-_]{1,28}[a-z0-9])?$/;

const SetUsernameSchema = z.object({
    username: z
        .string()
        .min(USERNAME_CONFIG.MIN_LENGTH)
        .max(USERNAME_CONFIG.MAX_LENGTH)
        .regex(USERNAME_REGEX, "Invalid username format"),
});

function sanitizeUsername(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-_]/g, "")
        .replace(/-{2,}/g, "-");
}

export async function POST(request: NextRequest) {
    try {
        const { userId, error } = await getAuthenticatedUserId(request);
        if (error || !userId) return error!;

        const body = await request.json();
        const parseResult = SetUsernameSchema.safeParse({
            username: sanitizeUsername(body.username || ""),
        });

        if (!parseResult.success) {
            return NextResponse.json(
                { error: parseResult.error.issues[0].message },
                { status: 400 },
            );
        }

        const username = parseResult.data.username;

        // Check reserved usernames
        if ((RESERVED_USERNAMES as readonly string[]).includes(username)) {
            return NextResponse.json(
                { error: "This username is reserved" },
                { status: 409 },
            );
        }

        const usernameRef = collectionRef(COLLECTIONS.USERNAMES).doc(username);
        const userRef = collectionRef(COLLECTIONS.USERS).doc(userId);

        // Atomic transaction: reserve username + update user profile
        await runTransaction(async (transaction) => {
            const [usernameSnap, userSnap] = await Promise.all([
                transaction.get(usernameRef),
                transaction.get(userRef),
            ]);

            if (usernameSnap.exists) {
                throw new Error("USERNAME_TAKEN");
            }

            if (!userSnap.exists) {
                throw new Error("USER_NOT_FOUND");
            }

            const userData = userSnap.data() as {
                approvalStatus?: string;
                accountDisabled?: boolean;
            };

            if (userData.approvalStatus === "pending") {
                throw new Error("APPROVAL_PENDING");
            }

            if (
                userData.approvalStatus === "declined" ||
                userData.accountDisabled === true
            ) {
                throw new Error("ACCOUNT_DISABLED");
            }

            // Reserve the username
            transaction.set(usernameRef, {
                uid: userId,
                createdAt: serverTimestamp(),
            });

            // Update the user profile
            transaction.update(userRef, {
                username,
                needsUsername: false,
                updatedAt: serverTimestamp(),
            });
        });

        logger.info({ userId, username }, "Username set successfully");

        return NextResponse.json({ success: true, username }, { status: 200 });
    } catch (err) {
        // Check for known error codes thrown by the transaction
        const errorCode = (err as { message?: string }).message;

        if (errorCode === "USERNAME_TAKEN") {
            return NextResponse.json(
                { error: "This username is already taken" },
                { status: 409 },
            );
        }

        if (errorCode === "USER_NOT_FOUND") {
            return NextResponse.json(
                { error: "User profile not found" },
                { status: 404 },
            );
        }

        if (errorCode === "APPROVAL_PENDING") {
            return NextResponse.json(
                { error: "Your account is still pending approval." },
                { status: 403 },
            );
        }

        if (errorCode === "ACCOUNT_DISABLED") {
            return NextResponse.json(
                { error: "Your account is not eligible to claim a username." },
                { status: 403 },
            );
        }

        return handleApiError(err, "Failed to set username", 500);
    }
}
