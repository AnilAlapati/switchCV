/**
 * Gemini Function-Calling Tool Definitions for Resume Chat (v3)
 *
 * These tools replace free-text extraction with typed function calls.
 * The model calls tools as it converses — no ambiguity between intent and content.
 */

import type { GeminiFunctionDeclaration } from "@/types/ai";
import type { ConversationManager } from "./conversationManager";

// ==================== TOOL DECLARATIONS ====================

export const RESUME_TOOL_DECLARATIONS: GeminiFunctionDeclaration[] = [
  {
    name: "set_contact_info",
    description:
      "Store the user's personal contact information. Call this whenever the user provides their name, email, phone, location, GitHub, LinkedIn, or Twitter/X.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "User's full name" },
        email: {
          type: "string",
          description: "Contact email address",
        },
        phone: { type: "string", description: "Phone number (optional)" },
        location: {
          type: "string",
          description: "City or country (optional)",
        },
        github: {
          type: "string",
          description: "GitHub profile URL (optional)",
        },
        linkedin: {
          type: "string",
          description: "LinkedIn profile URL (optional)",
        },
        twitter: {
          type: "string",
          description: "X/Twitter profile URL (optional)",
        },
      },
    },
  },
  {
    name: "set_summary",
    description:
      "Store the user's professional summary or career objective. Call this when the user describes what they do, their professional background, or career goals.",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "Professional summary or objective statement",
        },
      },
      required: ["summary"],
    },
  },
  {
    name: "add_experience",
    description:
      "Add a work experience entry. Call this when the user describes a job, role, or position they have held.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Job title or role" },
        company: {
          type: "string",
          description: "Company or organisation name",
        },
        duration: {
          type: "string",
          description:
            "Employment duration, e.g. 'Jan 2021 – Present' or '2 years'",
        },
        description: {
          type: "string",
          description: "Key responsibilities or role description",
        },
        achievements: {
          type: "string",
          description:
            "Notable achievements in this role (optional, comma-separated or narrative)",
        },
      },
      required: ["title", "company", "duration", "description"],
    },
  },
  {
    name: "add_education",
    description:
      "Add an education entry. Call this when the user mentions a degree, qualification, school, university, or college.",
    parameters: {
      type: "object",
      properties: {
        degree: {
          type: "string",
          description:
            "Degree type, e.g. 'B.Tech Computer Science' or 'Class XII'",
        },
        institution: {
          type: "string",
          description: "School, college, or university name",
        },
        year: {
          type: "string",
          description:
            "Graduation year or date range, e.g. '2019' or '2015–2019'",
        },
        major: {
          type: "string",
          description: "Field of study or specialisation (optional)",
        },
        gpa: {
          type: "string",
          description:
            "Grade, GPA, CGPA, or percentage exactly as stated (optional)",
        },
      },
      required: ["degree", "institution", "year"],
    },
  },
  {
    name: "set_skills",
    description:
      "Store or replace the user's skill list. Call this when the user lists technologies, languages, tools, or competencies.",
    parameters: {
      type: "object",
      properties: {
        skills: {
          type: "string",
          description:
            "Comma-separated list of skills, e.g. 'Python, React, SQL, Docker'",
        },
      },
      required: ["skills"],
    },
  },
  {
    name: "mark_complete",
    description:
      "Signal that enough information has been collected to generate the resume. Only call this when the user explicitly asks to create/generate/finalize the resume AND at least name, email, and a summary have been provided.",
    parameters: {
      type: "object",
      properties: {
        confirmation_message: {
          type: "string",
          description:
            "A brief confirmation message to display to the user before generation begins",
        },
      },
      required: ["confirmation_message"],
    },
  },
];

// ==================== TOOL CALL DISPATCHER ====================

/**
 * Apply a single tool call from the model to the ConversationManager.
 * Returns true if the tool call signalled completion (mark_complete).
 */
export function applyToolCall(
  manager: ConversationManager,
  toolName: string,
  args: Record<string, unknown>,
): boolean {
  switch (toolName) {
    case "set_contact_info": {
      const contact: Record<string, string> = {};
      if (args.name) contact.name = String(args.name);
      if (args.email) contact.email = String(args.email);
      if (args.phone) contact.phone = String(args.phone);
      if (args.location) contact.location = String(args.location);
      if (args.github) contact.github = String(args.github);
      if (args.linkedin) contact.linkedin = String(args.linkedin);
      if (args.twitter) contact.twitter = String(args.twitter);
      if (Object.keys(contact).length > 0) manager.updateData(contact);
      break;
    }
    case "set_summary": {
      if (args.summary) manager.updateData({ summary: String(args.summary) });
      break;
    }
    case "add_experience": {
      const entry = {
        title: String(args.title ?? ""),
        company: String(args.company ?? ""),
        duration: String(args.duration ?? ""),
        description: String(args.description ?? ""),
        achievements: args.achievements
          ? String(args.achievements)
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      };
      manager.updateData({ experience: [entry] });
      break;
    }
    case "add_education": {
      const entry = {
        degree: String(args.degree ?? ""),
        institution: String(args.institution ?? ""),
        year: String(args.year ?? ""),
        major: args.major ? String(args.major) : undefined,
        gpa: args.gpa ? String(args.gpa) : undefined,
      };
      manager.updateData({ education: [entry] });
      break;
    }
    case "set_skills": {
      if (args.skills) {
        const skills = String(args.skills)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (skills.length > 0) manager.updateData({ skills });
      }
      break;
    }
    case "mark_complete": {
      manager.markAsComplete();
      return true;
    }
  }
  return false;
}
