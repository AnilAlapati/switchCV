import { DashboardResume } from "@/types";

export const diverseDemoResumes3: Record<string, DashboardResume> = {
  "4": {
    id: "demo-categorized-sde2",
    versionId: "v1",
    title: "SDE II - Full Stack Engineer",
    slug: "sneha-patel",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Sneha Patel",
      title: "Software Development Engineer II",
      email: "sneha.patel@example.com",
      phone: "+91 96543 21098",
      location: "Mumbai, India",
      linkedin: "linkedin.com/in/sneha-patel-fullstack",
      github: "github.com/sneha-builds",
    },
    contact: {
      email: { value: "sneha.patel@example.com", visibility: "public" },
      phone: { value: "+91 96543 21098", visibility: "public" },
    },
    summary:
      "Full-stack engineer with 3.5 years building enterprise SaaS products. Expertise in React, Node.js, and AWS. Led migration of monolith to microservices serving 100K+ users.",
    experience: [
      {
        id: "exp-1",
        company: "EnterpriseCloud Solutions",
        role: "Software Development Engineer II",
        startDate: "2023-03",
        endDate: "Present",
        description:
          "• Led frontend architecture redesign reducing bundle size by 45% (450KB → 248KB)\n• Built reusable component library used across 8 product teams\n• Optimized React render cycles improving time-to-interactive by 2.1s\n• Mentored 3 junior developers on modern React patterns and testing",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "DataFlow Systems",
        role: "Software Engineer",
        startDate: "2021-07",
        endDate: "2023-02",
        description:
          "• Developed microservices handling 500K+ API requests daily\n• Implemented event-driven architecture using Kafka and RabbitMQ\n• Reduced deployment time from 45min to 8min through CI/CD improvements\n• Achieved 95%+ test coverage across all backend services",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Mumbai University - DJ Sanghvi College of Engineering",
        degree: "B.E. in Information Technology",
        startDate: "2017",
        endDate: "2021",
        visibility: "public",
      },
    ],
    skills: [
      // Frontend
      {
        id: "s1",
        name: "React.js",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s2",
        name: "Next.js 14",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s3",
        name: "TypeScript",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s4",
        name: "Tailwind CSS",
        level: "Advanced",
        visibility: "public",
      },
      // Backend
      {
        id: "s5",
        name: "Node.js",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s6",
        name: "Express & NestJS",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s7",
        name: "GraphQL",
        level: "Intermediate",
        visibility: "public",
      },
      // Database
      {
        id: "s8",
        name: "PostgreSQL",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s9",
        name: "MongoDB",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s10",
        name: "Redis",
        level: "Intermediate",
        visibility: "public",
      },
      // DevOps & Cloud
      {
        id: "s11",
        name: "AWS (EC2, S3, Lambda, RDS)",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s12",
        name: "Docker & Kubernetes",
        level: "Intermediate",
        visibility: "public",
      },
      {
        id: "s13",
        name: "CI/CD (GitHub Actions)",
        level: "Advanced",
        visibility: "public",
      },
      // Testing
      {
        id: "s14",
        name: "Jest & React Testing Library",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s15",
        name: "Cypress E2E",
        level: "Intermediate",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Component Library - EnterpriseUI",
        description:
          "Architected and built design system with 45+ reusable React components. Includes theming, accessibility (WCAG AA), and comprehensive Storybook documentation. Adopted by 8 teams, reducing UI development time by 60%.",
        visibility: "public",
      },
      {
        id: "p2",
        name: "Real-time Analytics Dashboard",
        description:
          "Built WebSocket-based dashboard displaying metrics from 15+ microservices. Handles 10K concurrent connections. Features: custom chart library, alert system, drill-down analytics. Tech: React, Socket.io, D3.js, Kafka.",
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
