import { ResumeTemplate } from "@/types";

export const atlasV1Template: ResumeTemplate = {
  id: "atlas-v1",
  name: "Atlas",
  description:
    "Two-column layout with a navy sidebar. Clean and professional — ideal for engineers, analysts, and finance roles.",
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
          label: "Title",
          type: "text",
          required: false,
          description: "Role title",
        },
        {
          id: "email",
          label: "Email",
          type: "text",
          required: true,
          description: "Primary email",
        },
        {
          id: "phone",
          label: "Phone",
          type: "text",
          required: false,
          description: "Phone number",
        },
        {
          id: "location",
          label: "Location",
          type: "text",
          required: false,
          description: "City, Country",
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
      title: "Summary",
      order: 2,
      fields: [
        {
          id: "summary",
          label: "Summary",
          type: "textarea",
          required: true,
          description: "Professional summary",
        },
      ],
    },
    {
      id: "experience",
      title: "Experience",
      order: 3,
      fields: [
        {
          id: "experience",
          label: "Experience",
          type: "complex_list",
          required: true,
          description: "Work history",
        },
      ],
    },
    {
      id: "skills",
      title: "Skills",
      order: 4,
      fields: [
        {
          id: "skills",
          label: "Skills",
          type: "list",
          required: true,
          description: "Technical and soft skills",
        },
      ],
    },
    {
      id: "education",
      title: "Education",
      order: 5,
      fields: [
        {
          id: "education",
          label: "Education",
          type: "complex_list",
          required: true,
          description: "Degrees and certifications",
        },
      ],
    },
  ],
};
