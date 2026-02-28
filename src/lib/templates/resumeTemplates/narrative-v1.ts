import { ResumeTemplate } from "@/types";

export const narrativeV1Template: ResumeTemplate = {
  id: "narrative-v1",
  name: "Narrative",
  description:
    "Leadership and product-oriented template that emphasizes career arc, ownership, and outcomes.",
  tier: "premium",
  sections: [
    {
      id: "personal_info",
      title: "Profile",
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
          label: "Headline",
          type: "text",
          required: true,
          description: "Leadership-focused role title",
        },
        {
          id: "email",
          label: "Email",
          type: "text",
          required: true,
          description: "Primary email",
        },
        {
          id: "linkedin",
          label: "LinkedIn",
          type: "text",
          required: false,
          description: "LinkedIn profile URL",
        },
      ],
    },
    {
      id: "summary",
      title: "Career Narrative",
      order: 2,
      fields: [
        {
          id: "summary",
          label: "Narrative Summary",
          type: "textarea",
          required: true,
          description: "Story of progression, scope, and impact",
        },
      ],
    },
    {
      id: "experience",
      title: "Leadership Experience",
      order: 3,
      fields: [
        {
          id: "experience",
          label: "Experience",
          type: "complex_list",
          required: true,
          description: "Roles with ownership and outcomes",
        },
      ],
    },
    {
      id: "skills",
      title: "Capabilities",
      order: 4,
      fields: [
        {
          id: "skills",
          label: "Capabilities",
          type: "list",
          required: true,
          description: "Leadership and domain capabilities",
        },
      ],
    },
    {
      id: "projects",
      title: "Initiatives",
      order: 5,
      fields: [
        {
          id: "projects",
          label: "Initiatives",
          type: "complex_list",
          required: false,
          description: "Strategic cross-functional initiatives",
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
          description: "Education and certifications",
        },
      ],
    },
  ],
};
