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

type ResumeRecord = Record<string, any>;

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

  return skills.map((skill) => {
    if (typeof skill === "string") {
      return {
        name: skill,
        level: DEFAULT_SKILL_LEVEL,
        visibility: DEFAULT_VISIBILITY,
      } satisfies Skill;
    }

    if (skill && typeof skill === "object") {
      const skillObj = skill as Partial<Skill> & Record<string, any>;
      return {
        name: skillObj.name ?? "",
        level: skillObj.level ?? DEFAULT_SKILL_LEVEL,
        visibility: ensureVisibility(skillObj.visibility),
      } satisfies Skill;
    }

    return {
      name: "",
      level: DEFAULT_SKILL_LEVEL,
      visibility: DEFAULT_VISIBILITY,
    } satisfies Skill;
  });
};

const normalizeExperience = (experience: unknown): Experience[] => {
  if (!Array.isArray(experience)) return [];

  return experience.map((exp) => {
    if (!exp || typeof exp !== "object") {
      return {
        company: "",
        role: "",
        startDate: "",
        description: "",
        visibility: DEFAULT_VISIBILITY,
      } satisfies Experience;
    }

    const expObj = exp as Partial<Experience> & Record<string, any>;

    return {
      company: expObj.company ?? "",
      role: expObj.role ?? expObj.title ?? "",
      startDate: expObj.startDate ?? expObj.from ?? "",
      endDate: expObj.endDate ?? expObj.to,
      description: expObj.description ?? expObj.summary ?? "",
      visibility: ensureVisibility(expObj.visibility),
    } satisfies Experience;
  });
};

const normalizeEducation = (education: unknown): Education[] => {
  if (!Array.isArray(education)) return [];

  return education.map((edu) => {
    if (!edu || typeof edu !== "object") {
      return {
        institution: "",
        degree: "",
        startDate: "",
        visibility: DEFAULT_VISIBILITY,
      } satisfies Education;
    }

    const eduObj = edu as Partial<Education> & Record<string, any>;

    return {
      institution: eduObj.institution ?? "",
      degree: eduObj.degree ?? eduObj.title ?? "",
      startDate: eduObj.startDate ?? eduObj.from ?? "",
      endDate: eduObj.endDate ?? eduObj.to,
      description: eduObj.description,
      visibility: ensureVisibility(eduObj.visibility),
    } satisfies Education;
  });
};

const normalizeProjects = (projects: unknown): Project[] => {
  if (!Array.isArray(projects)) return [];

  return projects.map((project) => {
    if (!project || typeof project !== "object") {
      return {
        name: "",
        description: "",
        visibility: DEFAULT_VISIBILITY,
      } satisfies Project;
    }

    const projectObj = project as Partial<Project> & Record<string, any>;

    return {
      name: projectObj.name ?? projectObj.title ?? "",
      url: projectObj.url,
      description: projectObj.description ?? "",
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

  const contactObj = contact as Partial<ContactInfo> & Record<string, any>;

  const rawEmail = contactObj.email as
    | string
    | (ContactInfo["email"] & Record<string, any>)
    | undefined;
  const rawPhone = contactObj.phone as
    | string
    | (ContactInfo["phone"] & Record<string, any>)
    | undefined;

  const emailValue =
    typeof rawEmail === "string" ? rawEmail : rawEmail?.value ?? "";
  const phoneValue =
    typeof rawPhone === "string" ? rawPhone : rawPhone?.value ?? "";

  const emailVisibility =
    typeof rawEmail === "object" && rawEmail
      ? ensureVisibility(rawEmail.visibility)
      : ensureVisibility(contactObj.email?.visibility);

  const phoneVisibility =
    typeof rawPhone === "object" && rawPhone
      ? ensureVisibility(rawPhone.visibility)
      : ensureVisibility(contactObj.phone?.visibility);

  return {
    email: { value: emailValue, visibility: emailVisibility },
    phone: { value: phoneValue, visibility: phoneVisibility },
  } satisfies ContactInfo;
};

const normalizePersonalInfo = (
  personalInfo: unknown
): ResumeProfile["personalInfo"] => {
  if (!personalInfo || typeof personalInfo !== "object") return {};
  const info = personalInfo as ResumeProfile["personalInfo"] &
    Record<string, any>;
  return {
    name: info.name,
    title: info.title,
    email: info.email,
    phone: info.phone,
    location: info.location,
    linkedin: info.linkedin,
    github: info.github,
  };
};

export const normalizeResumeForEditor = (
  raw: unknown
): ResumeEditorNormalizationResult => {
  const rawResume = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    any
  >;

  const skills = normalizeSkills(rawResume.skills);
  const experience = normalizeExperience(rawResume.experience);
  const education = normalizeEducation(rawResume.education);
  const projects = normalizeProjects(rawResume.projects);
  const contact = normalizeContact(rawResume.contact);
  const personalInfo = normalizePersonalInfo(rawResume.personalInfo);

  const resume: Record<string, any> = {
    ...rawResume,
    skills,
    experience,
    education,
    projects,
    contact,
    personalInfo,
  };

  const profile: Partial<ResumeProfile> = {
    title: resume.title ?? "",
    summary: resume.summary ?? "",
    skills,
    experience,
    education,
    projects,
    contact,
    personalInfo,
  };

  const meta: ResumeEditorMeta = {
    userId: rawResume.userId,
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
    visibility: rawResume.visibility,
    templateId: rawResume.templateId,
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
  resume: Record<string, any>
): Record<string, any> => {
  if (!resume || typeof resume !== "object") {
    return {};
  }

  const sanitizedEntries = Object.entries(resume).filter(
    ([key]) => !RESERVED_FIELDS.has(key)
  );

  const sanitizedObject = Object.fromEntries(sanitizedEntries);
  const cleaned = pruneUndefined(sanitizedObject);

  return cleaned && typeof cleaned === "object"
    ? (cleaned as Record<string, any>)
    : {};
};

export const mergeProfileIntoResume = (
  original: Record<string, any> | null | undefined,
  profile: Partial<ResumeProfile>
): Record<string, any> => {
  const base = original ? { ...original } : {};
  const updated = { ...base };

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
      ...(base.personalInfo || {}),
      ...profile.personalInfo,
    };
  }

  if (profile.contact !== undefined) {
    const baseContact = base.contact || {};
    updated.contact = {
      email: {
        value: profile.contact.email?.value ?? baseContact.email?.value ?? "",
        visibility:
          profile.contact.email?.visibility ??
          baseContact.email?.visibility ??
          "masked",
      },
      phone: {
        value: profile.contact.phone?.value ?? baseContact.phone?.value ?? "",
        visibility:
          profile.contact.phone?.visibility ??
          baseContact.phone?.visibility ??
          "masked",
      },
    } satisfies ContactInfo;
  }

  return updated;
};
