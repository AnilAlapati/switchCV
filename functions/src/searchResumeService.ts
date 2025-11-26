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

// Constants (mirrored from frontend config)
const AI_SEARCH = {
  EMBEDDING_MODEL: "text-embedding-004",
  VECTOR_DIMENSION: 768,
  MAX_RESULTS: 10,
  MIN_SIMILARITY_SCORE: 0.5,
  PREMIUM_MONTHLY_QUOTA: 50,
  ENTERPRISE_MONTHLY_QUOTA: 999999,
  QUOTA_COLLECTION: "searchQuotas",
} as const;

const db = admin.firestore();

/**
 * Search result returned to the client
 * Note: Location is intentionally excluded for privacy (PII concern)
 */
interface SearchResult {
  resumeId: number;
  title: string;
  summary: string;
  skills: string[];
  similarityScore: number;
}

/**
 * Calculates cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have same dimension");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
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
export const searchResumesAI = functions.https.onCall(
  async (
    data: {
      query: string;
      filters?: {
        location?: string;
        minExperience?: number;
      };
      limit?: number;
    },
    context
  ) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to search"
      );
    }

    const { query, filters, limit = AI_SEARCH.MAX_RESULTS } = data;

    if (!query || query.trim().length < 3) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Query must be at least 3 characters"
      );
    }

    const userId = context.auth.uid;

    // Check user role (must be recruiter)
    const userDoc = await db.collection("users").doc(userId).get();
    const userRole = userDoc.data()?.role;

    if (userRole !== "recruiter" && userRole !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only recruiters can use AI search"
      );
    }

    // Check subscription tier and quota
    const tier = await getUserTier(userId);
    const quotaCheck = await checkAndDecrementQuota(userId, tier);

    if (!quotaCheck.allowed) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        tier === "basic"
          ? "AI Search requires Premium or Enterprise subscription"
          : "Monthly search quota exceeded. Upgrade to Enterprise for unlimited searches."
      );
    }

    functions.logger.info(`AI search by ${userId}: "${query}"`, {
      tier,
      remaining: quotaCheck.remaining,
    });

    try {
      // Generate embedding for the search query
      const queryEmbedding = await generateQueryEmbedding(query);

      // OPTIMIZATION: Instead of loading ALL resumes, use pagination and limits
      // For production with large datasets, use Firestore Vector Search extension
      // or a dedicated vector database like Pinecone
      //
      // Current optimization: Limit to 500 most recent resumes with embeddings
      // This provides a reasonable balance between coverage and performance
      const MAX_DOCS_TO_SCAN = 500;

      let resumesQuery = db
        .collection("resumes")
        .where("isBeingEdited", "==", false)
        .where("embedding", "!=", null) // Only fetch resumes with embeddings
        .orderBy("embedding") // Required for != query
        .orderBy("updatedAt", "desc") // Prioritize recently updated
        .limit(MAX_DOCS_TO_SCAN);

      const resumesSnapshot = await resumesQuery.get();

      if (resumesSnapshot.empty) {
        return { results: [], quotaRemaining: quotaCheck.remaining };
      }

      functions.logger.info(
        `AI search scanning ${resumesSnapshot.size} resumes (max: ${MAX_DOCS_TO_SCAN})`
      );

      // Calculate similarity scores
      const scoredResults: Array<{
        doc: FirebaseFirestore.DocumentSnapshot;
        score: number;
      }> = [];

      for (const doc of resumesSnapshot.docs) {
        const data = doc.data();
        const embedding = data.embedding;

        // Skip if no embedding
        if (!embedding || !Array.isArray(embedding)) {
          continue;
        }

        // Apply location filter manually if specified
        if (filters?.location) {
          const resumeLocation =
            data.profile?.personalInfo?.location?.toLowerCase() || "";
          if (!resumeLocation.includes(filters.location.toLowerCase())) {
            continue;
          }
        }

        // Calculate similarity
        const score = cosineSimilarity(queryEmbedding, embedding);

        if (score >= AI_SEARCH.MIN_SIMILARITY_SCORE) {
          scoredResults.push({ doc, score });
        }
      }

      // Sort by score descending and take top N
      scoredResults.sort((a, b) => b.score - a.score);
      const topResults = scoredResults.slice(0, limit);

      // Format results
      // Note: Location is NOT included in search results for privacy
      // Recruiters can request access to see full contact details
      const results: SearchResult[] = topResults.map(({ doc, score }) => {
        const data = doc.data()!;
        const profile = data.profile || {};

        return {
          resumeId: data.resumeId,
          title: profile.title || "Untitled",
          summary: profile.summary?.substring(0, 200) || "",
          skills:
            profile.skills?.slice(0, 5).map((s: { name: string }) => s.name) ||
            [],
          // Location intentionally omitted - PII concern
          // Recruiters must request access for full profile details
          similarityScore: Math.round(score * 100) / 100,
        };
      });

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
        quotaRemaining: quotaCheck.remaining,
        totalIndexedResumes: resumesSnapshot.size,
      };
    } catch (error) {
      functions.logger.error("AI search failed:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Search failed. Please try again."
      );
    }
  }
);

/**
 * Get remaining search quota for user
 */
export const getSearchQuota = functions.https.onCall(async (data, context) => {
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
});
