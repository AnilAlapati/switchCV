import * as admin from "firebase-admin";

// Initialize if not already initialized (should be redundant in functions index, but safe)
if (!admin.apps.length) {
    admin.initializeApp();
}

export const adminDb = admin.firestore();
export { admin };
