/**
 * Tests for RAG Chunking Service
 */

import { chunkResume, chunkRawText, countWords } from "../rag/chunkingService";
import type { ResumeProfile } from "@/types";

// ─── Test fixtures ──────────────────────────────────────────────────

const mockProfile: ResumeProfile = {
  versionId: "v1",
  templateId: "default",
  title: "Senior Software Engineer",
  summary:
    "Experienced software engineer with 8 years of experience in full-stack development. " +
    "Specialized in React, TypeScript, and Node.js. Led teams of 5-10 engineers. " +
    "Delivered projects that increased revenue by 25% at multiple companies.",
  skills: [
    { name: "TypeScript", level: "Expert", visibility: "public" },
    { name: "React", level: "Expert", visibility: "public" },
    { name: "Node.js", level: "Advanced", visibility: "public" },
    { name: "Python", level: "Intermediate", visibility: "public" },
    { name: "AWS", level: "Advanced", visibility: "public" },
  ],
  experience: [
    {
      company: "TechCorp Inc",
      role: "Senior Software Engineer",
      startDate: "2021-01",
      endDate: "2024-03",
      description:
        "Led a team of 8 engineers building a real-time analytics platform. " +
        "Designed microservices architecture using Node.js and Kubernetes. " +
        "Reduced API response time by 40% through caching strategies. " +
        "Mentored 3 junior engineers to mid-level within 18 months.",
      visibility: "public",
    },
    {
      company: "StartupXYZ",
      role: "Full Stack Developer",
      startDate: "2018-06",
      endDate: "2020-12",
      description:
        "Built the entire frontend using React and TypeScript from scratch. " +
        "Implemented CI/CD pipeline that reduced deployment time from 2 hours to 15 minutes.",
      visibility: "public",
    },
  ],
  education: [
    {
      institution: "MIT",
      degree: "M.S. Computer Science",
      startDate: "2016",
      endDate: "2018",
      description: "Focus on distributed systems and machine learning.",
      visibility: "public",
    },
  ],
  projects: [
    {
      name: "OpenSourceLib",
      description:
        "A popular open-source TypeScript utility library with 5k GitHub stars.",
      technologies: ["TypeScript", "Jest", "GitHub Actions"],
      visibility: "public",
    },
  ],
  contact: {
    email: { value: "john@example.com", visibility: "public" },
    phone: { value: "+1-555-0123", visibility: "masked" },
  },
  personalInfo: {
    name: "John Doe",
    title: "Senior Software Engineer",
    location: "San Francisco, CA",
    linkedin: "linkedin.com/in/johndoe",
    github: "github.com/johndoe",
  },
  generatedText: {
    draft: "",
    polished: "",
    lastGeneratedAt: "",
  },
  slug: "john-doe-senior-engineer",
  lastUpdatedAt: "2024-03-15",
};

const emptyProfile: ResumeProfile = {
  versionId: "v1",
  title: "",
  summary: "",
  skills: [],
  experience: [],
  education: [],
  projects: [],
  contact: {
    email: { value: "", visibility: "public" },
  },
  generatedText: { draft: "", polished: "", lastGeneratedAt: "" },
  slug: "",
  lastUpdatedAt: "",
};

// ─── Tests ──────────────────────────────────────────────────────────

describe("chunkResume", () => {
  it("produces chunks for each section of a complete resume", () => {
    const chunks = chunkResume(mockProfile, "resume-123");

    expect(chunks.length).toBeGreaterThan(0);

    // Should have chunks from different sections
    const sections = new Set(chunks.map((c) => c.section));
    expect(sections).toContain("summary");
    expect(sections).toContain("skills");
    expect(sections).toContain("experience");
    expect(sections).toContain("education");
    expect(sections).toContain("projects");
    expect(sections).toContain("contact");
  });

  it("creates one chunk per experience entry", () => {
    const chunks = chunkResume(mockProfile, "resume-123");
    const expChunks = chunks.filter((c) => c.section === "experience");

    expect(expChunks.length).toBe(2);
    expect(expChunks[0].metadata.company).toBe("TechCorp Inc");
    expect(expChunks[1].metadata.company).toBe("StartupXYZ");
  });

  it("includes metadata for each chunk", () => {
    const chunks = chunkResume(mockProfile, "resume-123");

    const skillChunk = chunks.find((c) => c.section === "skills");
    expect(skillChunk?.metadata.count).toBe("5");

    const eduChunk = chunks.find((c) => c.section === "education");
    expect(eduChunk?.metadata.institution).toBe("MIT");
    expect(eduChunk?.metadata.degree).toBe("M.S. Computer Science");
  });

  it("generates unique IDs for each chunk", () => {
    const chunks = chunkResume(mockProfile, "resume-123");
    const ids = chunks.map((c) => c.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
  });

  it("each chunk has a wordCount", () => {
    const chunks = chunkResume(mockProfile, "resume-123");

    for (const chunk of chunks) {
      expect(chunk.wordCount).toBeGreaterThan(0);
      expect(chunk.wordCount).toBe(countWords(chunk.text));
    }
  });

  it("returns empty array for empty profile", () => {
    const chunks = chunkResume(emptyProfile, "resume-empty");
    expect(chunks).toEqual([]);
  });

  it("handles profile with only summary", () => {
    const partial = {
      ...emptyProfile,
      summary: "A brief summary of my career.",
    };
    const chunks = chunkResume(partial, "resume-partial");

    expect(chunks.length).toBe(1);
    expect(chunks[0].section).toBe("summary");
    expect(chunks[0].text).toContain("brief summary");
  });

  it("preserves text content without truncation for normal-sized sections", () => {
    const chunks = chunkResume(mockProfile, "resume-123");
    const summaryChunk = chunks.find((c) => c.section === "summary");

    expect(summaryChunk?.text).toContain("8 years of experience");
    expect(summaryChunk?.text).toContain("25%");
  });
});

describe("chunkRawText", () => {
  it("chunks a short text into a single chunk", () => {
    const text = "This is a short resume text that should be a single chunk.";
    const chunks = chunkRawText(text, "raw-1");

    expect(chunks.length).toBe(1);
    expect(chunks[0].text).toBe(text);
    expect(chunks[0].section).toBe("summary");
  });

  it("splits long text into multiple chunks", () => {
    // Generate text longer than 500 words
    const paragraphs = Array(10)
      .fill(
        "This is a paragraph with enough words to test chunking behavior. " +
          "It contains multiple sentences about various topics. " +
          "The paragraph discusses technology, engineering, and software development. " +
          "Each paragraph is designed to be over fifty words for testing purposes. " +
          "We need enough content to trigger the splitting logic in the chunking service.",
      )
      .join("\n\n");

    const chunks = chunkRawText(paragraphs, "raw-long");
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("returns empty array for empty text", () => {
    expect(chunkRawText("", "raw-empty")).toEqual([]);
    expect(chunkRawText("  ", "raw-whitespace")).toEqual([]);
  });
});

describe("countWords", () => {
  it("counts words correctly", () => {
    expect(countWords("hello world")).toBe(2);
    expect(countWords("one")).toBe(1);
    expect(countWords("  spaced   out  words  ")).toBe(3);
    expect(countWords("")).toBe(0);
  });
});
