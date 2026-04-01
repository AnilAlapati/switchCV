import type { ResumeProfile } from "@/types";

const PUBLIC_VISIBILITY = "public" as const;
const DEFAULT_SKILL_LEVEL = "intermediate";

/**
 * The `collectedData` returned by the orchestrator can arrive in two shapes:
 *
 *  1. **ResumeDataRequirements** (extraction format) — flat fields like
 *     `name`, `email`, `experience[].title`, `experience[].duration`,
 *     `education[].year`, `skills: string[]`.
 *
 *  2. **AIResumeResponse** (structured-output / candidateData format) —
 *     `contact.email.value`, `experience[].role`, `experience[].startDate`,
 *     `education[].startDate`, `skills: {name,level,visibility}[]`, `title`,
 *     `summary`, `personalInfo`, etc.
 *
 * This mapper handles BOTH formats so the live preview never breaks regardless
 * of which pipeline stage produced the data.
 */

// ---------------------------------------------------------------------------
// Helpers for polymorphic data
// ---------------------------------------------------------------------------

/** Safely read a nested path from an unknown object. */
function dig(obj: unknown, ...keys: string[]): unknown {
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// ---------------------------------------------------------------------------
// Duration / date helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Experience mapper — handles both extraction & AI-structured shapes
// ---------------------------------------------------------------------------

function mapExperience(
  raw: unknown,
  index: number,
): ResumeProfile["experience"][number] {
  if (!raw || typeof raw !== "object") {
    return {
      id: `exp-${index}`,
      company: "",
      role: "",
      startDate: "",
      description: "",
      visibility: PUBLIC_VISIBILITY,
    };
  }

  const entry = raw as Record<string, unknown>;

  // Role / title: AI format uses `role`, extraction uses `title`
  const role = str(entry.role) || str(entry.title) || "";
  const company = str(entry.company) || "";

  // Dates: AI format uses startDate/endDate, extraction uses `duration`
  let startDate = str(entry.startDate);
  let endDate: string | undefined = entry.endDate
    ? str(entry.endDate)
    : undefined;

  if (!startDate && entry.duration) {
    const split = splitDuration(str(entry.duration));
    startDate = split.startDate;
    endDate = split.endDate;
  }

  // Description + achievements
  const descParts = [
    str(entry.description),
    ...(Array.isArray(entry.achievements)
      ? (entry.achievements as unknown[]).map(String).filter(Boolean)
      : []),
  ].filter(Boolean);

  return {
    id: `exp-${index}`,
    company,
    role,
    startDate,
    endDate,
    description: descParts.join("\n"),
    visibility: PUBLIC_VISIBILITY,
  };
}

// ---------------------------------------------------------------------------
// Education mapper — handles both shapes
// ---------------------------------------------------------------------------

function mapEducation(
  raw: unknown,
  index: number,
): ResumeProfile["education"][number] {
  if (!raw || typeof raw !== "object") {
    return {
      id: `edu-${index}`,
      institution: "",
      degree: "",
      startDate: "",
      visibility: PUBLIC_VISIBILITY,
    };
  }

  const entry = raw as Record<string, unknown>;

  return {
    id: `edu-${index}`,
    institution: str(entry.institution) || "",
    degree: str(entry.degree) || "",
    // AI format: startDate, extraction format: year
    startDate: str(entry.startDate) || str(entry.year) || "",
    endDate: entry.endDate ? str(entry.endDate) : undefined,
    description: entry.description ? str(entry.description) : undefined,
    visibility: PUBLIC_VISIBILITY,
  };
}

// ---------------------------------------------------------------------------
// Skills mapper — handles string[] and {name,level,visibility}[]
// ---------------------------------------------------------------------------

function mapSkills(
  skills: unknown,
): ResumeProfile["skills"] {
  if (!Array.isArray(skills)) return [];

  return skills
    .map((skill): ResumeProfile["skills"][number] | null => {
      if (typeof skill === "string" && skill.trim()) {
        return {
          id: skill,
          name: skill,
          level: DEFAULT_SKILL_LEVEL,
          visibility: PUBLIC_VISIBILITY,
        };
      }
      if (skill && typeof skill === "object") {
        const s = skill as Record<string, unknown>;
        const name = str(s.name);
        if (!name) return null;
        return {
          id: name,
          name,
          level: str(s.level) || DEFAULT_SKILL_LEVEL,
          visibility: PUBLIC_VISIBILITY,
        };
      }
      return null;
    })
    .filter((s): s is ResumeProfile["skills"][number] => s !== null);
}

// ---------------------------------------------------------------------------
// Main mapper
// ---------------------------------------------------------------------------

export function mapSessionDataToPreviewProfile(
  data: Record<string, unknown>,
): Partial<ResumeProfile> {
  // ----- Name resolution -----
  // Extraction format: top-level `name`
  // AI format: may have `personalInfo.name` or `contact.email.value`
  const name =
    str(data.name) ||
    str(dig(data, "personalInfo", "name")) ||
    "";

  // ----- Email resolution -----
  const email =
    str(data.email) ||
    str(dig(data, "contact", "email", "value")) ||
    str(dig(data, "personalInfo", "email")) ||
    "";

  // ----- Phone resolution -----
  const phone =
    str(data.phone) ||
    str(dig(data, "contact", "phone", "value")) ||
    str(dig(data, "personalInfo", "phone")) ||
    "";

  // ----- Location / social -----
  const location =
    str(data.location) ||
    str(dig(data, "personalInfo", "location")) ||
    "";
  const github =
    str(data.github) ||
    str(dig(data, "personalInfo", "github")) ||
    "";
  const linkedin =
    str(data.linkedin) ||
    str(dig(data, "personalInfo", "linkedin")) ||
    "";

  // ----- Title -----
  // AI structured output has a `title` field; extraction format doesn't
  const title =
    str(data.title) || (name ? `${name}'s Resume` : "");

  // ----- Summary -----
  const summary = str(data.summary) || "";

  // ----- Arrays -----
  const experience = Array.isArray(data.experience)
    ? (data.experience as unknown[]).map(mapExperience)
    : [];

  const education = Array.isArray(data.education)
    ? (data.education as unknown[]).map(mapEducation)
    : [];

  const skills = mapSkills(data.skills);

  // ----- Projects (AI format only) -----
  const projects = Array.isArray(data.projects)
    ? (data.projects as unknown[])
        .map((p, i) => {
          if (!p || typeof p !== "object") return null;
          const proj = p as Record<string, unknown>;
          const projName = str(proj.name);
          if (!projName) return null;
          return {
            id: `proj-${i}`,
            name: projName,
            url: str(proj.url) || undefined,
            description: str(proj.description) || "",
            technologies: Array.isArray(proj.technologies)
              ? (proj.technologies as unknown[]).filter(
                  (t): t is string => typeof t === "string",
                )
              : undefined,
            visibility: PUBLIC_VISIBILITY,
          };
        })
        .filter(
          (p): p is NonNullable<typeof p> => p !== null,
        )
    : [];

  return {
    title,
    summary,
    skills,
    experience,
    education,
    contact: {
      email: { value: email, visibility: PUBLIC_VISIBILITY },
      phone: phone
        ? { value: phone, visibility: PUBLIC_VISIBILITY }
        : undefined,
    },
    personalInfo: {
      name,
      email,
      phone,
      location,
      github,
      linkedin,
    },
    projects,
  };
}
