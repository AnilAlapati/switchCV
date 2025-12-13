import { renderHook, act } from "@testing-library/react";
import { useSkillInventory } from "../../hooks/useSkillInventory";
import * as skillInventoryLib from "@/lib/skillInventory";
import { ProficiencyLevel, SkillCategory } from "@/lib/skillMatrix.types";

// Mock dependencies
jest.mock("@/lib/skillInventory");

describe("useSkillInventory", () => {
  const mockUserId = "user123";
  const mockInventory = {
    userId: mockUserId,
    skills: [],
    categories: {},
    lastUpdated: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (skillInventoryLib.initializeSkillInventory as jest.Mock).mockReturnValue(
      mockInventory
    );
  });

  it("should initialize inventory", () => {
    const { result } = renderHook(() => useSkillInventory(mockUserId));

    act(() => {
      result.current.initialize();
    });

    expect(result.current.inventory).toEqual(mockInventory);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(skillInventoryLib.initializeSkillInventory).toHaveBeenCalledWith(
      mockUserId
    );
  });

  it("should handle initialization error", () => {
    (
      skillInventoryLib.initializeSkillInventory as jest.Mock
    ).mockImplementation(() => {
      throw new Error("Init failed");
    });

    const { result } = renderHook(() => useSkillInventory(mockUserId));

    act(() => {
      result.current.initialize();
    });

    expect(result.current.error).toBe("Init failed");
    expect(result.current.loading).toBe(false);
  });

  it("should add skill", () => {
    const { result } = renderHook(() => useSkillInventory(mockUserId));
    act(() => {
      result.current.initialize();
    });

    const mockSkill = { id: "skill1", name: "React" };
    const mockUpdatedInventory = { ...mockInventory, skills: [mockSkill] };

    (skillInventoryLib.createSkill as jest.Mock).mockReturnValue(mockSkill);
    (skillInventoryLib.addSkillToInventory as jest.Mock).mockReturnValue(
      mockUpdatedInventory
    );

    act(() => {
      result.current.addSkill(
        "React",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.EXPERT
      );
    });

    expect(result.current.inventory).toEqual(mockUpdatedInventory);
    expect(skillInventoryLib.createSkill).toHaveBeenCalled();
    expect(skillInventoryLib.addSkillToInventory).toHaveBeenCalled();
  });

  it("should fail to add skill if not initialized", () => {
    const { result } = renderHook(() => useSkillInventory(mockUserId));

    act(() => {
      result.current.addSkill(
        "React",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.EXPERT
      );
    });

    expect(result.current.error).toBe("Inventory not initialized");
  });

  it("should update skill", () => {
    const { result } = renderHook(() => useSkillInventory(mockUserId));
    act(() => {
      result.current.initialize();
    });

    const mockUpdatedInventory = { ...mockInventory, updated: true };
    (skillInventoryLib.updateSkillProficiency as jest.Mock).mockReturnValue(
      mockUpdatedInventory
    );

    act(() => {
      result.current.updateSkill("skill1", ProficiencyLevel.INTERMEDIATE);
    });

    expect(result.current.inventory).toEqual(mockUpdatedInventory);
    expect(skillInventoryLib.updateSkillProficiency).toHaveBeenCalled();
  });

  it("should remove skill", () => {
    const { result } = renderHook(() => useSkillInventory(mockUserId));
    act(() => {
      result.current.initialize();
    });

    const mockUpdatedInventory = { ...mockInventory, removed: true };
    (skillInventoryLib.removeSkillFromInventory as jest.Mock).mockReturnValue(
      mockUpdatedInventory
    );

    act(() => {
      result.current.removeSkill("skill1");
    });

    expect(result.current.inventory).toEqual(mockUpdatedInventory);
    expect(skillInventoryLib.removeSkillFromInventory).toHaveBeenCalled();
  });

  it("should search skills", () => {
    const { result } = renderHook(() => useSkillInventory(mockUserId));
    act(() => {
      result.current.initialize();
    });

    (skillInventoryLib.searchSkills as jest.Mock).mockReturnValue(["React"]);

    const searchResults = result.current.searchByName("Re");
    expect(searchResults).toEqual(["React"]);
  });

  it("should handle add skill error", () => {
    const { result } = renderHook(() => useSkillInventory(mockUserId));
    act(() => {
      result.current.initialize();
    });

    (skillInventoryLib.createSkill as jest.Mock).mockImplementation(() => {
      throw new Error("Create skill failed");
    });

    act(() => {
      result.current.addSkill(
        "React",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.EXPERT
      );
    });

    expect(result.current.error).toBe("Create skill failed");
  });

  it("should handle add skill error with non-Error object", () => {
    const { result } = renderHook(() => useSkillInventory(mockUserId));
    act(() => {
      result.current.initialize();
    });

    (skillInventoryLib.createSkill as jest.Mock).mockImplementation(() => {
      throw "String error";
    });

    act(() => {
      result.current.addSkill(
        "React",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.EXPERT
      );
    });

    expect(result.current.error).toBe("Failed to add skill");
  });

  it("should handle update skill error", () => {
    const { result } = renderHook(() => useSkillInventory(mockUserId));
    act(() => {
      result.current.initialize();
    });

    (skillInventoryLib.updateSkillProficiency as jest.Mock).mockImplementation(
      () => {
        throw new Error("Update skill failed");
      }
    );

    act(() => {
      result.current.updateSkill("skill1", ProficiencyLevel.INTERMEDIATE);
    });

    expect(result.current.error).toBe("Update skill failed");
  });

  it("should handle update skill error with non-Error object", () => {
    const { result } = renderHook(() => useSkillInventory(mockUserId));
    act(() => {
      result.current.initialize();
    });

    (skillInventoryLib.updateSkillProficiency as jest.Mock).mockImplementation(
      () => {
        throw { customError: true };
      }
    );

    act(() => {
      result.current.updateSkill("skill1", ProficiencyLevel.INTERMEDIATE);
    });

    expect(result.current.error).toBe("Failed to update skill");
  });

  it("should handle remove skill error", () => {
    const { result } = renderHook(() => useSkillInventory(mockUserId));
    act(() => {
      result.current.initialize();
    });

    (
      skillInventoryLib.removeSkillFromInventory as jest.Mock
    ).mockImplementation(() => {
      throw new Error("Remove skill failed");
    });

    act(() => {
      result.current.removeSkill("skill1");
    });

    expect(result.current.error).toBe("Remove skill failed");
  });

  it("should handle remove skill error with non-Error object", () => {
    const { result } = renderHook(() => useSkillInventory(mockUserId));
    act(() => {
      result.current.initialize();
    });

    (
      skillInventoryLib.removeSkillFromInventory as jest.Mock
    ).mockImplementation(() => {
      throw null;
    });

    act(() => {
      result.current.removeSkill("skill1");
    });

    expect(result.current.error).toBe("Failed to remove skill");
  });

  it("should fail to update skill if not initialized", () => {
    const { result } = renderHook(() => useSkillInventory(mockUserId));

    act(() => {
      result.current.updateSkill("skill1", ProficiencyLevel.INTERMEDIATE);
    });

    expect(result.current.error).toBe("Inventory not initialized");
  });

  it("should fail to remove skill if not initialized", () => {
    const { result } = renderHook(() => useSkillInventory(mockUserId));

    act(() => {
      result.current.removeSkill("skill1");
    });

    expect(result.current.error).toBe("Inventory not initialized");
  });

  it("should return empty array for search if not initialized", () => {
    const { result } = renderHook(() => useSkillInventory(mockUserId));

    const searchResults = result.current.searchByName("test");
    expect(searchResults).toEqual([]);
  });

  it("should return null for stats if not initialized", () => {
    const { result } = renderHook(() => useSkillInventory(mockUserId));

    const stats = result.current.getStats();
    expect(stats).toBeNull();
  });
});
