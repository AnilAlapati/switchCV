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
import { User } from "@/types";
import { z } from "zod";

const userProfileSchema = z.object({
  uid: z.string().min(1, "UID is required"),
  email: z.string().email("Invalid email address"),
  displayName: z.string().optional(),
  companyName: z.string().optional(),
});

const updateProfileSchema = z.object({
  uid: z.string().min(1, "UID is required"),
  displayName: z.string().optional(),
  companyName: z.string().optional(),
});

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
  userTierCache.set(userId, result, 5 * 60 * 1000); // 5 minutes TTL
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
  userRoleCache.set(userId, result, 5 * 60 * 1000); // 5 minutes TTL
  return result;
}

/**
 * Fetch full user profile data.
 */
export async function getUserProfile(userId: string) {
  const doc = await adminDb.collection("users").doc(userId).get();
  if (!doc.exists) return null;
  return doc.data();
}

/**
 * Creates a new user profile.
 * Enforces server-controlled fields like role and tier.
 */
export async function createUserProfile(data: any): Promise<Partial<User>> {
  // Validate input
  const validation = userProfileSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.error.message}`);
  }

  const { uid, email, displayName, companyName } = validation.data;
  const now = new Date().toISOString();

  // Default data structure
  const userProfileData = {
    uid,
    email,
    displayName: displayName || "",
    // Standardize on "role" string to match getUserRole logic
    role: "jobseeker",
    isRecruiter: false, // Keep for backward compatibility if needed
    companyName: companyName || "",
    subscriptionTier: "basic",
    createdAt: now,
    updatedAt: now,
    profileSlug: uid, // Default slug
    settings: {
      publicProfile: false,
      defaultPIIVisibility: "masked"
    }
  };

  await adminDb
    .collection("users")
    .doc(uid)
    .set(userProfileData, { merge: true });

  return userProfileData as unknown as Partial<User>;
}

/**
 * Updates a user profile.
 * Restricts updates to allowed fields (displayName, companyName).
 */
export async function updateUserProfile(uid: string, data: any) {
  const validation = updateProfileSchema.safeParse({ ...data, uid });
  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.error.message}`);
  }

  const { displayName, companyName } = validation.data;

  const updateData: any = {
    updatedAt: new Date().toISOString(),
  };

  if (displayName !== undefined) updateData.displayName = displayName;
  if (companyName !== undefined) updateData.companyName = companyName;

  await adminDb.collection("users").doc(uid).set(updateData, { merge: true });

  return updateData;
}
