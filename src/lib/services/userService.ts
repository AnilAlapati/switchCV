import { adminDb } from "@/lib/firebase-admin";
import {
  SubscriptionTier,
  UserRole,
  DEV_MODE_ENABLED,
  DEV_TIER_OVERRIDE,
  DEV_ROLE_OVERRIDE,
} from "@/lib/config";

/**
 * Get user's subscription tier.
 * In dev mode with DEV_TIER_OVERRIDE set, returns the override value.
 * Otherwise fetches from Firestore.
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  // Dev mode override - skip Firestore lookup entirely
  if (DEV_MODE_ENABLED && DEV_TIER_OVERRIDE) {
    console.log(`[DEV MODE] Using tier override: ${DEV_TIER_OVERRIDE}`);
    return DEV_TIER_OVERRIDE;
  }

  const snapshot = await adminDb.collection("users").doc(userId).get();
  const tier = snapshot.data()?.subscriptionTier as
    | SubscriptionTier
    | undefined;

  // Default to "basic" if not set or invalid
  if (tier && ["basic", "premium", "enterprise"].includes(tier)) {
    return tier;
  }
  return "basic";
}

/**
 * Get user's role.
 * In dev mode with DEV_ROLE_OVERRIDE set, returns the override value.
 * Otherwise fetches from Firestore.
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  // Dev mode override - skip Firestore lookup entirely
  if (DEV_MODE_ENABLED && DEV_ROLE_OVERRIDE) {
    console.log(`[DEV MODE] Using role override: ${DEV_ROLE_OVERRIDE}`);
    return DEV_ROLE_OVERRIDE;
  }

  const snapshot = await adminDb.collection("users").doc(userId).get();
  const role = snapshot.data()?.role as UserRole | undefined;

  // Default to "jobseeker" if not set or invalid
  if (role && ["jobseeker", "recruiter", "admin"].includes(role)) {
    return role;
  }
  return "jobseeker";
}
