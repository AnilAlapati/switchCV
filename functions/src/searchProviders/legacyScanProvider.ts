import {
  ResumeSearchProvider,
  SearchProviderOptions,
  SearchProviderResult,
} from "./types";

/**
 * cosine similarity inside the Cloud Function.
 *
 * NOTE: This is O(N) and not scalable for large datasets.
 * TODO(P2): Migrate to vector search provider for production scale.
 * Increased limit to 1000 as interim fix.
 */
export class LegacyScanSearchProvider implements ResumeSearchProvider {
  private readonly MAX_DOCS_TO_SCAN = 1000;

  constructor(private readonly db: FirebaseFirestore.Firestore) { }

  async search(
    queryEmbedding: number[],
    options: SearchProviderOptions
  ): Promise<SearchProviderResult> {
    const { limit, filters } = options;

    let resumesQuery = this.db
      .collection("resumes")
      .where("isBeingEdited", "==", false)
      .where("embedding", "!=", null)
      .orderBy("embedding")
      .orderBy("updatedAt", "desc")
      .limit(this.MAX_DOCS_TO_SCAN);

    const snapshot = await resumesQuery.get();

    const matches: SearchProviderResult["matches"] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const embedding = data.embedding;

      if (!embedding || !Array.isArray(embedding)) {
        continue;
      }

      if (filters?.location) {
        const resumeLocation =
          data.profile?.personalInfo?.location?.toLowerCase() || "";
        if (!resumeLocation.includes(filters.location.toLowerCase())) {
          continue;
        }
      }

      const score = this.cosineSimilarity(queryEmbedding, embedding);

      matches.push({ doc, score });
    }

    matches.sort((a, b) => b.score - a.score);

    return {
      matches: matches.slice(0, limit),
      metadata: {
        scannedCount: snapshot.size,
        provider: "legacy-scan",
      },
    };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
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
}
