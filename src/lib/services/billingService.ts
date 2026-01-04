
import admin, { adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";

export interface AIUsageRecord {
    userId: string;
    model: string;
    tokens: {
        input: number;
        output: number;
        total: number;
    };
    cost: number;
    timestamp: Date;
    metadata?: Record<string, any>;
}

// Pricing per 1k tokens (Estimated/Standard rates)
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
    // Gemini
    "gemini-1.5-flash": { input: 0.00035, output: 0.00105 }, // Free-ish tier but let's track value
    "gemini-1.5-pro": { input: 0.0035, output: 0.0105 },

    // OpenAI
    "gpt-4o": { input: 0.005, output: 0.015 },
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },

    // Anthropic (Proxied via other providers or direct)
    "claude-3-5-sonnet": { input: 0.003, output: 0.015 },

    // Llama/Mistral (Groq/HF - usually cheap or free in some tiers, assigning low cost)
    "llama-3.1-70b": { input: 0.0007, output: 0.0009 },
    "mixtral-8x7b": { input: 0.00027, output: 0.00027 },

    // Default fallback
    "default": { input: 0.001, output: 0.002 },
};

export const BUDGET_CAPS = {
    basic: 0.10, // Minimal hard cap for free tier (prevents abuse)
    premium: 30.00,
    enterprise: 70.00,
} as const;

export class BillingService {
    private static COLLECTION = "billing";

    /**
     * Calculate exact cost for a request
     */
    static calculateCost(model: string, inputTokens: number, outputTokens: number): number {
        const pricing = MODEL_PRICING[model] || MODEL_PRICING["default"];
        return (
            (inputTokens / 1000) * pricing.input +
            (outputTokens / 1000) * pricing.output
        );
    }

    /**
     * Check if user has exceeded their budget for the current month.
     * Returns true if allowed, false if blocked.
     */
    static async checkBudget(userId: string, tier: keyof typeof BUDGET_CAPS = "basic"): Promise<boolean> {
        const date = new Date();
        const billingKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

        try {
            const docRef = adminDb.collection(this.COLLECTION).doc(userId).collection("monthly").doc(billingKey);
            const snapshot = await docRef.get();

            const currentCost = snapshot.exists ? (snapshot.data()?.totalCost || 0) : 0;
            const budgetLimit = BUDGET_CAPS[tier] || BUDGET_CAPS.basic;

            if (currentCost >= budgetLimit) {
                logger.warn({ userId, currentCost, budgetLimit }, "⛔ Budget cap exceeded");
                return false;
            }

            return true;
        } catch (error) {
            logger.error({ err: error, userId }, "Failed to check budget");
            // Fail open or closed? Security blocker says "bankruptcy-level costs", so fail CLOSED.
            return false;
        }
    }

    /**
     * Track usage and cost in Firestore.
     * Increments the daily and monthly counters.
     */
    static async trackUsage(
        userId: string,
        model: string,
        usage: { input: number; output: number },
        metadata: Record<string, any> = {}
    ): Promise<void> {
        const cost = this.calculateCost(model, usage.input, usage.output);
        const date = new Date();
        const billingKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const dayKey = `${billingKey}-${date.getDate().toString().padStart(2, '0')}`;

        try {
            const batch = adminDb.batch();

            // 1. User Monthly Record
            const monthlyRef = adminDb.collection(this.COLLECTION).doc(userId).collection("monthly").doc(billingKey);
            batch.set(monthlyRef, {
                totalCost: admin.firestore.FieldValue.increment(cost),
                totalTokens: admin.firestore.FieldValue.increment(usage.input + usage.output),
                requestCount: admin.firestore.FieldValue.increment(1),
                lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });

            // 2. Daily granular log (optional, good for charts)
            const dailyRef = monthlyRef.collection("daily").doc(dayKey);
            batch.set(dailyRef, {
                cost: admin.firestore.FieldValue.increment(cost),
                tokens: admin.firestore.FieldValue.increment(usage.input + usage.output),
                requests: admin.firestore.FieldValue.increment(1),
            }, { merge: true });

            // 3. System-wide ledger (for aggregateBilling cloud function to simplify)
            // "system/billing/shards/shard_X"
            const shardId = Math.floor(Math.random() * 10);
            const shardRef = adminDb.collection("system/billing/shards").doc(`shard_${shardId}`);
            batch.set(shardRef, {
                monthCost: admin.firestore.FieldValue.increment(cost),
                totalRequests: admin.firestore.FieldValue.increment(1),
            }, { merge: true });

            await batch.commit();

            logger.info({ userId, cost, model }, "💰 Usage tracked");
        } catch (error) {
            // Don't fail the request if tracking fails, but log valid error
            logger.error({ err: error, userId }, "Failed to track usage cost");
        }
    }
}
