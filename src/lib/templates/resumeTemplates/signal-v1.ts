import { ResumeTemplate } from "@/types";

export const signalV1Template: ResumeTemplate = {
  id: "signal-v1",
  name: "Signal",
  description:
    "Engineering-first launch template focused on impact bullets, technical stack clusters, and fast recruiter scanning.",
  tier: "free",
  sections: [
    {
      id: "personal_info",
      title: "Contact",
      order: 1,
      fields: [
        {
          id: "name",
          label: "Name",
          type: "text",
          required: true,
          description: "Full name",
        },
        {
          id: "title",
          label: "Target Role",
          type: "text",
          required: true,
          description: "e.g. Senior Backend Engineer",
        },
        {
          id: "email",
          label: "Email",
          type: "text",
          required: true,
          description: "Primary email",
        },
        {
          id: "location",
          label: "Location",
          type: "text",
          required: false,
          description: "City, Region",
        },
        {
          id: "linkedin",
          label: "LinkedIn",
          type: "text",
          required: false,
          description: "LinkedIn URL",
        },
        {
          id: "github",
          label: "GitHub",
          type: "text",
          required: false,
          description: "GitHub URL",
        },
      ],
    },
    {
      id: "summary",
      title: "Signal Summary",
      order: 2,
      fields: [
        {
          id: "summary",
          label: "Summary",
          type: "textarea",
          required: true,
          description: "Evidence-backed impact summary",
        },
      ],
    },
    {
      id: "skills",
      title: "Core Stack",
      order: 3,
      fields: [
        {
          id: "skills",
          label: "Skills",
          type: "list",
          required: true,
          description: "Technical stack and tools",
        },
      ],
    },
    {
      id: "experience",
      title: "Experience",
      order: 4,
      fields: [
        {
          id: "experience",
          label: "Experience",
          type: "complex_list",
          required: true,
          description: "Impact-first work history",
        },
      ],
    },
    {
      id: "projects",
      title: "Selected Projects",
      order: 5,
      fields: [
        {
          id: "projects",
          label: "Projects",
          type: "complex_list",
          required: false,
          description: "High-value engineering projects",
        },
      ],
    },
    {
      id: "education",
      title: "Education",
      order: 6,
      fields: [
        {
          id: "education",
          label: "Education",
          type: "complex_list",
          required: true,
          description: "Education and credentials",
        },
      ],
    },
  ],
};
