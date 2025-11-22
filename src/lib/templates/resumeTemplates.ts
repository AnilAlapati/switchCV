/* eslint-disable max-lines */
import { ResumeTemplate } from "@/types";

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  {
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
  },
  {
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
  },
  {
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
  },
];
