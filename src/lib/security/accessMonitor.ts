import { logger } from "@/lib/logger";

interface AccessEntry {
    lastId: number;
    count: number;
    blockedUntil?: number;
}

// In-memory store for access monitoring (IP -> AccessEntry)
// Note: In production, use Redis or Firestore for distributed tracking
const accessStore = new Map<string, AccessEntry>();

const BLOCK_DURATION_MS = 60 * 60 * 1000; // 1 hour block
const MAX_SEQUENTIAL_ATTEMPTS = 5;

/**
 * Checks if a user is accessing IDs sequentially (scraping behavior).
 * Returns true if allowed, false if blocked.
 */
export const checkSequentialAccess = async (
    identifier: string,
    resumeId: string
): Promise<boolean> => {
    const numericId = parseInt(resumeId, 10);

    if (isNaN(numericId)) {
        return true; // Ignore non-numeric IDs check for legacy support
    }

    const now = Date.now();
    const entry = accessStore.get(identifier);

    if (entry?.blockedUntil && entry.blockedUntil > now) {
        logger.warn(
            { identifier, blockedUntil: new Date(entry.blockedUntil).toISOString() },
            "[Security] Request blocked due to prior scraping detection"
        );
        return false;
    }

    if (!entry) {
        accessStore.set(identifier, { lastId: numericId, count: 0 });
        return true;
    }

    // Check if this access is sequential (lastId + 1)
    // We allow +1, +2, etc. small gaps to catch simple scrappers
    const diff = numericId - entry.lastId;
    const isSequential = diff > 0 && diff <= 5;

    if (isSequential) {
        entry.count++;
        entry.lastId = numericId;

        if (entry.count + 1 >= MAX_SEQUENTIAL_ATTEMPTS) {
            entry.blockedUntil = now + BLOCK_DURATION_MS;
            logger.warn(
                { identifier, count: entry.count, resumeId },
                "[Security] Sequential access detected! Blocking user."
            );
            return false;
        }
    } else {
        // Reset if random access pattern detected
        if (Math.abs(diff) > 10) {
            entry.count = 0;
        }
        entry.lastId = numericId;
    }

    return true;
};
