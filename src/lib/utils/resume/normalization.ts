import type {
  Award,
  Certification,
  ContactInfo,
  Education,
  Experience,
  Language,
  Project,
  ResumeProfile,
  Skill,
  Visibility,
} from "@/types";

export const DEFAULT_VISIBILITY: Visibility = "public";
export const DEFAULT_SKILL_LEVEL = "intermediate";

export const ensureVisibility = (value: unknown): Visibility => {
  if (value === "public" || value === "masked" || value === "request") {
    return value;
  }
  return DEFAULT_VISIBILITY;
};

export const normalizeSkills = (skills: unknown): Skill[] => {
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

export const normalizeExperience = (experience: unknown): Experience[] => {
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
      endDate:
        (expObj.endDate as string | undefined) ??
        (expObj.to as string | undefined),
      description:
        (expObj.description as string) ?? (expObj.summary as string) ?? "",
      visibility: ensureVisibility(expObj.visibility),
    } satisfies Experience;
  });
};

export const normalizeEducation = (education: unknown): Education[] => {
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
      endDate:
        (eduObj.endDate as string | undefined) ??
        (eduObj.to as string | undefined),
      description: eduObj.description as string | undefined,
      visibility: ensureVisibility(eduObj.visibility),
    } satisfies Education;
  });
};

export const normalizeProjects = (projects: unknown): Project[] => {
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

export const normalizeContact = (contact: unknown): ContactInfo => {
  if (!contact || typeof contact !== "object") {
    return {
      email: { value: "", visibility: "masked" },
      phone: { value: "", visibility: "masked" },
    } satisfies ContactInfo;
  }

  const contactObj = contact as Record<string, unknown>;

  const rawEmail = contactObj.email;
  const rawPhone = contactObj.phone;

  const emailValue =
    typeof rawEmail === "string"
      ? rawEmail
      : (((rawEmail as Record<string, unknown>)?.value as string) ?? "");
  const phoneValue =
    typeof rawPhone === "string"
      ? rawPhone
      : (((rawPhone as Record<string, unknown>)?.value as string) ?? "");

  const emailVisibility =
    typeof rawEmail === "object" && rawEmail
      ? ensureVisibility((rawEmail as Record<string, unknown>).visibility)
      : ensureVisibility(
          (contactObj.email as Record<string, unknown>)?.visibility,
        );

  const phoneVisibility =
    typeof rawPhone === "object" && rawPhone
      ? ensureVisibility((rawPhone as Record<string, unknown>).visibility)
      : ensureVisibility(
          (contactObj.phone as Record<string, unknown>)?.visibility,
        );

  return {
    email: { value: emailValue, visibility: emailVisibility },
    phone: { value: phoneValue, visibility: phoneVisibility },
  } satisfies ContactInfo;
};

export const normalizePersonalInfo = (
  personalInfo: unknown,
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

export const normalizeCertifications = (
  certifications: unknown,
): Certification[] => {
  if (!Array.isArray(certifications)) return [];

  return certifications.map((cert, index) => {
    if (!cert || typeof cert !== "object") {
      return {
        id: `cert-legacy-${index}`,
        name: "",
        issuer: "",
        visibility: DEFAULT_VISIBILITY,
      } satisfies Certification;
    }
    const c = cert as Record<string, unknown>;
    return {
      id: (c.id as string) || `cert-legacy-${index}`,
      name: (c.name as string) ?? "",
      issuer: (c.issuer as string) ?? (c.organization as string) ?? "",
      issueDate: c.issueDate as string | undefined,
      expiryDate: c.expiryDate as string | undefined,
      credentialId: c.credentialId as string | undefined,
      credentialUrl:
        (c.credentialUrl as string | undefined) ??
        (c.url as string | undefined),
      visibility: ensureVisibility(c.visibility),
    } satisfies Certification;
  });
};

const VALID_PROFICIENCY = new Set([
  "native",
  "fluent",
  "professional",
  "conversational",
  "basic",
]);

export const normalizeLanguages = (languages: unknown): Language[] => {
  if (!Array.isArray(languages)) return [];

  return languages.map((lang, index) => {
    if (!lang || typeof lang !== "object") {
      return {
        id: `lang-legacy-${index}`,
        language: "",
        proficiency: "conversational",
        visibility: DEFAULT_VISIBILITY,
      } satisfies Language;
    }
    const l = lang as Record<string, unknown>;
    const rawProficiency = l.proficiency as string;
    const proficiency = VALID_PROFICIENCY.has(rawProficiency)
      ? (rawProficiency as Language["proficiency"])
      : "conversational";
    return {
      id: (l.id as string) || `lang-legacy-${index}`,
      language: (l.language as string) ?? (l.name as string) ?? "",
      proficiency,
      visibility: ensureVisibility(l.visibility),
    } satisfies Language;
  });
};

export const normalizeAwards = (awards: unknown): Award[] => {
  if (!Array.isArray(awards)) return [];

  return awards.map((award, index) => {
    if (!award || typeof award !== "object") {
      return {
        id: `award-legacy-${index}`,
        title: "",
        issuer: "",
        visibility: DEFAULT_VISIBILITY,
      } satisfies Award;
    }
    const a = award as Record<string, unknown>;
    return {
      id: (a.id as string) || `award-legacy-${index}`,
      title: (a.title as string) ?? (a.name as string) ?? "",
      issuer: (a.issuer as string) ?? (a.organization as string) ?? "",
      date: (a.date as string | undefined) ?? (a.year as string | undefined),
      description: a.description as string | undefined,
      visibility: ensureVisibility(a.visibility),
    } satisfies Award;
  });
};
