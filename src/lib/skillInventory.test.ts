/**
 * Skill Inventory Tests
 */

import {
  createSkill,
  initializeSkillInventory,
  addSkillToInventory,
  updateSkillProficiency,
  removeSkillFromInventory,
  getSkillsByCategory,
  getSkillsByProficiency,
  searchSkills,
  getSkillStatistics,
  calculateSkillStrength,
  endorseSkill,
  getTopSkills,
  importSkills,
} from "@/lib/skillInventory";

import { ProficiencyLevel, SkillCategory } from "@/lib/skillMatrix.types";

describe("Skill Inventory Manager", () => {
  const userId = "test-user-123";

  describe("createSkill", () => {
    it("should create a skill with basic properties", () => {
      const skill = createSkill(
        "React",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.ADVANCED
      );

      expect(skill.id).toBeDefined();
      expect(skill.name).toBe("React");
      expect(skill.category).toBe(SkillCategory.TECHNICAL);
      expect(skill.proficiencyLevel).toBe(ProficiencyLevel.ADVANCED);
      expect(skill.endorsements).toBe(0);
      expect(skill.lastUsed).toBeInstanceOf(Date);
    });

    it("should include optional parameters when provided", () => {
      const skill = createSkill(
        "JavaScript",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.EXPERT,
        5,
        "Professional experience with modern JavaScript"
      );

      expect(skill.yearsOfExperience).toBe(5);
      expect(skill.description).toBe(
        "Professional experience with modern JavaScript"
      );
    });

    it("should generate unique skill IDs", () => {
      const skill1 = createSkill(
        "Python",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.INTERMEDIATE
      );
      const skill2 = createSkill(
        "Python",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.INTERMEDIATE
      );

      expect(skill1.id).not.toBe(skill2.id);
    });
  });

  describe("initializeSkillInventory", () => {
    it("should create empty inventory", () => {
      const inventory = initializeSkillInventory(userId);

      expect(inventory.id).toBeDefined();
      expect(inventory.userId).toBe(userId);
      expect(inventory.skills).toEqual([]);
      expect(inventory.createdAt).toBeInstanceOf(Date);
      expect(inventory.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("addSkillToInventory", () => {
    it("should add skill successfully", () => {
      const inventory = initializeSkillInventory(userId);
      const skill = createSkill(
        "TypeScript",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.ADVANCED
      );

      const updated = addSkillToInventory(inventory, skill);

      expect(updated.skills.length).toBe(1);
      expect(updated.skills[0]).toEqual(skill);
    });

    it("should prevent duplicate skills", () => {
      const inventory = initializeSkillInventory(userId);
      const skill1 = createSkill(
        "Java",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.INTERMEDIATE
      );

      const afterFirstAdd = addSkillToInventory(inventory, skill1);
      const skill2 = createSkill(
        "java", // different case
        SkillCategory.TECHNICAL,
        ProficiencyLevel.ADVANCED
      );

      expect(() => addSkillToInventory(afterFirstAdd, skill2)).toThrow(
        /already exists/i
      );
    });

    it("should update timestamp on addition", () => {
      const inventory = initializeSkillInventory(userId);
      const skill = createSkill(
        "Go",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.BEGINNER
      );
      const beforeAdd = new Date();

      const updated = addSkillToInventory(inventory, skill);

      const afterAdd = new Date();
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeAdd.getTime()
      );
      expect(updated.updatedAt.getTime()).toBeLessThanOrEqual(
        afterAdd.getTime()
      );
    });
  });

  describe("updateSkillProficiency", () => {
    it("should update proficiency level", () => {
      let inventory = initializeSkillInventory(userId);
      const skill = createSkill(
        "Rust",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.BEGINNER
      );

      inventory = addSkillToInventory(inventory, skill);
      const updated = updateSkillProficiency(
        inventory,
        skill.id,
        ProficiencyLevel.INTERMEDIATE,
        2
      );

      expect(updated.skills[0].proficiencyLevel).toBe(
        ProficiencyLevel.INTERMEDIATE
      );
      expect(updated.skills[0].yearsOfExperience).toBe(2);
    });

    it("should throw error for non-existent skill", () => {
      const inventory = initializeSkillInventory(userId);

      expect(() =>
        updateSkillProficiency(
          inventory,
          "non-existent-id",
          ProficiencyLevel.ADVANCED
        )
      ).toThrow(/not found/i);
    });

    it("should update lastUsed timestamp", () => {
      let inventory = initializeSkillInventory(userId);
      const skill = createSkill(
        "Kotlin",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.INTERMEDIATE
      );

      inventory = addSkillToInventory(inventory, skill);
      const beforeUpdate = new Date();
      const updated = updateSkillProficiency(
        inventory,
        skill.id,
        ProficiencyLevel.ADVANCED
      );
      const afterUpdate = new Date();

      expect(updated.skills[0].lastUsed!.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime()
      );
      expect(updated.skills[0].lastUsed!.getTime()).toBeLessThanOrEqual(
        afterUpdate.getTime()
      );
    });
  });

  describe("removeSkillFromInventory", () => {
    it("should remove skill by ID", () => {
      let inventory = initializeSkillInventory(userId);
      const skill = createSkill(
        "PHP",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.BEGINNER
      );

      inventory = addSkillToInventory(inventory, skill);
      const updated = removeSkillFromInventory(inventory, skill.id);

      expect(updated.skills.length).toBe(0);
    });

    it("should only remove specific skill", () => {
      let inventory = initializeSkillInventory(userId);
      const skill1 = createSkill(
        "C++",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.ADVANCED
      );
      const skill2 = createSkill(
        "C#",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.INTERMEDIATE
      );

      inventory = addSkillToInventory(inventory, skill1);
      inventory = addSkillToInventory(inventory, skill2);
      const updated = removeSkillFromInventory(inventory, skill1.id);

      expect(updated.skills.length).toBe(1);
      expect(updated.skills[0].name).toBe("C#");
    });
  });

  describe("getSkillsByCategory", () => {
    it("should filter skills by category", () => {
      let inventory = initializeSkillInventory(userId);
      const techSkill = createSkill(
        "Python",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.ADVANCED
      );
      const softSkill = createSkill(
        "Leadership",
        SkillCategory.SOFT_SKILLS,
        ProficiencyLevel.INTERMEDIATE
      );

      inventory = addSkillToInventory(inventory, techSkill);
      inventory = addSkillToInventory(inventory, softSkill);

      const techSkills = getSkillsByCategory(
        inventory,
        SkillCategory.TECHNICAL
      );
      const softSkills = getSkillsByCategory(
        inventory,
        SkillCategory.SOFT_SKILLS
      );

      expect(techSkills.length).toBe(1);
      expect(techSkills[0].name).toBe("Python");
      expect(softSkills.length).toBe(1);
      expect(softSkills[0].name).toBe("Leadership");
    });
  });

  describe("getSkillsByProficiency", () => {
    it("should filter skills by proficiency level", () => {
      let inventory = initializeSkillInventory(userId);
      const expert = createSkill(
        "Expert Skill",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.EXPERT
      );
      const intermediate = createSkill(
        "Mid Skill",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.INTERMEDIATE
      );

      inventory = addSkillToInventory(inventory, expert);
      inventory = addSkillToInventory(inventory, intermediate);

      const experts = getSkillsByProficiency(
        inventory,
        ProficiencyLevel.EXPERT
      );
      const intermediates = getSkillsByProficiency(
        inventory,
        ProficiencyLevel.INTERMEDIATE
      );

      expect(experts.length).toBe(1);
      expect(intermediates.length).toBe(1);
    });
  });

  describe("searchSkills", () => {
    it("should find skills by name", () => {
      let inventory = initializeSkillInventory(userId);
      const skill1 = createSkill(
        "React",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.ADVANCED
      );
      const skill2 = createSkill(
        "Node.js",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.ADVANCED
      );
      const skill3 = createSkill(
        "Angular",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.INTERMEDIATE
      );

      inventory = addSkillToInventory(inventory, skill1);
      inventory = addSkillToInventory(inventory, skill2);
      inventory = addSkillToInventory(inventory, skill3);

      const results = searchSkills(inventory, "react");

      expect(results.length).toBe(1);
      expect(results[0].name).toBe("React");
    });

    it("should be case-insensitive", () => {
      let inventory = initializeSkillInventory(userId);
      const skill = createSkill(
        "Docker",
        SkillCategory.TOOL_TECHNOLOGY,
        ProficiencyLevel.INTERMEDIATE
      );

      inventory = addSkillToInventory(inventory, skill);
      const results = searchSkills(inventory, "DOCKER");

      expect(results.length).toBe(1);
    });
  });

  describe("getSkillStatistics", () => {
    it("should calculate statistics correctly", () => {
      let inventory = initializeSkillInventory(userId);
      const skill1 = createSkill(
        "JavaScript",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.EXPERT,
        5
      );
      const skill2 = createSkill(
        "Communication",
        SkillCategory.SOFT_SKILLS,
        ProficiencyLevel.ADVANCED,
        3
      );

      inventory = addSkillToInventory(inventory, skill1);
      inventory = addSkillToInventory(inventory, skill2);

      const stats = getSkillStatistics(inventory);

      expect(stats.totalSkills).toBe(2);
      expect(stats.skillsByCategory[SkillCategory.TECHNICAL]).toBe(1);
      expect(stats.skillsByCategory[SkillCategory.SOFT_SKILLS]).toBe(1);
      expect(stats.skillsByProficiency[ProficiencyLevel.EXPERT]).toBe(1);
      expect(stats.averageYearsOfExperience).toBe(4);
    });
  });

  describe("calculateSkillStrength", () => {
    it("should score based on proficiency level", () => {
      const beginnerSkill = createSkill(
        "Ruby",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.BEGINNER
      );
      const expertSkill = createSkill(
        "JavaScript",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.EXPERT
      );

      const beginnerScore = calculateSkillStrength(beginnerSkill);
      const expertScore = calculateSkillStrength(expertSkill);

      expect(expertScore).toBeGreaterThan(beginnerScore);
      expect(beginnerScore).toBe(25);
      expect(expertScore).toBe(100);
    });

    it("should add bonus for experience and endorsements", () => {
      const skillWithBonus = createSkill(
        "Java",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.ADVANCED,
        3
      );
      skillWithBonus.endorsements = 10;

      const score = calculateSkillStrength(skillWithBonus);

      // ADVANCED = 75, 3 years = +15, 10 endorsements = +1 (truncated) = 91
      expect(score).toBeGreaterThan(75);
    });
  });

  describe("endorseSkill", () => {
    it("should increment endorsement count", () => {
      let inventory = initializeSkillInventory(userId);
      const skill = createSkill(
        "Networking",
        SkillCategory.SOFT_SKILLS,
        ProficiencyLevel.INTERMEDIATE
      );

      inventory = addSkillToInventory(inventory, skill);
      let updated = endorseSkill(inventory, skill.id, 5);

      expect(updated.skills[0].endorsements).toBe(5);

      updated = endorseSkill(updated, skill.id, 3);

      expect(updated.skills[0].endorsements).toBe(8);
    });

    it("should default to 1 endorsement", () => {
      let inventory = initializeSkillInventory(userId);
      const skill = createSkill(
        "Teaching",
        SkillCategory.SOFT_SKILLS,
        ProficiencyLevel.ADVANCED
      );

      inventory = addSkillToInventory(inventory, skill);
      const updated = endorseSkill(inventory, skill.id);

      expect(updated.skills[0].endorsements).toBe(1);
    });
  });

  describe("getTopSkills", () => {
    it("should return top skills by strength", () => {
      let inventory = initializeSkillInventory(userId);
      const skill1 = createSkill(
        "Expert Skill",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.EXPERT,
        5
      );
      const skill2 = createSkill(
        "Intermediate Skill",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.INTERMEDIATE,
        2
      );
      const skill3 = createSkill(
        "Advanced Skill",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.ADVANCED,
        3
      );

      inventory = addSkillToInventory(inventory, skill1);
      inventory = addSkillToInventory(inventory, skill2);
      inventory = addSkillToInventory(inventory, skill3);

      const topSkills = getTopSkills(inventory, 2);

      expect(topSkills.length).toBe(2);
      expect(topSkills[0].proficiencyLevel).toBe(ProficiencyLevel.EXPERT);
      expect(topSkills[1].proficiencyLevel).toBe(ProficiencyLevel.ADVANCED);
    });

    it("should respect limit parameter", () => {
      let inventory = initializeSkillInventory(userId);
      for (let i = 0; i < 5; i++) {
        const skill = createSkill(
          `Skill ${i}`,
          SkillCategory.TECHNICAL,
          ProficiencyLevel.INTERMEDIATE
        );
        inventory = addSkillToInventory(inventory, skill);
      }

      const topSkills = getTopSkills(inventory, 3);

      expect(topSkills.length).toBe(3);
    });
  });

  describe("importSkills", () => {
    it("should import multiple skills at once", () => {
      let inventory = initializeSkillInventory(userId);
      const skillsToImport = [
        createSkill(
          "Skill1",
          SkillCategory.TECHNICAL,
          ProficiencyLevel.ADVANCED
        ),
        createSkill(
          "Skill2",
          SkillCategory.TECHNICAL,
          ProficiencyLevel.INTERMEDIATE
        ),
        createSkill(
          "Skill3",
          SkillCategory.SOFT_SKILLS,
          ProficiencyLevel.BEGINNER
        ),
      ];

      const updated = importSkills(inventory, skillsToImport);

      expect(updated.skills.length).toBe(3);
    });

    it("should skip duplicate skills", () => {
      let inventory = initializeSkillInventory(userId);
      const existingSkill = createSkill(
        "Existing",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.INTERMEDIATE
      );

      inventory = addSkillToInventory(inventory, existingSkill);

      const skillsToImport = [
        existingSkill,
        createSkill("New", SkillCategory.TECHNICAL, ProficiencyLevel.ADVANCED),
      ];

      const updated = importSkills(inventory, skillsToImport);

      expect(updated.skills.length).toBe(2);
      const newSkills = updated.skills.filter((s) => s.name === "New");
      expect(newSkills.length).toBe(1);
    });
  });

  describe("Integration Tests", () => {
    it("should manage complete skill lifecycle", () => {
      let inventory = initializeSkillInventory(userId);

      // Add skills
      const skill1 = createSkill(
        "React",
        SkillCategory.TECHNICAL,
        ProficiencyLevel.INTERMEDIATE,
        2
      );
      const skill2 = createSkill(
        "Leadership",
        SkillCategory.SOFT_SKILLS,
        ProficiencyLevel.BEGINNER
      );

      inventory = addSkillToInventory(inventory, skill1);
      inventory = addSkillToInventory(inventory, skill2);

      expect(inventory.skills.length).toBe(2);

      // Update proficiency
      inventory = updateSkillProficiency(
        inventory,
        skill1.id,
        ProficiencyLevel.ADVANCED
      );

      expect(inventory.skills[0].proficiencyLevel).toBe(
        ProficiencyLevel.ADVANCED
      );

      // Add endorsements
      inventory = endorseSkill(inventory, skill1.id, 5);

      expect(inventory.skills[0].endorsements).toBe(5);

      // Remove skill
      inventory = removeSkillFromInventory(inventory, skill2.id);

      expect(inventory.skills.length).toBe(1);
    });
  });
});
