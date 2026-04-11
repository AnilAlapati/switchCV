import {
  performSemanticSearch,
  performSkillSearch,
} from "./searchEngine";
import { generateEmbedding } from "@/lib/services/aiGenerationService";

const mockCollection = jest.fn();
const mockGet = jest.fn();

type MockQuery = {
  where: jest.Mock;
  limit: jest.Mock;
  get: typeof mockGet;
};

const mockQuery = {} as MockQuery;
mockQuery.where = jest.fn(() => mockQuery);
mockQuery.limit = jest.fn(() => mockQuery);
mockQuery.get = mockGet;

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: (...args: unknown[]) => mockCollection(...args),
  },
}));

jest.mock("@/lib/services/aiGenerationService", () => ({
  generateEmbedding: jest.fn(),
}));

describe("smartSearch/searchEngine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCollection.mockReturnValue(mockQuery);
    (generateEmbedding as jest.Mock).mockResolvedValue([0.1, 0.2, 0.3]);
  });

  it("filters non-public and editing resumes out of skill search results", async () => {
    const docs = [
      {
        id: "public-resume",
        data: () => ({
          isPublic: true,
          userId: "candidate-1",
          publishedAt: "2026-04-01T00:00:00.000Z",
          searchMetadata: {
            title: "Frontend Engineer",
            skills: ["react", "typescript"],
            location: "remote",
            experienceYears: 6,
          },
          profile: {
            title: "Frontend Engineer",
            personalInfo: { name: "Jane Doe" },
          },
        }),
      },
      {
        id: "private-resume",
        data: () => ({
          isPublic: false,
          userId: "candidate-2",
          publishedAt: "2026-04-01T00:00:00.000Z",
          searchMetadata: {
            title: "Private Engineer",
            skills: ["react"],
          },
          profile: {
            personalInfo: { name: "Private Candidate" },
          },
        }),
      },
      {
        id: "editing-resume",
        data: () => ({
          isPublic: true,
          isBeingEdited: true,
          userId: "candidate-3",
          publishedAt: "2026-04-01T00:00:00.000Z",
          searchMetadata: {
            title: "Editing Engineer",
            skills: ["react"],
          },
          profile: {
            personalInfo: { name: "Editing Candidate" },
          },
        }),
      },
    ];

    mockGet.mockResolvedValue({
      size: docs.length,
      docs,
      forEach: (callback: (doc: (typeof docs)[number]) => void) =>
        docs.forEach(callback),
    });

    const result = await performSkillSearch({
      skills: ["react"],
      location: null,
      minExperience: null,
      maxExperience: null,
    });

    expect(result.scanned).toBe(3);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      resumeId: "public-resume",
      userId: "candidate-1",
      title: "Frontend Engineer",
      userName: "Jane Doe",
    });
  });

  it("filters non-public resumes out of semantic recruiter search results", async () => {
    const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0);

    const docs = [
      {
        id: "public-resume",
        data: () => ({
          isPublic: true,
          userId: "candidate-1",
          publishedAt: "2026-04-01T00:00:00.000Z",
          searchMetadata: {
            title: "Platform Engineer",
            skills: ["kubernetes"],
            experienceYears: 7,
          },
          profile: {
            title: "Platform Engineer",
            personalInfo: { name: "Jane Doe" },
          },
        }),
      },
      {
        id: "private-resume",
        data: () => ({
          isPublic: false,
          userId: "candidate-2",
          publishedAt: "2026-04-01T00:00:00.000Z",
          searchMetadata: {
            title: "Private Platform Engineer",
            skills: ["kubernetes"],
          },
          profile: {
            personalInfo: { name: "Private Candidate" },
          },
        }),
      },
    ];

    mockGet.mockResolvedValue({
      size: docs.length,
      docs,
      forEach: (callback: (doc: (typeof docs)[number]) => void) =>
        docs.forEach(callback),
    });

    const result = await performSemanticSearch("platform engineer", {
      skills: [],
      location: null,
      minExperience: null,
      maxExperience: null,
    });

    expect(generateEmbedding).toHaveBeenCalledWith("platform engineer");
    expect(result.scanned).toBe(2);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      resumeId: "public-resume",
      userId: "candidate-1",
      title: "Platform Engineer",
      userName: "Jane Doe",
      matchScore: 70,
    });

    randomSpy.mockRestore();
  });
});
