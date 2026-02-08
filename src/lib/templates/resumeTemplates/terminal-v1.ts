import { ResumeTemplate } from "@/types";

export const terminalV1Template: ResumeTemplate = {
    id: "terminal-v1",
    name: "Terminal",
    description:
      "Developer-focused VS Code theme with syntax highlighting and file tree navigation. Ideal for engineers and open-source contributors.",
    tier: "premium",
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
            description: "Your full name",
          },
          {
            id: "title",
            label: "Professional Title",
            type: "text",
            required: true,
            description: "e.g. Software Engineer",
          },
          {
            id: "email",
            label: "Email",
            type: "text",
            required: true,
            description: "Contact email",
          },
          {
            id: "github",
            label: "GitHub",
            type: "text",
            required: false,
            description: "GitHub profile URL",
          },
          {
            id: "location",
            label: "Location",
            type: "text",
            required: false,
            description: "City, State",
          },
        ],
      },
      {
        id: "summary",
        title: "README",
        order: 2,
        fields: [
          {
            id: "summary",
            label: "About",
            type: "textarea",
            required: true,
            description: "Your readme",
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
            description: "Git log",
          },
        ],
      },
      {
        id: "projects",
        title: "Projects",
        order: 4,
        fields: [
          {
            id: "projects",
            label: "Projects",
            type: "complex_list",
            required: false,
            description: "Repos",
          },
        ],
      },
      {
        id: "skills",
        title: "Dependencies",
        order: 5,
        fields: [
          {
            id: "skills",
            label: "Skills",
            type: "list",
            required: true,
            description: "package.json",
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
            description: "Degrees",
          },
        ],
      },
    ],
  };
