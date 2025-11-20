import { useState } from "react";
import { Skill, Experience, Education, Project, ResumeProfile } from "@/types";

/**
 * Custom hook for managing resume profile form state and operations
 * Centralizes all profile management logic from onboarding pages
 */
export function useProfileForm(initialProfile?: Partial<ResumeProfile>) {
  const [profile, setProfile] = useState<Partial<ResumeProfile>>(
    initialProfile || {
      title: "",
      summary: "",
      skills: [],
      experience: [],
      education: [],
      contact: {
        email: { value: "", visibility: "masked" },
        phone: { value: "", visibility: "masked" },
      },
      projects: [],
    }
  );

  const updateProfile = (updates: Partial<ResumeProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  // ===== Experience Management =====
  const addExperience = () => {
    const newExperience: Experience = {
      company: "",
      role: "",
      startDate: "",
      description: "",
      visibility: "public",
    };
    updateProfile({
      experience: [...(profile.experience || []), newExperience],
    });
  };

  const updateExperience = (index: number, updates: Partial<Experience>) => {
    const updated = [...(profile.experience || [])];
    updated[index] = { ...updated[index], ...updates };
    updateProfile({ experience: updated });
  };

  const removeExperience = (index: number) => {
    const updated = (profile.experience || []).filter((_, i) => i !== index);
    updateProfile({ experience: updated });
  };

  // ===== Education Management =====
  const addEducation = () => {
    const newEducation: Education = {
      institution: "",
      degree: "",
      startDate: "",
      visibility: "public",
    };
    updateProfile({
      education: [...(profile.education || []), newEducation],
    });
  };

  const updateEducation = (index: number, updates: Partial<Education>) => {
    const updated = [...(profile.education || [])];
    updated[index] = { ...updated[index], ...updates };
    updateProfile({ education: updated });
  };

  const removeEducation = (index: number) => {
    const updated = (profile.education || []).filter((_, i) => i !== index);
    updateProfile({ education: updated });
  };

  // ===== Skills Management =====
  const addSkill = () => {
    const newSkill: Skill = {
      name: "",
      level: "intermediate",
      visibility: "public",
    };
    updateProfile({
      skills: [...(profile.skills || []), newSkill],
    });
  };

  const updateSkill = (index: number, updates: Partial<Skill>) => {
    const updated = [...(profile.skills || [])];
    updated[index] = { ...updated[index], ...updates };
    updateProfile({ skills: updated });
  };

  const removeSkill = (index: number) => {
    const updated = (profile.skills || []).filter((_, i) => i !== index);
    updateProfile({ skills: updated });
  };

  // ===== Projects Management =====
  const addProject = () => {
    const newProject: Project = {
      name: "",
      description: "",
      visibility: "public",
    };
    updateProfile({
      projects: [...(profile.projects || []), newProject],
    });
  };

  const updateProject = (index: number, updates: Partial<Project>) => {
    const updated = [...(profile.projects || [])];
    updated[index] = { ...updated[index], ...updates };
    updateProfile({ projects: updated });
  };

  const removeProject = (index: number) => {
    const updated = (profile.projects || []).filter((_, i) => i !== index);
    updateProfile({ projects: updated });
  };

  return {
    profile,
    updateProfile,
    experience: {
      add: addExperience,
      update: updateExperience,
      remove: removeExperience,
    },
    education: {
      add: addEducation,
      update: updateEducation,
      remove: removeEducation,
    },
    skills: {
      add: addSkill,
      update: updateSkill,
      remove: removeSkill,
    },
    projects: {
      add: addProject,
      update: updateProject,
      remove: removeProject,
    },
  };
}
