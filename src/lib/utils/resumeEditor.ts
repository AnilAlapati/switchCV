/* eslint-disable max-lines */
/**
 * Resume Editor Utilities
 *
 * This module handles dynamic resume data normalization from Firestore.
 * Uses Record<string, any> intentionally to handle flexible document structures.
 */
import type {
  ContactInfo,
  Education,
  Experience,
  Project,
  ResumeProfile,
  Skill,
  Visibility,
} from "@/types";
import { pruneUndefined } from "@/lib/utils/pruneUndefined";

type ResumeRecord = Record<string, unknown>;

export interface ResumeEditorMeta {
  userId?: string;
  numericId?: number;
  isPublic?: boolean;
  visibility?: string;
  templateId?: string;
}

export interface ResumeEditorNormalizationResult {
  profile: Partial<ResumeProfile>;
  resume: ResumeRecord;
  meta: ResumeEditorMeta;
}

const DEFAULT_VISIBILITY: Visibility = "public";
const DEFAULT_SKILL_LEVEL = "intermediate";
const ensureVisibility = (value: unknown): Visibility => {
  if (value === "public" || value === "masked" || value === "request") {
    return value;
  }
  return DEFAULT_VISIBILITY;
};

const normalizeSkills = (skills: unknown): Skill[] => {
  if (!Array.isArray(skills)) return [];

  return skills.map((skill, index) => {
    if (typeof skill === "string") {
      return {
        id: `skill-legacy-${index}`,
        name: skill,
        level: DEFAULT_SKILL_LEVEL,
        visibility: DEFAULT_VISIBILITY,
      } satisfies Skill;
    }

    if (skill && typeof skill === "object") {
      const skillObj = skill as Record<string, unknown>;
      return {
        id: (skillObj.id as string) || `skill-legacy-${index}`,
        name: (skillObj.name as string) ?? "",
        level: (skillObj.level as string) ?? DEFAULT_SKILL_LEVEL,
        visibility: ensureVisibility(skillObj.visibility),
      } satisfies Skill;
    }

    return {
      id: `skill-legacy-${index}`,
      name: "",
      level: DEFAULT_SKILL_LEVEL,
      visibility: DEFAULT_VISIBILITY,
    } satisfies Skill;
  });
};

const normalizeExperience = (experience: unknown): Experience[] => {
  if (!Array.isArray(experience)) return [];

  return experience.map((exp, index) => {
    if (!exp || typeof exp !== "object") {
      return {
        id: `exp-legacy-${index}`,
        company: "",
        role: "",
        startDate: "",
        description: "",
        visibility: DEFAULT_VISIBILITY,
      } satisfies Experience;
    }

    const expObj = exp as Record<string, unknown>;

    return {
      id: (expObj.id as string) || `exp-legacy-${index}`,
      company: (expObj.company as string) ?? "",
      role: (expObj.role as string) ?? (expObj.title as string) ?? "",
      startDate: (expObj.startDate as string) ?? (expObj.from as string) ?? "",
      endDate: expObj.endDate as string | undefined ?? expObj.to as string | undefined,
      description: (expObj.description as string) ?? (expObj.summary as string) ?? "",
      visibility: ensureVisibility(expObj.visibility),
    } satisfies Experience;
  });
};

const normalizeEducation = (education: unknown): Education[] => {
  if (!Array.isArray(education)) return [];

  return education.map((edu, index) => {
    if (!edu || typeof edu !== "object") {
      return {
        id: `edu-legacy-${index}`,
        institution: "",
        degree: "",
        startDate: "",
        visibility: DEFAULT_VISIBILITY,
      } satisfies Education;
    }

    const eduObj = edu as Record<string, unknown>;

    return {
      id: (eduObj.id as string) || `edu-legacy-${index}`,
      institution: (eduObj.institution as string) ?? "",
      degree: (eduObj.degree as string) ?? (eduObj.title as string) ?? "",
      startDate: (eduObj.startDate as string) ?? (eduObj.from as string) ?? "",
      endDate: eduObj.endDate as string | undefined ?? eduObj.to as string | undefined,
      description: eduObj.description as string | undefined,
      visibility: ensureVisibility(eduObj.visibility),
    } satisfies Education;
  });
};

const normalizeProjects = (projects: unknown): Project[] => {
  if (!Array.isArray(projects)) return [];

  return projects.map((project, index) => {
    if (!project || typeof project !== "object") {
      return {
        id: `proj-legacy-${index}`,
        name: "",
        description: "",
        visibility: DEFAULT_VISIBILITY,
      } satisfies Project;
    }

    const projectObj = project as Record<string, unknown>;

    return {
      id: (projectObj.id as string) || `proj-legacy-${index}`,
      name: (projectObj.name as string) ?? (projectObj.title as string) ?? "",
      url: projectObj.url as string | undefined,
      description: (projectObj.description as string) ?? "",
      visibility: ensureVisibility(projectObj.visibility),
    } satisfies Project;
  });
};

const normalizeContact = (contact: unknown): ContactInfo => {
  if (!contact || typeof contact !== "object") {
    return {
      email: { value: "", visibility: "masked" },
      phone: { value: "", visibility: "masked" },
    } satisfies ContactInfo;
  }

  const contactObj = contact as Record<string, unknown>;

  const rawEmail = contactObj.email;
  const rawPhone = contactObj.phone;

  const emailValue = typeof rawEmail === "string" ? rawEmail : (rawEmail as Record<string, unknown>)?.value as string ?? "";
  const phoneValue = typeof rawPhone === "string" ? rawPhone : (rawPhone as Record<string, unknown>)?.value as string ?? "";

  const emailVisibility =
    typeof rawEmail === "object" && rawEmail
      ? ensureVisibility((rawEmail as Record<string, unknown>).visibility)
      : ensureVisibility((contactObj.email as Record<string, unknown>)?.visibility);

  const phoneVisibility =
    typeof rawPhone === "object" && rawPhone
      ? ensureVisibility((rawPhone as Record<string, unknown>).visibility)
      : ensureVisibility((contactObj.phone as Record<string, unknown>)?.visibility);

  return {
    email: { value: emailValue, visibility: emailVisibility },
    phone: { value: phoneValue, visibility: phoneVisibility },
  } satisfies ContactInfo;
};

const normalizePersonalInfo = (
  personalInfo: unknown
): ResumeProfile["personalInfo"] => {
  if (!personalInfo || typeof personalInfo !== "object") return {};
  const info = personalInfo as Record<string, unknown>;
  return {
    name: info.name as string | undefined,
    title: info.title as string | undefined,
    email: info.email as string | undefined,
    phone: info.phone as string | undefined,
    location: info.location as string | undefined,
    linkedin: info.linkedin as string | undefined,
    github: info.github as string | undefined,
  };
};

export const normalizeResumeForEditor = (
  raw: unknown
): ResumeEditorNormalizationResult => {
  const rawResume = (raw && typeof raw === "object" ? raw : {}) as ResumeRecord;

  const skills = normalizeSkills(rawResume.skills);
  const experience = normalizeExperience(rawResume.experience);
  const education = normalizeEducation(rawResume.education);
  const projects = normalizeProjects(rawResume.projects);
  const contact = normalizeContact(rawResume.contact);
  const personalInfo = normalizePersonalInfo(rawResume.personalInfo);

  const resume: ResumeRecord = {
    ...rawResume,
    skills,
    experience,
    education,
    projects,
    contact,
    personalInfo,
  };

  const profile: Partial<ResumeProfile> = {
    title: (resume.title as string) ?? "",
    summary: (resume.summary as string) ?? "",
    skills,
    experience,
    education,
    projects,
    contact,
    personalInfo,
  };

  const meta: ResumeEditorMeta = {
    userId: rawResume.userId as string | undefined,
    numericId:
      typeof rawResume.numericId === "number"
        ? rawResume.numericId
        : typeof rawResume.id === "number"
          ? rawResume.id
          : undefined,
    isPublic:
      typeof rawResume.isPublic === "boolean"
        ? rawResume.isPublic
        : rawResume.visibility === "public",
    visibility: rawResume.visibility as string | undefined,
    templateId: rawResume.templateId as string | undefined,
  };

  return { profile, resume, meta };
};

const RESERVED_FIELDS = new Set([
  "userId",
  "numericId",
  "createdAt",
  "updatedAt",
  "isPublic",
  "visibility",
  "status",
]);

export const sanitizeResumePayload = (
  resume: ResumeRecord
): ResumeRecord => {
  if (!resume || typeof resume !== "object") {
    return {};
  }

  const sanitizedEntries = Object.entries(resume).filter(
    ([key]) => !RESERVED_FIELDS.has(key)
  );

  const sanitizedObject = Object.fromEntries(sanitizedEntries);
  const cleaned = pruneUndefined(sanitizedObject);

  return cleaned && typeof cleaned === "object"
    ? (cleaned as ResumeRecord)
    : {};
};

export const mergeProfileIntoResume = (
  original: ResumeRecord | null | undefined,
  profile: Partial<ResumeProfile>
): ResumeRecord => {
  const base = original ? { ...original } : {};
  const updated: ResumeRecord = { ...base };

  if (profile.title !== undefined) {
    updated.title = profile.title;
  }

  if (profile.summary !== undefined) {
    updated.summary = profile.summary;
  }

  if (profile.skills !== undefined) {
    updated.skills = profile.skills;
  }

  if (profile.experience !== undefined) {
    updated.experience = profile.experience;
  }

  if (profile.education !== undefined) {
    updated.education = profile.education;
  }

  if (profile.projects !== undefined) {
    updated.projects = profile.projects;
  }

  if (profile.personalInfo !== undefined) {
    updated.personalInfo = {
      ...((base.personalInfo as Record<string, unknown>) || {}),
      ...profile.personalInfo,
    };
  }

  if (profile.contact !== undefined) {
    const baseContact = (base.contact as Record<string, unknown>) || {};
    updated.contact = {
      email: {
        value: profile.contact.email?.value ?? (baseContact.email as Record<string, unknown>)?.value as string ?? "",
        visibility:
          profile.contact.email?.visibility ??
          (baseContact.email as Record<string, unknown>)?.visibility as Visibility ??
          "masked",
      },
      phone: {
        value: profile.contact.phone?.value ?? (baseContact.phone as Record<string, unknown>)?.value as string ?? "",
        visibility:
          profile.contact.phone?.visibility ??
          (baseContact.phone as Record<string, unknown>)?.visibility as Visibility ??
          "masked",
      },
    } satisfies ContactInfo;
  }

  return updated;
};
