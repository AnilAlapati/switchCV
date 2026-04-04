/**
 * Resume Chunking Service
 *
 * Splits structured resume data into semantically meaningful chunks (300–500 words).
 * Each chunk preserves section identity (experience, skills, education, etc.)
 * so retrieval can return focused context instead of the full resume.
 *
 * Strategy: Section-aware chunking for structured JSON resumes.
 * - Small sections (summary, skills, contact) → single chunk each
 * - Array sections (experience, education, projects) → one chunk per item,
 *   with overflow splitting if a single item exceeds 500 words
 *
 * @module lib/services/rag/chunkingService
 */

import type {
  ResumeProfile,
  Experience,
  Education,
  Project,
  Skill,
} from "@/types";
import type { ResumeChunk } from "./types";

const MAX_CHUNK_WORDS = 500;
const MIN_CHUNK_WORDS = 50;

/**
 * Chunk a structured ResumeProfile into semantically meaningful text chunks.
 *
 * @param profile - The resume profile to chunk
 * @param resumeId - Resume identifier for chunk IDs
 * @returns Array of chunks with metadata
 */
export function chunkResume(
  profile: ResumeProfile,
  resumeId: string,
): ResumeChunk[] {
  const chunks: ResumeChunk[] = [];

  // 1. Summary chunk
  if (profile.summary?.trim()) {
    chunks.push(
      ...createTextChunks(profile.summary, "summary", resumeId, {
        title: profile.title || "",
      }),
    );
  }

  // 2. Skills chunk — group all skills into a readable block
  if (profile.skills?.length) {
    const skillsText = formatSkills(profile.skills);
    chunks.push(
      ...createTextChunks(skillsText, "skills", resumeId, {
        count: String(profile.skills.length),
      }),
    );
  }

  // 3. Experience — one chunk per role (split if a single role is very long)
  if (profile.experience?.length) {
    for (let i = 0; i < profile.experience.length; i++) {
      const exp = profile.experience[i];
      const text = formatExperience(exp);
      chunks.push(
        ...createTextChunks(
          text,
          "experience",
          resumeId,
          {
            company: exp.company || "",
            role: exp.role || "",
          },
          i,
        ),
      );
    }
  }

  // 4. Education — one chunk per entry
  if (profile.education?.length) {
    for (let i = 0; i < profile.education.length; i++) {
      const edu = profile.education[i];
      const text = formatEducation(edu);
      chunks.push(
        ...createTextChunks(
          text,
          "education",
          resumeId,
          {
            institution: edu.institution || "",
            degree: edu.degree || "",
          },
          i,
        ),
      );
    }
  }

  // 5. Projects — one chunk per project
  if (profile.projects?.length) {
    for (let i = 0; i < profile.projects.length; i++) {
      const proj = profile.projects[i];
      const text = formatProject(proj);
      chunks.push(
        ...createTextChunks(
          text,
          "projects",
          resumeId,
          {
            name: proj.name || "",
          },
          i,
        ),
      );
    }
  }

  // 6. Personal info + contact as one chunk
  const contactText = formatContact(profile);
  if (contactText.trim()) {
    chunks.push(...createTextChunks(contactText, "contact", resumeId, {}));
  }

  return chunks;
}

/**
 * Chunk raw text (non-structured resume) into word-bounded pieces.
 * Falls back to paragraph/sentence splitting.
 */
export function chunkRawText(text: string, resumeId: string): ResumeChunk[] {
  if (!text?.trim()) return [];

  const paragraphs = text.split(/\n{2,}/);
  const chunks: ResumeChunk[] = [];
  let currentBlock = "";
  let chunkIndex = 0;

  for (const para of paragraphs) {
    const combined = currentBlock ? `${currentBlock}\n\n${para}` : para;
    const wordCount = countWords(combined);

    if (wordCount > MAX_CHUNK_WORDS && currentBlock) {
      // Flush current block
      chunks.push(makeChunk(currentBlock, "summary", resumeId, chunkIndex, {}));
      chunkIndex++;
      currentBlock = para;
    } else if (wordCount > MAX_CHUNK_WORDS) {
      // Single paragraph too long — sentence-split
      const sentenceChunks = splitBySentences(para, MAX_CHUNK_WORDS);
      for (const sc of sentenceChunks) {
        chunks.push(makeChunk(sc, "summary", resumeId, chunkIndex, {}));
        chunkIndex++;
      }
      currentBlock = "";
    } else {
      currentBlock = combined;
    }
  }

  if (currentBlock.trim()) {
    chunks.push(makeChunk(currentBlock, "summary", resumeId, chunkIndex, {}));
  }

  return chunks;
}

// ─── Formatting helpers ─────────────────────────────────────────────

function formatSkills(skills: Skill[]): string {
  const grouped: Record<string, string[]> = {};
  for (const s of skills) {
    const level = s.level || "Other";
    if (!grouped[level]) grouped[level] = [];
    grouped[level].push(s.name);
  }

  const lines: string[] = ["Skills:"];
  for (const [level, names] of Object.entries(grouped)) {
    lines.push(`${level}: ${names.join(", ")}`);
  }
  return lines.join("\n");
}

function formatExperience(exp: Experience): string {
  const parts = [
    `Role: ${exp.role || "Unknown Role"}`,
    `Company: ${exp.company || "Unknown Company"}`,
    `Period: ${exp.startDate || ""}${exp.endDate ? ` – ${exp.endDate}` : " – Present"}`,
  ];
  if (exp.description?.trim()) {
    parts.push(`Description: ${exp.description}`);
  }
  return parts.join("\n");
}

function formatEducation(edu: Education): string {
  const parts = [
    `Degree: ${edu.degree || "Unknown Degree"}`,
    `Institution: ${edu.institution || "Unknown Institution"}`,
    `Period: ${edu.startDate || ""}${edu.endDate ? ` – ${edu.endDate}` : ""}`,
  ];
  if (edu.description?.trim()) {
    parts.push(`Details: ${edu.description}`);
  }
  return parts.join("\n");
}

function formatProject(proj: Project): string {
  const parts = [`Project: ${proj.name || "Unnamed Project"}`];
  if (proj.url) parts.push(`URL: ${proj.url}`);
  if (proj.description?.trim()) parts.push(`Description: ${proj.description}`);
  if (proj.technologies?.length) {
    parts.push(`Technologies: ${proj.technologies.join(", ")}`);
  }
  return parts.join("\n");
}

function formatContact(profile: ResumeProfile): string {
  const parts: string[] = [];
  const pi = profile.personalInfo;
  if (pi) {
    if (pi.name) parts.push(`Name: ${pi.name}`);
    if (pi.title) parts.push(`Title: ${pi.title}`);
    if (pi.location) parts.push(`Location: ${pi.location}`);
    if (pi.linkedin) parts.push(`LinkedIn: ${pi.linkedin}`);
    if (pi.github) parts.push(`GitHub: ${pi.github}`);
  }
  const c = profile.contact;
  if (c) {
    if (c.email?.value) parts.push(`Email: ${c.email.value}`);
    if (c.phone?.value) parts.push(`Phone: ${c.phone.value}`);
  }
  return parts.length ? `Contact Information:\n${parts.join("\n")}` : "";
}

// ─── Core chunk creation ────────────────────────────────────────────

function createTextChunks(
  text: string,
  section: ResumeChunk["section"],
  resumeId: string,
  metadata: Record<string, string>,
  baseIndex: number = 0,
): ResumeChunk[] {
  const wordCount = countWords(text);

  if (wordCount <= MAX_CHUNK_WORDS) {
    return [makeChunk(text, section, resumeId, baseIndex, metadata)];
  }

  // Split long text by sentences to stay under MAX_CHUNK_WORDS
  const parts = splitBySentences(text, MAX_CHUNK_WORDS);
  return parts.map((part, i) =>
    makeChunk(part, section, resumeId, baseIndex * 100 + i, metadata),
  );
}

function makeChunk(
  text: string,
  section: ResumeChunk["section"],
  resumeId: string,
  index: number,
  metadata: Record<string, string>,
): ResumeChunk {
  return {
    id: `${resumeId}_${section}_${index}`,
    text: text.trim(),
    section,
    index,
    wordCount: countWords(text),
    metadata,
  };
}

function splitBySentences(text: string, maxWords: number): string[] {
  const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
  const parts: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const combined = current ? `${current} ${sentence}` : sentence;
    if (countWords(combined) > maxWords && current) {
      parts.push(current.trim());
      current = sentence;
    } else {
      current = combined;
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts.filter(
    (p) => countWords(p) >= MIN_CHUNK_WORDS || parts.length === 1,
  );
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
