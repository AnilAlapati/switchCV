export interface SearchFilters {
  location?: string;
  minExperience?: number;
}

export interface SearchProviderOptions {
  limit: number;
  filters?: SearchFilters;
}

export interface RankedResume {
  doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>;
  score: number;
}

export interface SearchProviderResult {
  matches: RankedResume[];
  metadata: {
    scannedCount: number;
    provider: string;
  };
}

export interface ResumeSearchProvider {
  search(
    queryEmbedding: number[],
    options: SearchProviderOptions
  ): Promise<SearchProviderResult>;
}
