import { DashboardResume } from "@/types";

export const diverseDemoResumes10: Record<string, DashboardResume> = {
  "22": {
    id: "demo-fullstack-portfolio",
    versionId: "v1",
    title: "Full Stack Developer",
    slug: "raj-portfolio",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Raj Patel",
      title: "Full Stack Developer",
      email: "raj.patel@example.com",
      location: "Ahmedabad",
      linkedin: "linkedin.com/in/rajpatel",
      github: "github.com/rajpatel",
    },
    contact: {
      email: { value: "raj.patel@example.com", visibility: "public" },
    },
    summary:
      "Full stack developer passionate about building beautiful, functional web applications. Open source contributor with projects used by 10K+ developers.",
    experience: [
      {
        id: "exp-1",
        company: "Freelance",
        role: "Full Stack Developer",
        startDate: "2022-01",
        endDate: "Present",
        description: "Building web apps for startups and small businesses.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Gujarat University",
        degree: "B.Tech Computer Engineering",
        startDate: "2018",
        endDate: "2022",
        visibility: "public",
      },
    ],
    skills: [
      { id: "s1", name: "React", level: "Expert", visibility: "public" },
      { id: "s2", name: "Node.js", level: "Expert", visibility: "public" },
      { id: "s3", name: "TypeScript", level: "Advanced", visibility: "public" },
      { id: "s4", name: "PostgreSQL", level: "Advanced", visibility: "public" },
      { id: "s5", name: "Docker", level: "Intermediate", visibility: "public" },
      { id: "s6", name: "AWS", level: "Intermediate", visibility: "public" },
      {
        id: "s7",
        name: "GraphQL",
        level: "Intermediate",
        visibility: "public",
      },
      { id: "s8", name: "Tailwind CSS", level: "Expert", visibility: "public" },
    ],
    projects: [
      {
        id: "p1",
        name: "TaskFlow",
        description:
          "Open-source project management tool with Kanban boards, time tracking, and team collaboration. 3K GitHub stars.",
        technologies: ["React", "Node.js", "PostgreSQL", "Socket.io"],
        url: "github.com/rajpatel/taskflow",
        visibility: "public",
      },
      {
        id: "p2",
        name: "DevDash",
        description:
          "Developer dashboard aggregating GitHub activity, CI/CD status, and deployment metrics. 1.5K weekly active users.",
        technologies: ["Next.js", "GraphQL", "Redis"],
        url: "devdash.io",
        visibility: "public",
      },
      {
        id: "p3",
        name: "FormBuilder Pro",
        description:
          "Drag-and-drop form builder with validation, conditional logic, and integrations. Used by 50+ SaaS companies.",
        technologies: ["React", "TypeScript", "Firebase"],
        url: "formbuilder.pro",
        visibility: "public",
      },
      {
        id: "p4",
        name: "CLI Toolkit",
        description:
          "Collection of developer CLI tools for boilerplate generation, database migrations, and API testing. 5K npm downloads/month.",
        technologies: ["Node.js", "Commander.js"],
        url: "npmjs.com/cli-toolkit",
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  "23": {
    id: "demo-pm-bento",
    versionId: "v1",
    title: "Senior Product Manager",
    slug: "arya-sharma",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Arya Sharma",
      title: "Senior Product Manager",
      email: "arya.sharma@example.com",
      phone: "+91 98765 43210",
      location: "Bangalore, India",
      linkedin: "linkedin.com/in/aryasharma",
    },
    contact: {
      email: { value: "arya.sharma@example.com", visibility: "public" },
    },
    summary:
      "Product leader with 6 years experience building consumer products at scale. Shipped features to 50M+ users at Swiggy and Flipkart. Passionate about user research, data-driven decisions, and building products that solve real problems.",
    experience: [
      {
        id: "exp-1",
        company: "Swiggy",
        role: "Senior Product Manager",
        startDate: "2022-03",
        endDate: "Present",
        description:
          "Lead product strategy for Swiggy Instamart's discovery experience (15M MAU). Launched personalized recommendations driving 35% GMV lift. Built and mentored team of 3 PMs.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "Flipkart",
        role: "Product Manager",
        startDate: "2019-07",
        endDate: "2022-02",
        description:
          "Owned checkout & payments for Flipkart Plus loyalty program (8M subscribers). Reduced cart abandonment by 22% through UX improvements. Launched 'Pay Later' feature with 40% adoption.",
        visibility: "public",
      },
      {
        id: "exp-3",
        company: "Housing.com",
        role: "Associate Product Manager",
        startDate: "2018-01",
        endDate: "2019-06",
        description:
          "Built rental search features from 0→1. Improved search-to-lead conversion by 18% through A/B testing.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "IIM Bangalore",
        degree: "MBA - Product Management",
        startDate: "2016",
        endDate: "2018",
        visibility: "public",
      },
      {
        id: "edu-2",
        institution: "BITS Pilani",
        degree: "B.E. Computer Science",
        startDate: "2012",
        endDate: "2016",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Product Strategy",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s2",
        name: "User Research",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s3",
        name: "A/B Testing",
        level: "Advanced",
        visibility: "public",
      },
      { id: "s4", name: "SQL", level: "Advanced", visibility: "public" },
      { id: "s5", name: "Figma", level: "Intermediate", visibility: "public" },
      {
        id: "s6",
        name: "Data Analysis",
        level: "Advanced",
        visibility: "public",
      },
      { id: "s7", name: "Roadmapping", level: "Expert", visibility: "public" },
    ],
    projects: [
      {
        id: "p1",
        name: "Instamart Personalization",
        description:
          "Built ML-powered product recommendations for grocery. 35% increase in basket size, 20% lift in repeat orders.",
        technologies: ["ML", "Experimentation", "Data Analysis"],
        visibility: "public",
      },
      {
        id: "p2",
        name: "Flipkart Pay Later",
        description:
          "0→1 BNPL product for checkout. 2M activations in first 6 months, 40% adoption rate among eligible users.",
        technologies: ["Fintech", "Risk Modeling", "UX Research"],
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },
};
