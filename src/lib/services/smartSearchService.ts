/**
 * Smart Search Service
 * Orchestrates hybrid search using skill indexes, vector search, and caching
 *
 * This file now re-exports from the modular smartSearch package for better maintainability.
 * @module lib/services/smartSearchService
 */

export * from "./smartSearch";
export { invalidateCacheForResume } from "./searchCache";
