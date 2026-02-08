import { ResumeTemplate } from "@/types";

export const editorialV1Template: ResumeTemplate = {
    id: "editorial-v1",
    name: "Editorial",
    description:
      "Magazine-style typography with Playfair Display serifs, multi-column layouts, and pull quotes. Perfect for executives and consultants.",
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
            description: "e.g. Chief Executive Officer",
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
        title: "Executive Summary",
        order: 2,
        fields: [
          {
            id: "summary",
            label: "Summary",
            type: "textarea",
            required: true,
            description: "Your career overview",
          },
        ],
      },
      {
        id: "experience",
        title: "Career Highlights",
        order: 3,
        fields: [
          {
            id: "experience",
            label: "Experience",
            type: "complex_list",
            required: true,
            description: "Leadership positions",
          },
        ],
      },
      {
        id: "projects",
        title: "Featured Work",
        order: 4,
        fields: [
          {
            id: "projects",
            label: "Projects",
            type: "complex_list",
            required: false,
            description: "Key achievements",
          },
        ],
      },
      {
        id: "skills",
        title: "Expertise Index",
        order: 5,
        fields: [
          {
            id: "skills",
            label: "Skills",
            type: "list",
            required: true,
            description: "Areas of expertise",
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
            description: "Academic credentials",
          },
        ],
      },
    ],
  };
