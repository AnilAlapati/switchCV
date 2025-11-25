/**
 * Skill Inventory Manager
 * Manage user's skill collection with proficiency levels
 */

import {
  Skill,
  SkillInventory,
  ProficiencyLevel,
  SkillCategory,
} from "./skillMatrix.types";

/**
 * Create a new skill
 */
export function createSkill(
  name: string,
  category: SkillCategory,
  proficiencyLevel: ProficiencyLevel,
  yearsOfExperience?: number,
  description?: string
): Skill {
  return {
    id: generateSkillId(),
    name,
    category,
    proficiencyLevel,
    yearsOfExperience,
    description,
    endorsements: 0,
    lastUsed: new Date(),
  };
}

/**
 * Initialize skill inventory for a user
 */
export function initializeSkillInventory(userId: string): SkillInventory {
  return {
    id: generateInventoryId(),
    userId,
    skills: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Add skill to inventory
 */
export function addSkillToInventory(
  inventory: SkillInventory,
  skill: Skill
): SkillInventory {
  const existingSkill = inventory.skills.find(
    (s) => s.name.toLowerCase() === skill.name.toLowerCase()
  );

  if (existingSkill) {
    throw new Error(`Skill "${skill.name}" already exists in inventory`);
  }

  return {
    ...inventory,
    skills: [...inventory.skills, skill],
    updatedAt: new Date(),
  };
}

/**
 * Update skill proficiency
 */
export function updateSkillProficiency(
  inventory: SkillInventory,
  skillId: string,
  newProficiency: ProficiencyLevel,
  yearsOfExperience?: number
): SkillInventory {
  const skillIndex = inventory.skills.findIndex((s) => s.id === skillId);

  if (skillIndex === -1) {
    throw new Error(`Skill with ID "${skillId}" not found`);
  }

  const updatedSkills = [...inventory.skills];
  updatedSkills[skillIndex] = {
    ...updatedSkills[skillIndex],
    proficiencyLevel: newProficiency,
    yearsOfExperience:
      yearsOfExperience ?? updatedSkills[skillIndex].yearsOfExperience,
    lastUsed: new Date(),
  };

  return {
    ...inventory,
    skills: updatedSkills,
    updatedAt: new Date(),
  };
}

/**
 * Remove skill from inventory
 */
export function removeSkillFromInventory(
  inventory: SkillInventory,
  skillId: string
): SkillInventory {
  return {
    ...inventory,
    skills: inventory.skills.filter((s) => s.id !== skillId),
    updatedAt: new Date(),
  };
}

/**
 * Get skills by category
 */
export function getSkillsByCategory(
  inventory: SkillInventory,
  category: SkillCategory
): Skill[] {
  return inventory.skills.filter((s) => s.category === category);
}

/**
 * Get skills by proficiency level
 */
export function getSkillsByProficiency(
  inventory: SkillInventory,
  proficiency: ProficiencyLevel
): Skill[] {
  return inventory.skills.filter((s) => s.proficiencyLevel === proficiency);
}

/**
 * Search skills by name
 */
export function searchSkills(
  inventory: SkillInventory,
  query: string
): Skill[] {
  const lowerQuery = query.toLowerCase();
  return inventory.skills.filter((s) =>
    s.name.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get skill statistics
 */
export function getSkillStatistics(inventory: SkillInventory) {
  const totalSkills = inventory.skills.length;
  const skillsByCategory = new Map<SkillCategory, number>();
  const skillsByProficiency = new Map<ProficiencyLevel, number>();

  for (const skill of inventory.skills) {
    skillsByCategory.set(
      skill.category,
      (skillsByCategory.get(skill.category) || 0) + 1
    );
    skillsByProficiency.set(
      skill.proficiencyLevel,
      (skillsByProficiency.get(skill.proficiencyLevel) || 0) + 1
    );
  }

  const averageYearsOfExperience =
    inventory.skills.reduce((sum, s) => sum + (s.yearsOfExperience || 0), 0) /
    Math.max(totalSkills, 1);

  return {
    totalSkills,
    skillsByCategory: Object.fromEntries(skillsByCategory),
    skillsByProficiency: Object.fromEntries(skillsByProficiency),
    averageYearsOfExperience,
    totalEndorsements: inventory.skills.reduce(
      (sum, s) => sum + (s.endorsements || 0),
      0
    ),
  };
}

/**
 * Calculate skill strength score (0-100)
 */
export function calculateSkillStrength(skill: Skill): number {
  const proficiencyScores: Record<ProficiencyLevel, number> = {
    [ProficiencyLevel.BEGINNER]: 25,
    [ProficiencyLevel.INTERMEDIATE]: 50,
    [ProficiencyLevel.ADVANCED]: 75,
    [ProficiencyLevel.EXPERT]: 100,
  };

  const baseScore = proficiencyScores[skill.proficiencyLevel];

  // Add bonus for years of experience
  const experienceBonus = Math.min((skill.yearsOfExperience || 0) * 5, 20);

  // Add bonus for endorsements
  const endorsementBonus = Math.min((skill.endorsements || 0) / 10, 10);

  return Math.min(baseScore + experienceBonus + endorsementBonus, 100);
}

/**
 * Endorse a skill (increase endorsement count)
 */
export function endorseSkill(
  inventory: SkillInventory,
  skillId: string,
  count: number = 1
): SkillInventory {
  const skillIndex = inventory.skills.findIndex((s) => s.id === skillId);

  if (skillIndex === -1) {
    throw new Error(`Skill with ID "${skillId}" not found`);
  }

  const updatedSkills = [...inventory.skills];
  updatedSkills[skillIndex] = {
    ...updatedSkills[skillIndex],
    endorsements: (updatedSkills[skillIndex].endorsements || 0) + count,
  };

  return {
    ...inventory,
    skills: updatedSkills,
    updatedAt: new Date(),
  };
}

/**
 * Get top skills by strength
 */
export function getTopSkills(
  inventory: SkillInventory,
  limit: number = 5
): Skill[] {
  return [...inventory.skills]
    .sort((a, b) => calculateSkillStrength(b) - calculateSkillStrength(a))
    .slice(0, limit);
}

/**
 * Import skills from array
 */
export function importSkills(
  inventory: SkillInventory,
  skillsToImport: Skill[]
): SkillInventory {
  const existingNames = new Set(
    inventory.skills.map((s) => s.name.toLowerCase())
  );

  const newSkills = skillsToImport.filter(
    (s) => !existingNames.has(s.name.toLowerCase())
  );

  return {
    ...inventory,
    skills: [...inventory.skills, ...newSkills],
    updatedAt: new Date(),
  };
}

// Helper functions
function generateSkillId(): string {
  return `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateInventoryId(): string {
  return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
