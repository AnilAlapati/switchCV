import {
    defaultSystemConfig,
    mergeWithDefaultConfig,
    type SystemConfig,
} from "./system-config";
import { adminDb } from "./firebase";

/**
 * Fetches the current system configuration from Firebase Firestore
 *
 * @returns Promise<SystemConfig> - The merged system configuration
 */
export async function getSystemConfig(): Promise<SystemConfig> {
    try {
        const docRef = adminDb.collection("config").doc("system");
        const snapshot = await docRef.get();

        if (snapshot.exists) {
            const data = snapshot.data() as Partial<SystemConfig>;
            return mergeWithDefaultConfig(data);
        }

        return defaultSystemConfig;
    } catch {
        // Silently fall back to default config on error
        return defaultSystemConfig;
    }
}
