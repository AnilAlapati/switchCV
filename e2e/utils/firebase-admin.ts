/* eslint-disable no-console */
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

// Initialize Firebase Admin if not already initialized
export function initFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const keyPath = path.join(process.cwd(), "key.json");

  if (!fs.existsSync(keyPath)) {
    console.warn("key.json not found. Admin operations will fail.");
    return null;
  }

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: "switchcv-dev", // Assuming this from logs, or get from serviceAccount
    });
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    return null;
  }
}

export async function verifyUserEmail(email: string) {
  const app = initFirebaseAdmin();
  if (!app) return false;

  try {
    const user = await app.auth().getUserByEmail(email);
    await app.auth().updateUser(user.uid, {
      emailVerified: true,
    });
    return true;
  } catch (error) {
    console.error(`Failed to verify email for ${email}:`, error);
    return false;
  }
}

export async function deleteUserByEmail(email: string) {
  const app = initFirebaseAdmin();
  if (!app) return false;

  try {
    const user = await app.auth().getUserByEmail(email);
    await app.auth().deleteUser(user.uid);
    // Also try to delete from Firestore if needed, but auth deletion is main part
    return true;
  } catch {
    // Ignore if user not found
    return false;
  }
}
