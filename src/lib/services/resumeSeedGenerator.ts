/* eslint-disable max-lines */
export type ResumeCategory = "creative" | "technical" | "executive" | "general";

export interface SeedResume {
  title: string;
  templateId: string;
  summary: string;
  skills: Array<{ name: string; level: string; visibility: "public" }>;
  experience: Array<{
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string;
    visibility: "public";
  }>;
  education: Array<{
    institution: string;
    degree: string;
    startDate: string;
    endDate: string;
    description: string;
    visibility: "public";
  }>;
  contact: {
    email: { value: string; visibility: "public" };
    phone: { value: string; visibility: "public" };
  };
  projects: Array<{
    name: string;
    description: string;
    visibility: "public";
  }>;
}

const CATEGORY_CONFIG = {
  creative: {
    templateId: "modern-creative-v1",
    focusAreas: [
      "storytelling",
      "visual systems",
      "brand cohesion",
      "cross-platform concepts",
    ],
    skills: [
      "Art Direction",
      "Creative Strategy",
      "Adobe Creative Suite",
      "Brand Storytelling",
      "Design Systems",
      "Motion Graphics",
      "UX Research",
      "Typography",
    ],
    companies: [
      "Canvas Collective",
      "Northstar Studios",
      "Aurora Creative",
      "OpenFrame Labs",
    ],
    projects: [
      "Immersive portfolio refresh",
      "Brand identity overhaul",
      "Interactive installation",
    ],
    universities: ["Parsons", "Pratt", "RISD", "SCAD"],
  },
  technical: {
    templateId: "standard-v1",
    focusAreas: [
      "scalable APIs",
      "data platforms",
      "cloud automation",
      "site reliability",
    ],
    skills: [
      "TypeScript",
      "Node.js",
      "Distributed Systems",
      "Cloud Architecture",
      "CI/CD",
      "Observability",
      "Database Design",
      "Security Reviews",
    ],
    companies: [
      "Waypoint Systems",
      "Helix Analytics",
      "Atlas Cloud",
      "Vector Labs",
    ],
    projects: [
      "Microservice modernization",
      "Data pipeline hardening",
      "Observability rollout",
    ],
    universities: ["MIT", "Georgia Tech", "Stanford", "Carnegie Mellon"],
  },
  executive: {
    templateId: "executive-v1",
    focusAreas: [
      "enterprise strategy",
      "global operations",
      "organizational scale",
      "capital efficiency",
    ],
    skills: [
      "Executive Leadership",
      "Board Communication",
      "P&L Management",
      "Change Management",
      "Growth Strategy",
      "Stakeholder Alignment",
      "Mentorship",
      "Enterprise Partnerships",
    ],
    companies: [
      "Summit Holdings",
      "Momentum Labs",
      "BrightLine Group",
      "Parallel Ventures",
    ],
    projects: [
      "Turnaround program",
      "Market expansion initiative",
      "Operating model redesign",
    ],
    universities: ["Harvard", "Wharton", "Kellogg", "Columbia"],
  },
  general: {
    templateId: "standard-v1",
    focusAreas: [
      "customer experience",
      "process improvement",
      "team enablement",
      "operational rigor",
    ],
    skills: [
      "Project Leadership",
      "Stakeholder Communication",
      "Data Analysis",
      "Operational Excellence",
      "Cross-functional Collaboration",
      "Mentorship",
      "KPI Tracking",
      "Continuous Improvement",
    ],
    companies: [
      "Northwind Partners",
      "Evergreen Solutions",
      "Urban Peak",
      "Horizon Works",
    ],
    projects: [
      "Process automation sprint",
      "Customer journey revamp",
      "Lifecycle analytics",
    ],
    universities: [
      "UCLA",
      "University of Michigan",
      "NYU",
      "University of Washington",
    ],
  },
} as const;

const creativeKeywords = [
  "designer",
  "artist",
  "creative",
  "chef",
  "actor",
  "writer",
  "producer",
  "illustrator",
  "photographer",
  "filmmaker",
];

const technicalKeywords = [
  "engineer",
  "developer",
  "architect",
  "scientist",
  "analyst",
  "technician",
  "programmer",
  "technologist",
  "data",
  "software",
  "product",
];

const executiveKeywords = [
  "chief",
  "director",
  "vp",
  "president",
  "leader",
  "lead",
  "executive",
  "head",
  "manager",
];

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const pick = <T>(list: ReadonlyArray<T>, hash: number, offset = 0): T => {
  if (!list.length) {
    throw new Error("List cannot be empty");
  }
  const index = (hash + offset) % list.length;
  return list[index];
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "pro";

const titleCase = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

export const categorizeProfession = (profession: string): ResumeCategory => {
  const normalized = (profession || "").toLowerCase();
  if (creativeKeywords.some((keyword) => normalized.includes(keyword))) {
    return "creative";
  }
  if (executiveKeywords.some((keyword) => normalized.includes(keyword))) {
    return "executive";
  }
  if (technicalKeywords.some((keyword) => normalized.includes(keyword))) {
    return "technical";
  }
  return "general";
};

export const getTemplateIdForCategory = (category: ResumeCategory): string =>
  CATEGORY_CONFIG[category].templateId;

const buildSkills = (
  skills: ReadonlyArray<string>,
  hash: number
): SeedResume["skills"] => {
  const result: SeedResume["skills"] = [];
  const used = new Set<string>();

  for (let i = 0; i < skills.length && result.length < 6; i += 1) {
    const name = skills[(hash + i) % skills.length];
    if (used.has(name)) continue;
    used.add(name);
    result.push({
      name,
      level:
        result.length < 2
          ? "Expert"
          : result.length < 4
            ? "Advanced"
            : "Intermediate",
      visibility: "public",
    });
  }

  return result;
};

export const generateTemplateResume = (profession: string): SeedResume => {
  const safeProfession = profession.trim() || "Professional";
  const category = categorizeProfession(safeProfession);
  const config = CATEGORY_CONFIG[category];
  const hash = hashString(safeProfession.toLowerCase());
  const title = titleCase(safeProfession);
  const focus = pick(config.focusAreas, hash);

  const now = new Date();
  const currentYear = now.getUTCFullYear();

  const experience: SeedResume["experience"] = [
    {
      company: pick(config.companies, hash),
      role: `Senior ${title}`,
      startDate: `${currentYear - 5}-01`,
      endDate: `${currentYear - 3}-12`,
      description: `Led ${focus} programs while mentoring cross-functional teams and improving delivery quality.`,
      visibility: "public",
    },
    {
      company: pick(config.companies, hash, 2),
      role: `${title}`,
      startDate: `${currentYear - 2}-01`,
      endDate: "Present",
      description: `Owns end-to-end execution for ${focus}, partnering with stakeholders to ship measurable outcomes.`,
      visibility: "public",
    },
  ];

  const education: SeedResume["education"] = [
    {
      institution: `${pick(config.universities, hash)} University`,
      degree: `${title} Studies`,
      startDate: `${currentYear - 10}-09`,
      endDate: `${currentYear - 6}-05`,
      description: "Focused on applied projects and leadership development.",
      visibility: "public",
    },
  ];

  const projects: SeedResume["projects"] = [
    {
      name: pick(config.projects, hash),
      description: `Delivered a ${focus} initiative that resulted in measurable quality gains across teams.`,
      visibility: "public",
    },
  ];

  const skills = buildSkills(config.skills, hash);
  const slug = slugify(title);

  return {
    title,
    templateId: config.templateId,
    summary: `${title} with 6+ years driving ${focus}. Known for translating vision into execution and keeping teams aligned.`,
    skills,
    experience,
    education,
    contact: {
      email: {
        value: `${slug.replace(/-/g, ".")}@example.com`,
        visibility: "public",
      },
      phone: {
        value: "+1-555-01" + String((hash % 90) + 10),
        visibility: "public",
      },
    },
    projects,
  };
};
