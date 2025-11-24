import { adminDb } from "@/lib/firebase-admin";
import { SubscriptionTier } from "@/lib/config";

export async function getUserTier(userId: string): Promise<SubscriptionTier> {
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
