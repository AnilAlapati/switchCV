/**
 * AI-Powered Resume Search Service
 *
 * Provides semantic search for premium/enterprise recruiters.
 * Uses Gemini embeddings and vector similarity to find best matches.
 *
 * @module functions/searchResumeService
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  getFallbackSearchProvider,
  getSearchProvider,
} from "./searchProviders";
import type { SearchFilters } from "./searchProviders/types";
import { config } from "./config";
import {
  containsPromptInjection,
  sanitizeForPrompt,
  QUERY_LIMITS,
} from "./utils/promptSafety";

// Constants (loaded from config)
const searchConfig = config.get("search");

const AI_SEARCH = {
  EMBEDDING_MODEL: searchConfig.embeddingModel,
  VECTOR_DIMENSION: searchConfig.vectorDimension,
  MAX_RESULTS: searchConfig.maxResults,
  MIN_SIMILARITY_SCORE: searchConfig.minSimilarityScore,
  PREMIUM_MONTHLY_QUOTA: searchConfig.premiumMonthlyQuota,
  ENTERPRISE_MONTHLY_QUOTA: searchConfig.enterpriseMonthlyQuota,
  QUOTA_COLLECTION: searchConfig.quotaCollection,
} as const;

/**
 * Dev mode bypass for local emulator testing.
 * Only active when BOTH conditions are true:
 * 1. Running in Firebase emulator (FUNCTIONS_EMULATOR=true)
 * 2. DEV_BYPASS_CHECKS is explicitly set to "true"
 */
const isDevBypassEnabled = (): boolean => {
  return (
    process.env.FUNCTIONS_EMULATOR === "true" &&
    process.env.DEV_BYPASS_CHECKS === "true"
  );
};

const db = admin.firestore();
const primarySearchProvider = getSearchProvider(db);
const fallbackSearchProvider = getFallbackSearchProvider();

/**
 * Search result returned to the client
 * Note: Location is intentionally excluded for privacy (PII concern)
 */
interface FormattedSearchResult {
  resumeId: number;
  title: string;
  summary: string;
  skills: string[];
  similarityScore: number;
}

/**
 * Generates embedding for search query with timeout protection
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: AI_SEARCH.EMBEDDING_MODEL });

  // Add timeout protection to prevent hanging requests
  const timeoutMs = 30000; // 30 seconds
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error("Gemini API timeout after 30 seconds")),
      timeoutMs
    );
  });

  const embeddingPromise = model.embedContent(query);

  const result = await Promise.race([embeddingPromise, timeoutPromise]);
  return result.embedding.values;
}

/**
 * Gets user subscription tier
 */
async function getUserTier(
  userId: string
): Promise<"basic" | "premium" | "enterprise"> {
  const userDoc = await db.collection("users").doc(userId).get();
  const tier = userDoc.data()?.subscriptionTier;

  if (tier && ["basic", "premium", "enterprise"].includes(tier)) {
    return tier as "basic" | "premium" | "enterprise";
  }

  return "basic";
}

/**
 * Checks and decrements search quota for user
 * Returns true if search is allowed, false if quota exceeded
 */
async function checkAndDecrementQuota(
  userId: string,
  tier: "basic" | "premium" | "enterprise"
): Promise<{ allowed: boolean; remaining: number }> {
  // Basic users cannot use AI search
  if (tier === "basic") {
    return { allowed: false, remaining: 0 };
  }

  const monthKey = new Date().toISOString().slice(0, 7); // "2025-11"
  const quotaRef = db.collection(AI_SEARCH.QUOTA_COLLECTION).doc(userId);

  const result = await db.runTransaction(async (transaction) => {
    const quotaDoc = await transaction.get(quotaRef);

    let monthlyLimit =
      tier === "enterprise"
        ? AI_SEARCH.ENTERPRISE_MONTHLY_QUOTA
        : AI_SEARCH.PREMIUM_MONTHLY_QUOTA;

    let currentUsage = 0;

    if (quotaDoc.exists) {
      const data = quotaDoc.data()!;
      // Reset if new month
      if (data.month === monthKey) {
        currentUsage = data.usage || 0;
      }
    }

    if (currentUsage >= monthlyLimit) {
      return { allowed: false, remaining: 0 };
    }

    // Increment usage
    transaction.set(
      quotaRef,
      {
        userId,
        month: monthKey,
        usage: currentUsage + 1,
        tier,
        lastUpdated: new Date().toISOString(),
      },
      { merge: true }
    );

    return { allowed: true, remaining: monthlyLimit - currentUsage - 1 };
  });

  return result;
}

/**
 * Main search function - callable by authenticated recruiters
 */
const searchResumesAIHandler = async (
  data: {
    query: string;
    filters?: SearchFilters;
    limit?: number;
  },
  context: functions.https.CallableContext
) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be authenticated to search"
    );
  }

  const { query, filters, limit = AI_SEARCH.MAX_RESULTS } = data;

  // Security: Basic query validation
  if (!query || typeof query !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Query string is required"
    );
  }

  const trimmedQuery = query.trim();

  // Security: Query length validation
  if (trimmedQuery.length < QUERY_LIMITS.MIN_LENGTH) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Query must be at least ${QUERY_LIMITS.MIN_LENGTH} characters`
    );
  }

  if (trimmedQuery.length > QUERY_LIMITS.MAX_LENGTH) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Query must be at most ${QUERY_LIMITS.MAX_LENGTH} characters`
    );
  }

  // Security: Prompt injection detection
  if (containsPromptInjection(trimmedQuery)) {
    functions.logger.warn(
      `[SECURITY] Prompt injection attempt detected from user ${context.auth.uid}`,
      { query: trimmedQuery.slice(0, 50) }
    );
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid query content"
    );
  }

  // Security: Sanitize query before embedding generation
  const sanitizedQuery = sanitizeForPrompt(trimmedQuery, QUERY_LIMITS.MAX_LENGTH);

  const userId = context.auth.uid;
  const devBypass = isDevBypassEnabled();

  // Log dev bypass status
  if (devBypass) {
    functions.logger.info(
      `[DEV BYPASS] Skipping role/tier/quota checks for user ${userId}`
    );
  }

  // Check user role (must be recruiter) - skip in dev bypass mode
  if (!devBypass) {
    const userDoc = await db.collection("users").doc(userId).get();
    const userRole = userDoc.data()?.role;

    if (userRole !== "recruiter" && userRole !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only recruiters can use AI search"
      );
    }
  }

  // Check subscription tier and quota - skip in dev bypass mode
  let tier: "basic" | "premium" | "enterprise" = "enterprise";
  let quotaRemaining = 999999;

  if (!devBypass) {
    tier = await getUserTier(userId);
    const quotaCheck = await checkAndDecrementQuota(userId, tier);

    if (!quotaCheck.allowed) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        tier === "basic"
          ? "AI Search requires Premium or Enterprise subscription"
          : "Monthly search quota exceeded. Upgrade to Enterprise for unlimited searches."
      );
    }
    quotaRemaining = quotaCheck.remaining;
  }

  functions.logger.info(`AI search by ${userId}: "${sanitizedQuery}"`, {
    tier,
    remaining: quotaRemaining,
    devBypass,
  });

  try {
    const queryEmbedding = await generateQueryEmbedding(sanitizedQuery);

    let providerResult;
    try {
      providerResult = await primarySearchProvider.search(queryEmbedding, {
        limit,
        filters,
      });
    } catch (providerError) {
      if (fallbackSearchProvider) {
        functions.logger.error(
          "Primary AI search provider failed. Falling back to legacy provider.",
          providerError
        );
        providerResult = await fallbackSearchProvider.search(queryEmbedding, {
          limit,
          filters,
        });
      } else {
        throw providerError;
      }
    }

    console.log(
      "[AI_SEARCH] Provider=",
      providerResult.metadata.provider,
      "scanned=",
      providerResult.metadata.scannedCount,
      "limit=",
      limit
    );

    const results: FormattedSearchResult[] = providerResult.matches.map(
      ({ doc, score }) => {
        const data = doc.data()!;
        const profile = data.profile || {};

        return {
          resumeId: data.resumeId,
          title: profile.title || "Untitled",
          summary: profile.summary?.substring(0, 200) || "",
          skills:
            profile.skills?.slice(0, 5).map((s: { name: string }) => s.name) ||
            [],
          similarityScore: Math.round(score * 100) / 100,
        };
      }
    );

    // Log search for analytics
    await db.collection("recruiterSearchHistory").add({
      recruiterId: userId,
      query,
      filters: filters || {},
      resultCount: results.length,
      tier,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      results,
      quotaRemaining,
      totalIndexedResumes: providerResult.metadata.scannedCount,
    };
  } catch (error) {
    functions.logger.error("AI search failed:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Search failed. Please try again."
    );
  }
};

export { searchResumesAIHandler };

/**
 * Main search function - callable by authenticated recruiters
 */
export const searchResumesAI = functions
  .runWith({
    secrets: ["GEMINI_API_KEY"],
  })
  .https.onCall(searchResumesAIHandler);

/**
 * Get remaining search quota for user
 */
const getSearchQuotaHandler = async (
  data: any,
  context: functions.https.CallableContext
) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be authenticated"
    );
  }

  const userId = context.auth.uid;
  const tier = await getUserTier(userId);

  if (tier === "basic") {
    return {
      tier,
      monthlyLimit: 0,
      used: 0,
      remaining: 0,
      canUseAISearch: false,
    };
  }

  const monthKey = new Date().toISOString().slice(0, 7);
  const quotaDoc = await db
    .collection(AI_SEARCH.QUOTA_COLLECTION)
    .doc(userId)
    .get();

  const monthlyLimit =
    tier === "enterprise"
      ? AI_SEARCH.ENTERPRISE_MONTHLY_QUOTA
      : AI_SEARCH.PREMIUM_MONTHLY_QUOTA;

  let used = 0;
  if (quotaDoc.exists && quotaDoc.data()?.month === monthKey) {
    used = quotaDoc.data()?.usage || 0;
  }

  return {
    tier,
    monthlyLimit,
    used,
    remaining: Math.max(0, monthlyLimit - used),
    canUseAISearch: true,
  };
};

export { getSearchQuotaHandler };

export const getSearchQuota = functions.https.onCall(getSearchQuotaHandler);
