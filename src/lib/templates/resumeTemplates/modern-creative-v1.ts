import { ResumeTemplate } from "@/types";

export const modernCreativeV1Template: ResumeTemplate = {
    id: "modern-creative-v1",
    name: "Modern Creative",
    description:
      "A stylish template that highlights skills and projects, perfect for designers and developers.",
    sections: [
      {
        id: "personal_info",
        title: "Personal Information",
        order: 1,
        fields: [
          {
            id: "name",
            label: "Full Name",
            type: "text",
            required: true,
            description: "Your full legal name",
          },
          {
            id: "title",
            label: "Creative Role",
            type: "text",
            required: true,
            description: "e.g. UI/UX Designer",
          },
          {
            id: "email",
            label: "Email",
            type: "text",
            required: true,
            description: "Contact email address",
          },
          {
            id: "portfolio",
            label: "Portfolio URL",
            type: "text",
            required: false,
            description: "Link to your portfolio",
          },
        ],
      },
      {
        id: "skills",
        title: "Core Competencies",
        order: 2,
        fields: [
          {
            id: "skills",
            label: "Skills",
            type: "list",
            required: true,
            description: "List of technical and creative skills",
          },
        ],
      },
      {
        id: "projects",
        title: "Featured Projects",
        order: 3,
        fields: [
          {
            id: "projects",
            label: "Projects",
            type: "complex_list",
            required: true,
            description: "Showcase your best work",
          },
        ],
      },
      {
        id: "experience",
        title: "Work History",
        order: 4,
        fields: [
          {
            id: "experience",
            label: "Experience",
            type: "complex_list",
            required: true,
            description: "Your work history",
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
            description: "Your educational background",
          },
        ],
      },
    ],
  };
