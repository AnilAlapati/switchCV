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
 * Get user's tier for a specific role.
 */
export async function getTierForRole(
  userId: string,
  role: UserRole
): Promise<SubscriptionTier> {
  // Dev mode override - skip Firestore lookup entirely
  if (DEV_MODE_ENABLED && DEV_TIER_OVERRIDE) {
    logger.info(
      { override: DEV_TIER_OVERRIDE, role },
      "[DEV MODE] Using tier override for role"
    );
    return DEV_TIER_OVERRIDE;
  }

  // Check cache with composite key (userId:role)
  const cacheKey = `${userId}:${role}`;
  const cachedTier = userTierCache.get(cacheKey);
  if (cachedTier) {
    return cachedTier as SubscriptionTier;
  }

  const snapshot = await adminDb.collection("users").doc(userId).get();
  const data = snapshot.data();

  let result: SubscriptionTier = "basic";
  const rawTier =
    role === "recruiter"
      ? data?.recruiterTier || data?.subscriptionTier
      : data?.jobSeekerTier || data?.subscriptionTier;

  if (rawTier && ["basic", "premium", "enterprise"].includes(rawTier)) {
    result = rawTier as SubscriptionTier;
  }

  // Cache result
  userTierCache.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes TTL
  return result;
}

/**
 * Get user's subscription tier.
 * Defaulting to jobseeker context for legacy calls.
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  return getTierForRole(userId, "jobseeker");
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
 * Verifies if the user has admin role.
 * Used by admin-only API endpoints.
 */
export async function verifyAdminRole(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === "admin";
}

/**
 * Fetch full user profile data.
 */
export async function getUserProfile(userId: string): Promise<any | null> {
  const doc = await adminDb.collection("users").doc(userId).get();
  if (!doc.exists) return null;
  return doc.data();
}

/** Input for creating a user profile - validated via Zod schema */
type CreateUserProfileInput = z.infer<typeof userProfileSchema>;

/**
 * Creates a new user profile.
 * Enforces server-controlled fields like role and tier.
 */
export async function createUserProfile(
  data: CreateUserProfileInput
): Promise<Partial<User>> {
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
    jobSeekerTier: "basic",
    recruiterTier: "basic",
    createdAt: now,
    updatedAt: now,
    profileSlug: uid, // Default slug
    settings: {
      publicProfile: false,
      defaultPIIVisibility: "masked",
    },
  };

  await adminDb
    .collection("users")
    .doc(uid)
    .set(userProfileData, { merge: true });

  return userProfileData as unknown as Partial<User>;
}

/** Input for updating a user profile - validated via Zod schema */
type UpdateUserProfileInput = Omit<z.infer<typeof updateProfileSchema>, "uid">;

/**
 * Updates a user profile.
 * Restricts updates to allowed fields (displayName, companyName).
 */
export async function updateUserProfile(
  uid: string,
  data: UpdateUserProfileInput
): Promise<Record<string, string | undefined>> {
  const validation = updateProfileSchema.safeParse({ ...data, uid });
  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.error.message}`);
  }

  const { displayName, companyName } = validation.data;

  const updateData: Record<string, string | undefined> = {
    updatedAt: new Date().toISOString(),
  };

  if (displayName !== undefined) updateData.displayName = displayName;
  if (companyName !== undefined) updateData.companyName = companyName;

  await adminDb.collection("users").doc(uid).set(updateData, { merge: true });

  return updateData;
}

/**
 * Sets the role for a user.
 */
export async function setUserRole(
  userId: string,
  role: UserRole
): Promise<Record<string, any>> {
  const isRecruiter = role === "recruiter";
  const updateData = {
    role,
    isRecruiter,
    roleSelectedAt: new Date().toISOString(),
    roleUpdatedAt: new Date().toISOString(),
    roleUpdatedBy: "user-selection",
  };

  await adminDb
    .collection("users")
    .doc(userId)
    .set(updateData, { merge: true });

  // Invalidate cache
  userRoleCache.delete(userId);

  return updateData;
}
