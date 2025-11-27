import {
  ResumeSearchProvider,
  SearchProviderOptions,
  SearchProviderResult,
} from "./types";

/**
 * Firestore vector search implementation backed by the native `findNearest`
 * capability. Requires firebase-admin >= 12.7.0.
 */
export class FirestoreVectorSearchProvider implements ResumeSearchProvider {
  constructor(private readonly db: FirebaseFirestore.Firestore) {}

  async search(
    queryEmbedding: number[],
    options: SearchProviderOptions
  ): Promise<SearchProviderResult> {
    const { limit, filters } = options;

    const resumesCollection: any = this.db.collection("resumes");

    if (typeof resumesCollection.findNearest !== "function") {
      throw new Error(
        "Firestore vector search is not available. Upgrade firebase-admin to use this provider."
      );
    }

    const vectorQuery = resumesCollection.findNearest({
      vectorField: "embedding",
      queryVector: queryEmbedding,
      limit: Math.min(limit * 5, 200),
      distanceMeasure: "COSINE",
      filter: {
        compositeFilter: {
          op: "AND",
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: "isBeingEdited" },
                op: "EQUAL",
                value: { booleanValue: false },
              },
            },
          ],
        },
      },
    });

    const snapshot: FirebaseFirestore.QuerySnapshot = await vectorQuery.get();

    const matches: SearchProviderResult["matches"] = [];

    snapshot.docs.forEach((doc: any) => {
      const data = doc.data();

      if (filters?.location) {
        const resumeLocation =
          data.profile?.personalInfo?.location?.toLowerCase() || "";
        if (!resumeLocation.includes(filters.location.toLowerCase())) {
          return;
        }
      }

      const score =
        typeof doc.vectorDistance === "number"
          ? this.toSimilarity(doc.vectorDistance)
          : 0;

      matches.push({ doc, score });
    });

    matches.sort((a, b) => b.score - a.score);

    return {
      matches: matches.slice(0, limit),
      metadata: {
        scannedCount: snapshot.size,
        provider: "firestore-vector",
      },
    };
  }

  private toSimilarity(distance: number): number {
    // Firestore returns cosine distance (0 = identical). Convert to similarity (1 = identical).
    return 1 - distance;
  }
}
