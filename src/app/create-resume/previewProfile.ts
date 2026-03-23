import type {
  EducationEntry,
  ExperienceEntry,
  ResumeDataRequirements,
} from "@/lib/services/conversationManager";
import type { ResumeProfile } from "@/types";

const PUBLIC_VISIBILITY = "public" as const;
const DEFAULT_SKILL_LEVEL = "intermediate";

function splitDuration(duration?: string): {
  startDate: string;
  endDate?: string;
} {
  if (!duration) {
    return { startDate: "" };
  }

  const normalizedDuration = duration.trim();
  if (!normalizedDuration) {
    return { startDate: "" };
  }

  const [startDate, ...rest] = normalizedDuration
    .split(/\s+-\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    startDate: startDate || "",
    endDate: rest.length > 0 ? rest.join(" - ") : undefined,
  };
}

function mapExperience(
  experience: ExperienceEntry,
  index: number,
): ResumeProfile["experience"][number] {
  const { startDate, endDate } = splitDuration(experience.duration);

  return {
    id: `exp-${index}`,
    company: experience.company || "",
    role: experience.title || "",
    startDate,
    endDate,
    description: [experience.description, ...(experience.achievements || [])]
      .filter(Boolean)
      .join("\n"),
    visibility: PUBLIC_VISIBILITY,
  };
}

function mapEducation(
  education: EducationEntry,
  index: number,
): ResumeProfile["education"][number] {
  return {
    id: `edu-${index}`,
    institution: education.institution || "",
    degree: education.degree || "",
    startDate: education.year || "",
    visibility: PUBLIC_VISIBILITY,
  };
}

export function mapSessionDataToPreviewProfile(
  data: Partial<ResumeDataRequirements>,
): Partial<ResumeProfile> {
  return {
    title: data.name ? `${data.name}'s Resume` : "",
    summary: data.summary || "",
    skills: (data.skills || []).map((skill) => ({
      id: skill,
      name: skill,
      level: DEFAULT_SKILL_LEVEL,
      visibility: PUBLIC_VISIBILITY,
    })),
    experience: (data.experience || []).map(mapExperience),
    education: (data.education || []).map(mapEducation),
    contact: {
      email: { value: data.email || "", visibility: PUBLIC_VISIBILITY },
      phone: data.phone
        ? { value: data.phone, visibility: PUBLIC_VISIBILITY }
        : undefined,
    },
    personalInfo: {
      name: data.name || "",
      email: data.email || "",
      phone: data.phone || "",
      location: data.location || "",
      github: data.github || "",
      linkedin: data.linkedin || "",
    },
    projects: [],
  };
}
