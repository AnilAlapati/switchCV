import { applyAdvancedFilters, SearchFilters } from "@/lib/searchFilters";
import { ProfileSearchResult } from "@/types/profileSearch";

describe("searchFilters", () => {
  const mockProfiles: ProfileSearchResult[] = [
    {
      userId: "u1",
      username: "user1",
      displayName: "User One",
      bio: "Bio 1",
      hasApproval: false,
      role: "Software Engineer",
      location: "New York",
      skills: ["React", "TypeScript"],
      requestedAt: new Date("2023-01-01T00:00:00Z"),
    },
    {
      userId: "u2",
      username: "user2",
      displayName: "User Two",
      bio: "Bio 2",
      hasApproval: false,
      role: "Product Manager",
      location: "San Francisco",
      skills: ["Agile", "JIRA"],
      requestedAt: new Date("2023-02-01T00:00:00Z"),
    },
    {
      userId: "u3",
      username: "user3",
      displayName: "User Three",
      bio: "Bio 3",
      hasApproval: false,
      role: "Frontend Developer",
      location: "Remote",
      skills: ["React", "CSS"],
      requestedAt: new Date("2023-03-01T00:00:00Z"),
    },
  ];

  it("should filter by role", () => {
    const filters: SearchFilters = { roles: ["Engineer"] };
    const result = applyAdvancedFilters(mockProfiles, filters);
    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe("u1");
  });

  it("should filter by location", () => {
    const filters: SearchFilters = { locations: ["San Francisco"] };
    const result = applyAdvancedFilters(mockProfiles, filters);
    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe("u2");
  });

  it("should filter by skills (all required)", () => {
    const filters: SearchFilters = { skills: ["React"] };
    const result = applyAdvancedFilters(mockProfiles, filters);
    expect(result).toHaveLength(2); // u1 and u3
  });

  it("should filter by date range", () => {
    const filters: SearchFilters = {
      dateRange: {
        from: new Date("2023-01-15"),
        to: new Date("2023-02-15"),
      },
    };
    const result = applyAdvancedFilters(mockProfiles, filters);
    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe("u2");
  });

  it("should return all if no filters", () => {
    const result = applyAdvancedFilters(mockProfiles, {});
    expect(result).toHaveLength(3);
  });

  it("should handle missing profile fields gracefully", () => {
    const incompleteProfile = {
      userId: "u4",
      username: "user4",
      displayName: "User Four",
      bio: "Bio 4",
      hasApproval: false,
    } as ProfileSearchResult;
    const result = applyAdvancedFilters([incompleteProfile], {
      roles: ["Engineer"],
    });
    expect(result).toHaveLength(0);
  });

  it("should handle case insensitive matching", () => {
    const filters: SearchFilters = { roles: ["engineer"] };
    const result = applyAdvancedFilters(mockProfiles, filters);
    expect(result).toHaveLength(1);
  });
});
