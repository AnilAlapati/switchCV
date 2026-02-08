import { ResumeTemplate } from "@/types";

export const executiveV1Template: ResumeTemplate = {
    id: "executive-v1",
    name: "Executive Leadership",
    description: "Focused on leadership experience and strategic impact.",
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
            description: "Full Name",
          },
          {
            id: "title",
            label: "Current Title",
            type: "text",
            required: true,
            description: "e.g. Chief Technology Officer",
          },
          {
            id: "email",
            label: "Email",
            type: "text",
            required: true,
            description: "Email",
          },
          {
            id: "linkedin",
            label: "LinkedIn",
            type: "text",
            required: false,
            description: "LinkedIn Profile URL",
          },
        ],
      },
      {
        id: "summary",
        title: "Executive Summary",
        order: 2,
        fields: [
          {
            id: "summary",
            label: "Summary",
            type: "textarea",
            required: true,
            description:
              "High-level overview of leadership philosophy and achievements",
          },
        ],
      },
      {
        id: "experience",
        title: "Professional Experience",
        order: 3,
        fields: [
          {
            id: "experience",
            label: "Experience",
            type: "complex_list",
            required: true,
            description: "Detailed work history with focus on impact",
          },
        ],
      },
      {
        id: "education",
        title: "Education & Credentials",
        order: 4,
        fields: [
          {
            id: "education",
            label: "Education",
            type: "complex_list",
            required: true,
            description: "Degrees and Certifications",
          },
        ],
      },
      {
        id: "skills",
        title: "Strategic Areas",
        order: 5,
        fields: [
          {
            id: "skills",
            label: "Areas of Expertise",
            type: "list",
            required: false,
            description: "Key strategic skills",
          },
        ],
      },
    ],
  };
