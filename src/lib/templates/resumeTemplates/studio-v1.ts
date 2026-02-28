import { ResumeTemplate } from "@/types";

export const studioV1Template: ResumeTemplate = {
  id: "studio-v1",
  name: "Studio",
  description:
    "Creative editorial template with modular project storytelling and portfolio-forward hierarchy.",
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
          label: "Creative Title",
          type: "text",
          required: true,
          description: "e.g. Product Designer",
        },
        {
          id: "email",
          label: "Email",
          type: "text",
          required: true,
          description: "Primary email",
        },
        {
          id: "portfolio",
          label: "Portfolio",
          type: "text",
          required: false,
          description: "Portfolio link",
        },
      ],
    },
    {
      id: "projects",
      title: "Spotlight Projects",
      order: 2,
      fields: [
        {
          id: "projects",
          label: "Projects",
          type: "complex_list",
          required: true,
          description: "Featured projects and case studies",
        },
      ],
    },
    {
      id: "summary",
      title: "Creative Statement",
      order: 3,
      fields: [
        {
          id: "summary",
          label: "Statement",
          type: "textarea",
          required: true,
          description: "Design/creative philosophy and strengths",
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
          description: "Professional experience",
        },
      ],
    },
    {
      id: "skills",
      title: "Toolkit",
      order: 5,
      fields: [
        {
          id: "skills",
          label: "Toolkit",
          type: "list",
          required: true,
          description: "Creative and technical tools",
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
          required: false,
          description: "Education and training",
        },
      ],
    },
  ],
};
