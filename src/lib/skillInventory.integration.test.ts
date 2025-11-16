/**
 * Skill Inventory Integration & Statistics Tests
 */

import {
  createSkill,
  initializeSkillInventory,
  addSkillToInventory,
  getSkillStatistics,
} from "@/lib/skillInventory";

import { ProficiencyLevel, SkillCategory } from "@/lib/skillMatrix.types";

describe("Skill Inventory - Integration Tests", () => {
  const userId = "test-user-123";

  it("should track statistics across skill updates", () => {
    let inventory = initializeSkillInventory(userId);

    const skills = [
      createSkill(
        "Python",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.EXPERT,
        5
      ),
      createSkill(
        "Java",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.ADVANCED,
        3
      ),
      createSkill(
        "Communication",
        SkillCategory.SOFT_SKILLS,
        ProficiencyLevel.INTERMEDIATE,
        2
      ),
    ];

    for (const skill of skills) {
      inventory = addSkillToInventory(inventory, skill);
    }

    const stats = getSkillStatistics(inventory);

    expect(stats.totalSkills).toBe(3);
    expect(stats.averageYearsOfExperience).toBe((5 + 3 + 2) / 3);
  });

  it("should provide correct category breakdown", () => {
    let inventory = initializeSkillInventory(userId);

    const techSkill = createSkill(
      "JavaScript",
      SkillCategory.TECHNICAL,
      ProficiencyLevel.ADVANCED
    );
    const softSkill = createSkill(
      "Leadership",
      SkillCategory.SOFT_SKILLS,
      ProficiencyLevel.INTERMEDIATE
    );
    const domainSkill = createSkill(
      "Healthcare",
      SkillCategory.DOMAIN,
      ProficiencyLevel.BEGINNER
    );

    inventory = addSkillToInventory(inventory, techSkill);
    inventory = addSkillToInventory(inventory, softSkill);
    inventory = addSkillToInventory(inventory, domainSkill);

    const stats = getSkillStatistics(inventory);

    expect(stats.skillsByCategory[SkillCategory.TECHNICAL]).toBe(1);
    expect(stats.skillsByCategory[SkillCategory.SOFT_SKILLS]).toBe(1);
    expect(stats.skillsByCategory[SkillCategory.DOMAIN]).toBe(1);
  });

  it("should provide correct proficiency breakdown", () => {
    let inventory = initializeSkillInventory(userId);

    const expertSkill = createSkill(
      "Expert Skill",
      SkillCategory.TECHNICAL,
      ProficiencyLevel.EXPERT
    );
    const advancedSkill = createSkill(
      "Advanced Skill",
      SkillCategory.TECHNICAL,
      ProficiencyLevel.ADVANCED
    );
    const beginnerSkill = createSkill(
      "Beginner Skill",
      SkillCategory.TECHNICAL,
      ProficiencyLevel.BEGINNER
    );

    inventory = addSkillToInventory(inventory, expertSkill);
    inventory = addSkillToInventory(inventory, advancedSkill);
    inventory = addSkillToInventory(inventory, beginnerSkill);

    const stats = getSkillStatistics(inventory);

    expect(stats.skillsByProficiency[ProficiencyLevel.EXPERT]).toBe(1);
    expect(stats.skillsByProficiency[ProficiencyLevel.ADVANCED]).toBe(1);
    expect(stats.skillsByProficiency[ProficiencyLevel.BEGINNER]).toBe(1);
  });

  it("should handle empty inventory statistics", () => {
    const inventory = initializeSkillInventory(userId);

    const stats = getSkillStatistics(inventory);

    expect(stats.totalSkills).toBe(0);
    expect(stats.averageYearsOfExperience).toBe(0);
    expect(stats.totalEndorsements).toBe(0);
  });
});
