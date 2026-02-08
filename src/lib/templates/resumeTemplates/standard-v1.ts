import { ResumeTemplate } from "@/types";

export const standardV1Template: ResumeTemplate = {
    id: "standard-v1",
    name: "Standard Professional",
    description:
      "A clean, professional resume template suitable for most industries.",
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
            label: "Professional Title",
            type: "text",
            required: true,
            description: "e.g. Senior Software Engineer",
          },
          {
            id: "email",
            label: "Email",
            type: "text",
            required: true,
            description: "Contact email address",
          },
          {
            id: "phone",
            label: "Phone",
            type: "text",
            required: false,
            description: "Contact phone number",
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
        title: "Professional Summary",
        order: 2,
        fields: [
          {
            id: "summary",
            label: "Summary",
            type: "textarea",
            required: true,
            description: "A brief overview of your career and goals",
          },
        ],
      },
      {
        id: "experience",
        title: "Work Experience",
        order: 3,
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
        id: "projects",
        title: "Projects",
        order: 4,
        fields: [
          {
            id: "projects",
            label: "Projects",
            type: "complex_list",
            required: false,
            description: "Key projects you have worked on",
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
            description: "List of professional skills",
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
            description: "Your educational background",
          },
        ],
      },
    ],
  };
