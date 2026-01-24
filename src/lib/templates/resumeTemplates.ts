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
  {
    id: "masonry-v1",
    name: "Masonry Portfolio",
    description:
      "A dynamic, grid-based layout inspired by modern portfolio sites.",
    sections: [
      {
        id: "personal_info",
        title: "Profile",
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
            label: "Role",
            type: "text",
            required: true,
            description: "e.g. Product Designer",
          },
          {
            id: "email",
            label: "Email",
            type: "text",
            required: true,
            description: "Contact email address",
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
            description: "A brief bio or philosophy",
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
            label: "Showcase",
            type: "complex_list",
            required: true,
            description: "Featured work",
          },
        ],
      },
      {
        id: "skills",
        title: "Stack",
        order: 5,
        fields: [
          {
            id: "skills",
            label: "Skills",
            type: "list",
            required: true,
            description: "Core technologies",
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
            description: "Degrees",
          },
        ],
      },
    ],
  },
  // === PREMIUM TEMPLATES ===
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
];
