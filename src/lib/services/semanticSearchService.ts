import { adminDb } from "@/lib/firebase-admin";
import { generateEmbedding } from "@/lib/services/aiGenerationService";
import {
  resolveResumeIsPublic,
  sanitizeResumeForPublicView,
  type SanitizedResumeResult,
} from "@/lib/utils/resumeVisibility";

export interface SemanticSearchResult {
  id: string;
  score: number;
  title: string;
  resumeId?: number | string;
  numericId?: number;
  publishedAt?: string;
  updatedAt?: string;
  profile: SanitizedResumeResult;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toIsoString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();

  const timestampLike = value as { toDate?: () => Date } | null;
  if (typeof timestampLike?.toDate === "function") {
    return timestampLike.toDate().toISOString();
  }

  return undefined;
}

function extractProfileSource(
  data: Record<string, unknown>,
): Record<string, unknown> {
  if (isRecord(data.profile)) {
    return data.profile;
  }

  return {
    title: data.title,
    summary: data.summary,
    contact: data.contact,
    personalInfo: data.personalInfo,
    experience: data.experience,
    education: data.education,
    projects: data.projects,
    skills: data.skills,
  };
}

function extractResumeTitle(
  data: Record<string, unknown>,
  profileSource: Record<string, unknown>,
): string {
  if (typeof data.title === "string" && data.title.trim()) {
    return data.title;
  }

  if (typeof profileSource.title === "string" && profileSource.title.trim()) {
    return profileSource.title;
  }

  return "Resume";
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

  return snapshot.docs.flatMap((doc) => {
    const data = doc.data() as Record<string, unknown>;

    if (
      !resolveResumeIsPublic(
        data as Parameters<typeof resolveResumeIsPublic>[0],
      )
    ) {
      return [];
    }

    const profileSource = extractProfileSource(data);
    const sanitizedProfile = sanitizeResumeForPublicView(profileSource);

    return [
      {
        id: doc.id,
        title: extractResumeTitle(data, profileSource),
        resumeId:
          typeof data.resumeId === "number" || typeof data.resumeId === "string"
            ? data.resumeId
            : doc.id,
        numericId:
          typeof data.numericId === "number" ? data.numericId : undefined,
        publishedAt: toIsoString(data.publishedAt),
        updatedAt: toIsoString(data.updatedAt),
        profile: sanitizedProfile,
        score:
          (doc as { metadata?: { distance?: number } }).metadata?.distance ?? 0,
      } satisfies SemanticSearchResult,
    ];
  });
}
