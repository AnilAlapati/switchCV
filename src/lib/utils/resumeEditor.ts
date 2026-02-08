/**
 * Resume Editor Utilities
 *
 * This module handles dynamic resume data normalization from Firestore.
 * Uses Record<string, unknown> primarily, with legacy support for flexible document structures.
 */
import type {
  ResumeProfile,
  Visibility,
  ContactInfo,
} from "@/types";
import { pruneUndefined } from "@/lib/utils/pruneUndefined";
import {
  normalizeSkills,
  normalizeExperience,
  normalizeEducation,
  normalizeProjects,
  normalizeContact,
  normalizePersonalInfo,
} from "./resume/normalization";

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
