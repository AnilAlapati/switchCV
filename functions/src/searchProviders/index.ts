import * as functions from "firebase-functions/v1";
import { FirestoreVectorSearchProvider } from "./firestoreVectorProvider";
import { LegacyScanSearchProvider } from "./legacyScanProvider";
import { ResumeSearchProvider } from "./types";

let cachedPrimary: ResumeSearchProvider | null = null;
let cachedFallback: ResumeSearchProvider | null = null;
let initialized = false;

const PROVIDER = (
  process.env.AI_SEARCH_PROVIDER || "firestore-vector"
).toLowerCase();

function initProviders(db: FirebaseFirestore.Firestore) {
  if (initialized) {
    return;
  }

  try {
    if (PROVIDER === "firestore-vector") {
      cachedPrimary = new FirestoreVectorSearchProvider(db);
      cachedFallback = new LegacyScanSearchProvider(db);
      functions.logger.info(
        "Using Firestore vector search provider with legacy fallback"
      );
    } else if (PROVIDER === "legacy") {
      cachedPrimary = new LegacyScanSearchProvider(db);
      cachedFallback = null;
      functions.logger.warn("Using legacy scan search provider");
    } else {
      functions.logger.warn(
        `Unknown AI_SEARCH_PROVIDER value "${PROVIDER}". Falling back to legacy provider.`
      );
      cachedPrimary = new LegacyScanSearchProvider(db);
      cachedFallback = null;
    }
  } catch (error) {
    functions.logger.error(
      "Failed to initialize preferred search provider. Falling back to legacy.",
      error
    );
    cachedPrimary = new LegacyScanSearchProvider(db);
    cachedFallback = null;
  } finally {
    initialized = true;
  }
}

export function getSearchProvider(
  db: FirebaseFirestore.Firestore
): ResumeSearchProvider {
  if (!initialized) {
    initProviders(db);
  }
  return cachedPrimary!;
}

export function getFallbackSearchProvider(): ResumeSearchProvider | null {
  return cachedFallback;
}
