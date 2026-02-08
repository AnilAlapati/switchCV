import { ResumeTemplate } from "@/types";

export const noirV1Template: ResumeTemplate = {
    id: "noir-v1",
    name: "Noir",
    description:
      "Dark luxury aesthetic with pure black background, gradient accent glows, and premium typography. The ultimate VIP template.",
    tier: "enterprise",
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
            description: "e.g. Founder & CEO",
          },
          {
            id: "email",
            label: "Email",
            type: "text",
            required: true,
            description: "Contact email",
          },
          {
            id: "linkedIn",
            label: "LinkedIn",
            type: "text",
            required: false,
            description: "LinkedIn profile URL",
          },
          {
            id: "location",
            label: "Location",
            type: "text",
            required: false,
            description: "City, Country",
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
            description: "Your story",
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
            description: "Career journey",
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
            description: "Notable projects",
          },
        ],
      },
      {
        id: "skills",
        title: "Expertise",
        order: 5,
        fields: [
          {
            id: "skills",
            label: "Skills",
            type: "list",
            required: true,
            description: "Core competencies",
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
            description: "Academic background",
          },
        ],
      },
    ],
  };
