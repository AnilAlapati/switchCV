import { adminDb } from "@/lib/firebase-admin";
import { generateEmbedding } from "@/lib/services/aiGenerationService";

export interface SemanticSearchResult {
  id: string;
  score: number;
  [key: string]: unknown;
}

export async function performSemanticSearch(
  query: string,
  limit: number = 5
): Promise<SemanticSearchResult[]> {
  // 1. Generate Embedding
  const queryEmbedding = await generateEmbedding(query);

  // 2. Vector Search
  const vectorQuery = adminDb
    .collection("resumes")
    .where("isPublic", "==", true)
    .findNearest("embedding", queryEmbedding, {
      limit,
      distanceMeasure: "COSINE",
    });

  const snapshot = await vectorQuery.get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const rest = { ...data };
    delete rest.embedding;
    return {
      id: doc.id,
      ...rest,
      score:
        (doc as { metadata?: { distance?: number } }).metadata?.distance ?? 0,
    } as SemanticSearchResult;
  });
}
