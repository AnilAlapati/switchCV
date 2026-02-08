import { ResumeTemplate } from "@/types";

export const bentoV1Template: ResumeTemplate = {
    id: "bento-v1",
    name: "Bento",
    description:
      "Apple-inspired modular grid layout with animated cards and modern aesthetics. Perfect for product managers and designers.",
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
            description: "e.g. Product Manager",
          },
          {
            id: "email",
            label: "Email",
            type: "text",
            required: true,
            description: "Contact email",
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
        title: "About",
        order: 2,
        fields: [
          {
            id: "summary",
            label: "Summary",
            type: "textarea",
            required: true,
            description: "Brief overview",
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
        id: "projects",
        title: "Projects",
        order: 4,
        fields: [
          {
            id: "projects",
            label: "Projects",
            type: "complex_list",
            required: false,
            description: "Key projects",
          },
        ],
      },
      {
        id: "skills",
        title: "Skills",
        order: 5,
        fields: [
          {
            id: "skills",
            label: "Skills",
            type: "list",
            required: true,
            description: "Core skills",
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
