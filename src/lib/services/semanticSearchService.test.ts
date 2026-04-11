import { performSemanticSearch } from "./semanticSearchService";
import { generateEmbedding } from "@/lib/services/aiGenerationService";

const mockCollection = jest.fn();
const mockWhere = jest.fn();
const mockFindNearest = jest.fn();
const mockGet = jest.fn();

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: (...args: unknown[]) => mockCollection(...args),
  },
}));

jest.mock("@/lib/services/aiGenerationService", () => ({
  generateEmbedding: jest.fn(),
}));

describe("semanticSearchService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockCollection.mockReturnValue({
      where: mockWhere,
    });
    mockWhere.mockReturnValue({
      findNearest: mockFindNearest,
    });
    mockFindNearest.mockReturnValue({
      get: mockGet,
    });

    (generateEmbedding as jest.Mock).mockResolvedValue([0.1, 0.2, 0.3]);
  });

  it("returns only public results with sanitized nested profile data", async () => {
    mockGet.mockResolvedValue({
      docs: [
        {
          id: "public-1",
          data: () => ({
            isPublic: true,
            publishedAt: "2026-04-01T00:00:00.000Z",
            updatedAt: "2026-04-02T00:00:00.000Z",
            profile: {
              title: "Senior Security Engineer",
              contact: {
                email: { value: "jane@example.com", visibility: "public" },
                phone: { value: "5551234567", visibility: "public" },
              },
              personalInfo: {
                name: "Jane Doe",
                email: "jane@example.com",
                phone: "5551234567",
              },
              skills: [{ name: "Threat Modeling" }],
              experience: [{ company: "Acme" }],
            },
          }),
          metadata: { distance: 0.91 },
        },
        {
          id: "private-1",
          data: () => ({
            isPublic: false,
            profile: {
              title: "Private Resume",
              contact: {
                email: { value: "private@example.com", visibility: "public" },
              },
              personalInfo: {
                email: "private@example.com",
              },
            },
          }),
          metadata: { distance: 0.5 },
        },
        {
          id: "editing-1",
          data: () => ({
            isPublic: true,
            isBeingEdited: true,
            profile: {
              title: "Editing Resume",
              contact: {
                email: { value: "editing@example.com", visibility: "public" },
              },
            },
          }),
          metadata: { distance: 0.4 },
        },
      ],
    });

    const results = await performSemanticSearch("security engineer", 5);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: "public-1",
      title: "Senior Security Engineer",
      publishedAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-02T00:00:00.000Z",
      score: 0.91,
    });
    expect(results[0].profile.contact.email.value).toBe("j***@example.com");
    expect(results[0].profile.personalInfo.email).toBe("j***@example.com");
    expect(results[0].profile.skills).toEqual([]);
    expect(results[0].profile.experience).toEqual([]);
    expect(results[0]).not.toHaveProperty("embedding");
  });
});
