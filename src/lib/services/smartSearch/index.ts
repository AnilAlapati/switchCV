/**
 * Smart Search Service
 *
 * This service has been modularized into focused components:
 * - types.ts: Search related interfaces and types
 * - scoring.ts: Matching and ranking algorithms
 * - metadata.ts: Search metadata preparation and indexing
 * - searchEngine.ts: Core hybrid search implementation
 * - jdSearch.ts: Job description parsing and matching
 *
 * @module lib/services/smartSearch
 */

export * from "./types";
export * from "./scoring";
export * from "./metadata";
export * from "./searchEngine";
export * from "./jdSearch";

// Re-export from searchCache for convenience (original behavior)
export { invalidateCacheForResume } from "../searchCache";
