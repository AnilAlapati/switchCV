import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Retrieves user details from Firebase Auth.
 */
export async function getAuthUser(userId: string) {
    try {
        const userRecord = await adminAuth.getUser(userId);
        return {
            uid: userRecord.uid,
            email: userRecord.email || null,
            displayName: userRecord.displayName || null,
        };
    } catch (error) {
        logger.error({ err: error, userId }, "Error fetching auth user");
        return null;
    }
}

/**
 * Verifies and consumes a verification token.
 */
export async function verifyEmailToken(token: string): Promise<{ success: boolean; error?: string }> {
    try {
        // 1. Lookup token
        const snapshot = await adminDb
            .collection("verificationTokens")
            .where("token", "==", token)
            .where("used", "==", false)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return { success: false, error: "invalid-token" };
        }

        const doc = snapshot.docs[0];
        const data = doc.data();

        // 2. Check expiration
        const now = Date.now();
        const expiresAt = data.expiresAt?.toMillis
            ? data.expiresAt.toMillis()
            : new Date(data.expiresAt).getTime();

        if (now > expiresAt) {
            return { success: false, error: "expired-token" };
        }

        // 3. Mark user as verified
        await adminAuth.updateUser(data.userId, {
            emailVerified: true,
        });

        // 4. Mark token as used
        await doc.ref.update({
            used: true,
            usedAt: FieldValue.serverTimestamp(),
        });

        return { success: true };
    } catch (error) {
        logger.error({ err: error, token }, "Error detecting verification token");
        return { success: false, error: "verification-failed" };
    }
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string) {
    try {
        const link = await adminAuth.generatePasswordResetLink(email);
        // In a real app, send this link via email provider (SendGrid, etc.)
        // For now, we might just log it or return it if dev mode, but typically we delegate to an email service.
        // Assuming the route handles sending. We just extract the adminAuth part.
        return link;
    } catch (error) {
        logger.error({ err: error, email }, "Error generating reset link");
        throw error;
    }
}
