import {
  buildNormalizedFilters,
  matchesAllFilters,
} from "@/app/api/profiles/search/search-utils";
import {
  buildProfileSearchQuery as buildBaseConstraints,
  getProfileCursorSnapshot as getCursorSnapshot,
  searchProfilesBySlug as searchBySlug,
  type NormalizedFilters,
} from "@/lib/services/profileSearchService";
import {
  includesAllSkills,
  mapProfileResult,
  matchesQuery,
  normalizeSkills,
  extractProfileSkills,
} from "@/app/api/profiles/search/search-utils";
import { adminDb as db } from "@/lib/firebase-admin";

// Mock adminDb
const mockWhere = jest.fn().mockReturnThis();
const mockLimit = jest.fn().mockReturnThis();
const mockGet = jest.fn();
const mockDocGet = jest.fn();
const mockDoc = {
  get: mockDocGet,
};

const mockCollection = {
  where: mockWhere,
  limit: mockLimit,
  get: mockGet,
  doc: jest.fn().mockReturnValue(mockDoc),
};

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(() => mockCollection),
  },
}));

jest.mock("@/app/api/profiles/search/search-utils", () => ({
  ...jest.requireActual("@/app/api/profiles/search/search-utils"),
  includesAllSkills: jest.fn(),
  mapProfileResult: jest.fn(),
  matchesQuery: jest.fn(),
  normalizeSkills: jest.fn(),
  extractProfileSkills: jest.fn(),
}));

describe("searchQuery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set default mock return values
    (normalizeSkills as jest.Mock).mockReturnValue([]);
    mockWhere.mockReturnThis();
    mockLimit.mockReturnThis();
    mockDocGet.mockResolvedValue({ exists: false });
  });

  describe("buildNormalizedFilters", () => {
    it("should build filters with role and location", () => {
      const filters = {
        role: "Engineer",
        location: "San Francisco",
        skills: ["JavaScript", "React"],
        slug: "john-doe",
      };

      const result = buildNormalizedFilters(filters);

      expect(result.role).toBe("Engineer");
      expect(result.location).toBe("San Francisco");
      expect(result.slug).toBe("john-doe");
    });

    it("should trim whitespace from filters", () => {
      const filters = {
        role: "  Engineer  ",
        location: "  NYC  ",
      };

      const result = buildNormalizedFilters(filters);

      expect(result.role).toBe("Engineer");
      expect(result.location).toBe("NYC");
    });

    it("should return undefined for empty string filters", () => {
      const filters = {
        role: "",
        location: "",
      };

      const result = buildNormalizedFilters(filters);

      expect(result.role).toBeUndefined();
      expect(result.location).toBeUndefined();
    });

    it("should normalize skills", () => {
      const filters = { skills: ["JavaScript", "react", "TypeScript"] };

      const result = buildNormalizedFilters(filters);

      expect(result.skills).toEqual(["JavaScript", "react", "TypeScript"]);
    });

    it("should limit skills to 10 items", () => {
      const skillsList = Array.from({ length: 15 }, (_, i) =>
        `Skill${i}`.toLowerCase()
      );
      (normalizeSkills as jest.Mock).mockReturnValue(skillsList);

      const filters = { skills: skillsList };

      const result = buildNormalizedFilters(filters);

      expect(result.skills).toHaveLength(10);
    });

    it("should handle undefined filters", () => {
      const result = buildNormalizedFilters();

      expect(result.role).toBeUndefined();
      expect(result.location).toBeUndefined();
      expect(result.skills).toBeDefined();
    });
  });

  describe("buildBaseConstraints", () => {
    it("should always include visible profile constraint", () => {
      const filters: NormalizedFilters = { skills: [] };

      buildBaseConstraints(filters);

      expect(mockWhere).toHaveBeenCalledWith(
        "publicProfile.visible",
        "==",
        true
      );
    });

    it("should add role constraint when provided", () => {
      const filters: NormalizedFilters = {
        role: "Engineer",
        skills: [],
      };

      buildBaseConstraints(filters);

      expect(mockWhere).toHaveBeenCalledWith(
        "publicProfile.role",
        "==",
        "Engineer"
      );
    });

    it("should add location constraint when provided", () => {
      const filters: NormalizedFilters = {
        location: "New York",
        skills: [],
      };

      buildBaseConstraints(filters);

      expect(mockWhere).toHaveBeenCalledWith(
        "publicProfile.location",
        "==",
        "New York"
      );
    });

    it("should add array-contains for single skill", () => {
      const filters: NormalizedFilters = {
        skills: ["JavaScript"],
      };

      buildBaseConstraints(filters);

      expect(mockWhere).toHaveBeenCalledWith(
        "publicProfile.skills",
        "array-contains",
        "JavaScript"
      );
    });

    it("should add array-contains-any for multiple skills", () => {
      const filters: NormalizedFilters = {
        skills: ["JavaScript", "React", "TypeScript"],
      };

      buildBaseConstraints(filters);

      expect(mockWhere).toHaveBeenCalledWith(
        "publicProfile.skills",
        "array-contains-any",
        ["JavaScript", "React", "TypeScript"]
      );
    });

    it("should limit skills to 10 in array-contains-any", () => {
      const skills = Array.from({ length: 15 }, (_, i) => `Skill${i}`);
      const filters: NormalizedFilters = { skills };

      buildBaseConstraints(filters);

      // Should limit to 10 skills
      expect(mockWhere).toHaveBeenCalledWith(
        "publicProfile.skills",
        "array-contains-any",
        skills.slice(0, 10)
      );
    });

    it("should add slug constraint when provided", () => {
      const filters: NormalizedFilters = {
        slug: "john-doe",
        skills: [],
      };

      buildBaseConstraints(filters);

      expect(mockWhere).toHaveBeenCalledWith("profileSlug", "==", "john-doe");
    });
  });

  describe("getCursorSnapshot", () => {
    it("should return null for undefined cursorId", async () => {
      // @ts-expect-error - testing invalid input
      const result = await getCursorSnapshot();
      expect(result).toBeNull();
    });

    it("should return snapshot for valid cursorId", async () => {
      const mockSnapshot = {
        exists: true,
        data: () => ({ id: "user-123" }),
      };

      mockDocGet.mockResolvedValue(mockSnapshot);

      const result = await getCursorSnapshot("user-123");

      expect(result).not.toBeNull();
      expect(mockDocGet).toHaveBeenCalled();
    });

    it("should return null when cursor document does not exist", async () => {
      const mockSnapshot = {
        exists: false,
      };

      mockDocGet.mockResolvedValue(mockSnapshot);

      const result = await getCursorSnapshot("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("matchesAllFilters", () => {
    const mockUserData = {
      displayName: "John Doe",
      publicProfile: {
        username: "johndoe",
        role: "Engineer",
        location: "New York",
        skills: ["JavaScript", "React"],
        aiSelectedBio: "Software engineer with 5 years of experience",
      },
      profileSlug: "john-doe",
    };

    it("should return true for user matching all filters", () => {
      const filters: NormalizedFilters = {
        role: "Engineer",
        location: "New York",
        skills: ["JavaScript"],
        slug: "john-doe",
      };

      (matchesQuery as jest.Mock).mockReturnValue(true);
      (includesAllSkills as jest.Mock).mockReturnValue(true);
      (extractProfileSkills as jest.Mock).mockReturnValue([
        "JavaScript",
        "React",
      ]);

      const result = matchesAllFilters(mockUserData, filters, "John");

      expect(result).toBe(true);
    });

    it("should return false when role does not match", () => {
      const filters: NormalizedFilters = {
        role: "Designer",
        skills: [],
      };

      (extractProfileSkills as jest.Mock).mockReturnValue([]);
      (includesAllSkills as jest.Mock).mockReturnValue(true);

      const result = matchesAllFilters(mockUserData, filters);

      expect(result).toBe(false);
    });

    it("should return false when skills do not match", () => {
      const filters: NormalizedFilters = {
        skills: ["Python"],
      };

      (extractProfileSkills as jest.Mock).mockReturnValue([
        "JavaScript",
        "React",
      ]);
      (includesAllSkills as jest.Mock).mockReturnValue(false);

      const result = matchesAllFilters(mockUserData, filters);

      expect(result).toBe(false);
    });

    it("should match search query in displayName", () => {
      (extractProfileSkills as jest.Mock).mockReturnValue([]);
      (includesAllSkills as jest.Mock).mockReturnValue(true);

      const result = matchesAllFilters(mockUserData, { skills: [] }, "John");

      expect(result).toBe(true);
    });

    it("should work without searchQuery", () => {
      (extractProfileSkills as jest.Mock).mockReturnValue([]);
      (includesAllSkills as jest.Mock).mockReturnValue(true);

      const result = matchesAllFilters(mockUserData, { skills: [] });

      expect(typeof result).toBe("boolean");
    });
  });

  describe("searchBySlug", () => {
    it("should return empty array when slug is not found", async () => {
      mockGet.mockResolvedValue({ empty: true, docs: [] });

      const result = await searchBySlug("nonexistent");

      expect(result).toEqual([]);
    });

    it("should return profile when slug matches", async () => {
      const mockProfile = { id: "user-123", displayName: "John Doe" };
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: "user-123",
            data: () => mockProfile,
          },
        ],
      };

      mockGet.mockResolvedValue(mockSnapshot);
      (mapProfileResult as jest.Mock).mockReturnValue({
        id: "user-123",
        name: "John Doe",
      });

      const result = await searchBySlug("john-doe");

      expect(result).toHaveLength(1);
      expect(mapProfileResult).toHaveBeenCalledWith("user-123", mockProfile);
      expect(mockWhere).toHaveBeenCalledWith("profileSlug", "==", "john-doe");
    });
  });
});
