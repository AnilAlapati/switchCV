import { adminDb } from "@/lib/firebase-admin";
import {
  SubscriptionTier,
  UserRole,
  DEV_MODE_ENABLED,
  DEV_TIER_OVERRIDE,
  DEV_ROLE_OVERRIDE,
} from "@/lib/config";
import { logger } from "@/lib/logger";
import { userTierCache, userRoleCache } from "@/lib/utils/cache";

/**
 * Get user's subscription tier.
 * In dev mode with DEV_TIER_OVERRIDE set, returns the override value.
 * Otherwise fetches from Firestore.
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  // Dev mode override - skip Firestore lookup entirely
  if (DEV_MODE_ENABLED && DEV_TIER_OVERRIDE) {
    logger.info(
      { override: DEV_TIER_OVERRIDE },
      "[DEV MODE] Using tier override"
    );
    return DEV_TIER_OVERRIDE;
  }

  // Check cache
  const cachedTier = userTierCache.get(userId);
  if (cachedTier) {
    return cachedTier as SubscriptionTier;
  }

  const snapshot = await adminDb.collection("users").doc(userId).get();
  const tier = snapshot.data()?.subscriptionTier as
    | SubscriptionTier
    | undefined;

  // Default to "basic" if not set or invalid
  let result: SubscriptionTier = "basic";
  if (tier && ["basic", "premium", "enterprise"].includes(tier)) {
    result = tier;
  }

  // Cache result
  userTierCache.set(userId, result);
  return result;
}

/**
 * Get user's role.
 * In dev mode with DEV_ROLE_OVERRIDE set, returns the override value.
 * Otherwise fetches from Firestore.
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  // Dev mode override - skip Firestore lookup entirely
  if (DEV_MODE_ENABLED && DEV_ROLE_OVERRIDE) {
    logger.info(
      { override: DEV_ROLE_OVERRIDE },
      "[DEV MODE] Using role override"
    );
    return DEV_ROLE_OVERRIDE;
  }

  // Check cache
  const cachedRole = userRoleCache.get(userId);
  if (cachedRole) {
    return cachedRole as UserRole;
  }

  const snapshot = await adminDb.collection("users").doc(userId).get();
  const role = snapshot.data()?.role as UserRole | undefined;

  // Default to "jobseeker" if not set or invalid
  let result: UserRole = "jobseeker";
  if (role && ["jobseeker", "recruiter", "admin"].includes(role)) {
    result = role;
  }

  // Cache result
  userRoleCache.set(userId, result);
  return result;
}
