import { useCallback, useState } from "react";
import {
  Award,
  Certification,
  Language,
  Skill,
  Experience,
  Education,
  Project,
  ResumeProfile,
} from "@/types";

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
      certifications: [],
      languages: [],
      awards: [],
    },
  );

  const updateProfile = useCallback((updates: Partial<ResumeProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  }, []);

  // ===== Experience Management =====
  const addExperience = useCallback(() => {
    const newExperience: Experience = {
      id: crypto.randomUUID(),
      company: "",
      role: "",
      startDate: "",
      description: "",
      visibility: "public",
    };
    setProfile((prev) => ({
      ...prev,
      experience: [...(prev.experience || []), newExperience],
    }));
  }, []);

  const updateExperience = useCallback(
    (index: number, updates: Partial<Experience>) => {
      setProfile((prev) => {
        const experience = [...(prev.experience || [])];
        experience[index] = { ...experience[index], ...updates };
        return { ...prev, experience };
      });
    },
    [],
  );

  const removeExperience = useCallback((index: number) => {
    setProfile((prev) => ({
      ...prev,
      experience: (prev.experience || []).filter((_, i) => i !== index),
    }));
  }, []);

  // ===== Education Management =====
  const addEducation = useCallback(() => {
    const newEducation: Education = {
      id: crypto.randomUUID(),
      institution: "",
      degree: "",
      startDate: "",
      visibility: "public",
    };
    setProfile((prev) => ({
      ...prev,
      education: [...(prev.education || []), newEducation],
    }));
  }, []);

  const updateEducation = useCallback(
    (index: number, updates: Partial<Education>) => {
      setProfile((prev) => {
        const education = [...(prev.education || [])];
        education[index] = { ...education[index], ...updates };
        return { ...prev, education };
      });
    },
    [],
  );

  const removeEducation = useCallback((index: number) => {
    setProfile((prev) => ({
      ...prev,
      education: (prev.education || []).filter((_, i) => i !== index),
    }));
  }, []);

  // ===== Skills Management =====
  const addSkill = useCallback(() => {
    const newSkill: Skill = {
      id: crypto.randomUUID(),
      name: "",
      level: "intermediate",
      visibility: "public",
    };
    setProfile((prev) => ({
      ...prev,
      skills: [...(prev.skills || []), newSkill],
    }));
  }, []);

  const updateSkill = useCallback((index: number, updates: Partial<Skill>) => {
    setProfile((prev) => {
      const skills = [...(prev.skills || [])];
      skills[index] = { ...skills[index], ...updates };
      return { ...prev, skills };
    });
  }, []);

  const removeSkill = useCallback((index: number) => {
    setProfile((prev) => ({
      ...prev,
      skills: (prev.skills || []).filter((_, i) => i !== index),
    }));
  }, []);

  // ===== Projects Management =====
  const addProject = useCallback(() => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      visibility: "public",
    };
    setProfile((prev) => ({
      ...prev,
      projects: [...(prev.projects || []), newProject],
    }));
  }, []);

  const updateProject = useCallback(
    (index: number, updates: Partial<Project>) => {
      setProfile((prev) => {
        const projects = [...(prev.projects || [])];
        projects[index] = { ...projects[index], ...updates };
        return { ...prev, projects };
      });
    },
    [],
  );

  const removeProject = useCallback((index: number) => {
    setProfile((prev) => ({
      ...prev,
      projects: (prev.projects || []).filter((_, i) => i !== index),
    }));
  }, []);

  // ===== Certifications Management =====
  const addCertification = useCallback(() => {
    const newCert: Certification = {
      id: crypto.randomUUID(),
      name: "",
      issuer: "",
      visibility: "public",
    };
    setProfile((prev) => ({
      ...prev,
      certifications: [...(prev.certifications || []), newCert],
    }));
  }, []);

  const updateCertification = useCallback(
    (index: number, updates: Partial<Certification>) => {
      setProfile((prev) => {
        const certifications = [...(prev.certifications || [])];
        certifications[index] = { ...certifications[index], ...updates };
        return { ...prev, certifications };
      });
    },
    [],
  );

  const removeCertification = useCallback((index: number) => {
    setProfile((prev) => ({
      ...prev,
      certifications: (prev.certifications || []).filter((_, i) => i !== index),
    }));
  }, []);

  // ===== Languages Management =====
  const addLanguage = useCallback(() => {
    const newLang: Language = {
      id: crypto.randomUUID(),
      language: "",
      proficiency: "conversational",
      visibility: "public",
    };
    setProfile((prev) => ({
      ...prev,
      languages: [...(prev.languages || []), newLang],
    }));
  }, []);

  const updateLanguage = useCallback(
    (index: number, updates: Partial<Language>) => {
      setProfile((prev) => {
        const languages = [...(prev.languages || [])];
        languages[index] = { ...languages[index], ...updates };
        return { ...prev, languages };
      });
    },
    [],
  );

  const removeLanguage = useCallback((index: number) => {
    setProfile((prev) => ({
      ...prev,
      languages: (prev.languages || []).filter((_, i) => i !== index),
    }));
  }, []);

  // ===== Awards Management =====
  const addAward = useCallback(() => {
    const newAward: Award = {
      id: crypto.randomUUID(),
      title: "",
      issuer: "",
      visibility: "public",
    };
    setProfile((prev) => ({
      ...prev,
      awards: [...(prev.awards || []), newAward],
    }));
  }, []);

  const updateAward = useCallback((index: number, updates: Partial<Award>) => {
    setProfile((prev) => {
      const awards = [...(prev.awards || [])];
      awards[index] = { ...awards[index], ...updates };
      return { ...prev, awards };
    });
  }, []);

  const removeAward = useCallback((index: number) => {
    setProfile((prev) => ({
      ...prev,
      awards: (prev.awards || []).filter((_, i) => i !== index),
    }));
  }, []);

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
    certifications: {
      add: addCertification,
      update: updateCertification,
      remove: removeCertification,
    },
    languages: {
      add: addLanguage,
      update: updateLanguage,
      remove: removeLanguage,
    },
    awards: {
      add: addAward,
      update: updateAward,
      remove: removeAward,
    },
  };
}
