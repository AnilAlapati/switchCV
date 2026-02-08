import { DashboardResume } from "@/types";

export const diverseDemoResumes1: Record<string, DashboardResume> = {
  "1": {
    id: "demo-anil-a",
    versionId: "v1",
    title: "Senior Software Engineer / Team Lead",
    slug: "anil-a",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Anil A.",
      title: "Senior Software Engineer / Team Lead",
      email: "anil.a@example.com",
      phone: "+91 90000 00000",
      location: "Hyderabad, India",
      linkedin: "linkedin.com/in/anil-a-dev",
      github: "github.com/anil-a-dev",
    },
    contact: {
      email: { value: "anil.a@example.com", visibility: "public" },
      phone: { value: "+91 90000 00000", visibility: "public" },
    },
    summary:
      "Accomplished Senior Software Engineer and Team Lead targeting a Staff-level product development role. Proven leader in designing and delivering large-scale automation and reliability platforms. Drove a 40% reduction in manual operational work by building a foundational, event-driven system, shifting the organization from reactive firefighting to proactive, data-driven development.",
    experience: [
      {
        id: "exp-1",
        company: "Company XYZ",
        role: "Senior Software Engineer / Team Lead",
        startDate: "2021-01",
        endDate: "Present",
        description:
          "Led the end-to-end design and delivery of a reliability and automation platform to reduce operational friction and improve decision-making.\n• Architected a modular, event-driven system with standardized APIs and robust observability into system health and usage patterns.\n• Mentored a team of 5 engineers and drove sprint planning and technical direction.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "Tech Solutions Pvt. Ltd.",
        role: "Software Engineer II",
        startDate: "2018-06",
        endDate: "2020-12",
        description:
          "Developed and maintained microservices for a high-traffic e-commerce platform serving 2M+ users.\n• Reduced API latency by 50% through caching strategies and query optimization.\n• Implemented CI/CD pipelines reducing deployment time from hours to minutes.",
        visibility: "public",
      },
      {
        id: "exp-3",
        company: "StartupHub India",
        role: "Full Stack Developer",
        startDate: "2016-07",
        endDate: "2018-05",
        description:
          "Built MVPs for multiple fintech products using React and Node.js.\n• Scaled user base from 0 to 50,000 in the first year through rapid feature iteration.\n• Integrated multiple payment gateways including Razorpay and PayU.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Jawaharlal Nehru Technological University (JNTU)",
        degree: "Bachelor of Technology (B.Tech)",
        startDate: "2012",
        endDate: "2016",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "System Design",
        level: "Expert",
        visibility: "public",
      },
      { id: "s2", name: "Automation", level: "Expert", visibility: "public" },
      {
        id: "s3",
        name: "API Development",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s4",
        name: "Observability",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s5",
        name: "Team Leadership",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s6",
        name: "React & Next.js",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s7",
        name: "Node.js & TypeScript",
        level: "Expert",
        visibility: "public",
      },
      { id: "s8", name: "AWS & GCP", level: "Advanced", visibility: "public" },
    ],
    projects: [
      {
        id: "p1",
        name: "Reliability Automation Platform",
        description:
          "Designed and delivered an enterprise-grade automation platform handling 500K+ events daily. Reduced incident response time by 60%.",
        visibility: "public",
      },
      {
        id: "p2",
        name: "Event-Driven Observability System",
        description:
          "Built a real-time observability stack with custom dashboards and alerting. Improved system visibility across 50+ microservices.",
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  "2": {
    id: "demo-minimal-grad",
    versionId: "v1",
    title: "Recent CS Graduate",
    slug: "priya-sharma",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Priya Sharma",
      title: "Computer Science Graduate",
      email: "priya@example.com",
      phone: "+91 98765 43210",
      location: "Bangalore",
      linkedin: "linkedin.com/in/priyasharma",
      github: "github.com/priya-codes",
    },
    contact: {
      email: { value: "priya@example.com", visibility: "public" },
      phone: { value: "+91 98765 43210", visibility: "public" },
    },
    summary:
      "Fresh CS graduate passionate about web development. Built 5+ projects during college including e-commerce platform and chat app. Quick learner seeking first software engineering role.",
    experience: [
      {
        id: "exp-1",
        company: "TechStart Solutions",
        role: "Software Intern",
        startDate: "2025-06",
        endDate: "2025-08",
        description:
          "Developed React components for admin dashboard. Fixed 12 bugs in authentication flow. Learned Git, React, and API integration in fast-paced startup environment.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "NIT Trichy",
        degree: "B.Tech Computer Science",
        startDate: "2021",
        endDate: "2025",
        description: "CGPA: 8.5/10",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "JavaScript",
        level: "Intermediate",
        visibility: "public",
      },
      { id: "s2", name: "React", level: "Beginner", visibility: "public" },
      { id: "s3", name: "Python", level: "Intermediate", visibility: "public" },
      { id: "s4", name: "Git", level: "Beginner", visibility: "public" },
    ],
    projects: [
      {
        id: "p1",
        name: "College E-Commerce Site",
        description:
          "Built marketplace for students. 200+ users. React + Firebase.",
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
