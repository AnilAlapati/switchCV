/**
 * useSkillInventory Hook
 * Manages user skill inventory state
 */

"use client";

import { useState, useCallback, useRef } from "react";
import {
  SkillInventory,
  ProficiencyLevel,
  SkillCategory,
} from "@/lib/skillMatrix.types";
import {
  createSkill,
  initializeSkillInventory,
  addSkillToInventory,
  updateSkillProficiency,
  removeSkillFromInventory,
  getSkillStatistics,
  searchSkills,
} from "@/lib/skillInventory";

interface UseSkillInventoryState {
  inventory: SkillInventory | null;
  loading: boolean;
  error: string | null;
}

export function useSkillInventory(initialUserId: string) {
  const [state, setState] = useState<UseSkillInventoryState>({
    inventory: null,
    loading: false,
    error: null,
  });

  const userIdRef = useRef(initialUserId);

  const initialize = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const newInventory = initializeSkillInventory(userIdRef.current);
      setState((prev) => ({
        ...prev,
        inventory: newInventory,
        loading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to initialize",
        loading: false,
      }));
    }
  }, []);

  const addSkill = useCallback(
    (
      name: string,
      category: SkillCategory,
      proficiency: ProficiencyLevel,
      yearsOfExperience?: number,
      description?: string
    ) => {
      if (!state.inventory) {
        setState((prev) => ({
          ...prev,
          error: "Inventory not initialized",
        }));
        return;
      }

      try {
        const newSkill = createSkill(
          name,
          category,
          proficiency,
          yearsOfExperience,
          description
        );
        const updated = addSkillToInventory(state.inventory, newSkill);
        setState((prev) => ({
          ...prev,
          inventory: updated,
          error: null,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Failed to add skill",
        }));
      }
    },
    [state.inventory]
  );

  const updateSkill = useCallback(
    (
      skillId: string,
      newProficiency: ProficiencyLevel,
      yearsOfExperience?: number
    ) => {
      if (!state.inventory) {
        setState((prev) => ({
          ...prev,
          error: "Inventory not initialized",
        }));
        return;
      }

      try {
        const updated = updateSkillProficiency(
          state.inventory,
          skillId,
          newProficiency,
          yearsOfExperience
        );
        setState((prev) => ({
          ...prev,
          inventory: updated,
          error: null,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : "Failed to update skill",
        }));
      }
    },
    [state.inventory]
  );

  const removeSkill = useCallback(
    (skillId: string) => {
      if (!state.inventory) {
        setState((prev) => ({
          ...prev,
          error: "Inventory not initialized",
        }));
        return;
      }

      try {
        const updated = removeSkillFromInventory(state.inventory, skillId);
        setState((prev) => ({
          ...prev,
          inventory: updated,
          error: null,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : "Failed to remove skill",
        }));
      }
    },
    [state.inventory]
  );

  const getSkills = useCallback(() => {
    return state.inventory?.skills || [];
  }, [state.inventory]);

  const searchByName = useCallback(
    (query: string) => {
      if (!state.inventory) return [];
      return searchSkills(state.inventory, query);
    },
    [state.inventory]
  );

  const getStats = useCallback(() => {
    if (!state.inventory) return null;
    return getSkillStatistics(state.inventory);
  }, [state.inventory]);

  return {
    inventory: state.inventory,
    loading: state.loading,
    error: state.error,
    initialize,
    addSkill,
    updateSkill,
    removeSkill,
    getSkills,
    searchByName,
    getStats,
  };
}
