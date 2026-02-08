import type {
    ContactInfo,
    Education,
    Experience,
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
            endDate: (expObj.endDate as string | undefined) ?? (expObj.to as string | undefined),
            description: (expObj.description as string) ?? (expObj.summary as string) ?? "",
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
            endDate: (eduObj.endDate as string | undefined) ?? (eduObj.to as string | undefined),
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

export const normalizePersonalInfo = (
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
