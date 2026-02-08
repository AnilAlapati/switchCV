import { ResumeTemplate } from "@/types";

export const masonryV1Template: ResumeTemplate = {
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
  };
