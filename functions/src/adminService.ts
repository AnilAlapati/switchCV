import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

/**
 * Sync Admin Whitelist
 * 
 * Watches the `system/admins/whitelist/{email}` collection.
 * - onCreate: Grants 'admin' role to the user with that email.
 * - onDelete: Revokes 'admin' role (downgrades to 'jobseeker').
 */
export const syncAdminWhitelistHandler = async (
    change: functions.Change<functions.firestore.DocumentSnapshot>,
    context: functions.EventContext
) => {
    const email = context.params.email;
    if (!email) return;

    // Normalizing email
    const targetEmail = email.toLowerCase().trim();
    const isDeletion = !change.after.exists;
    const isCreation = !change.before.exists;

    if (!isDeletion && !isCreation) return; // No change in existence

    const auth = admin.auth();
    const db = admin.firestore();

    try {
        // 1. Find the user by email
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(targetEmail);
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                functions.logger.warn(`Admin whitelist: User not found for email ${targetEmail}. Role will be updated when they sign up (via other triggers) or manually.`);
                return;
            }
            throw e;
        }

        const uid = userRecord.uid;

        if (isCreation) {
            // GRANT ADMIN
            functions.logger.info(`Admin whitelist: Granting admin role to ${targetEmail} (${uid})`);

            await db.collection("users").doc(uid).set({
                role: "admin",
                roleUpdatedBy: "system_whitelist",
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            const currentClaims = userRecord.customClaims || {};
            await auth.setCustomUserClaims(uid, { ...currentClaims, role: "admin" });

        } else if (isDeletion) {
            // REVOKE ADMIN
            functions.logger.info(`Admin whitelist: Revoking admin role from ${targetEmail} (${uid})`);

            await db.collection("users").doc(uid).set({
                role: "jobseeker", // Default fallback
                roleUpdatedBy: "system_whitelist",
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            const currentClaims = userRecord.customClaims || {};
            await auth.setCustomUserClaims(uid, { ...currentClaims, role: "jobseeker" });
        }

    } catch (error) {
        functions.logger.error(`Admin whitelist error for ${targetEmail}:`, error);
    }
};
