import { ResumeTemplate } from "@/types";

export const velocityV1Template: ResumeTemplate = {
  id: "velocity-v1",
  name: "Velocity",
  description:
    "Bold dark header with a green accent and timeline-marker experience section. Built for software engineers and technical leaders.",
  tier: "premium",
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
          id: "github",
          label: "GitHub",
          type: "text",
          required: false,
          description: "GitHub URL",
        },
        {
          id: "linkedin",
          label: "LinkedIn",
          type: "text",
          required: false,
          description: "LinkedIn URL",
        },
      ],
    },
    {
      id: "summary",
      title: "About",
      order: 2,
      fields: [
        {
          id: "summary",
          label: "About",
          type: "textarea",
          required: true,
          description: "Engineering-focused summary",
        },
      ],
    },
    {
      id: "skills",
      title: "Tech Stack",
      order: 3,
      fields: [
        {
          id: "skills",
          label: "Tech Stack",
          type: "list",
          required: true,
          description: "Languages, frameworks, tools",
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
          description: "Engineering roles and impact",
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
