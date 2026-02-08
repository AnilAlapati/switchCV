import { DashboardResume } from "@/types";

export const diverseDemoResumes8: Record<string, DashboardResume> = {
  "15": {
    id: "demo-pm",
    versionId: "v1",
    title: "Product Manager",
    slug: "neha-gupta",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Neha Gupta",
      title: "Product Manager",
      email: "neha@example.com",
      location: "Bangalore",
    },
    contact: {
      email: { value: "neha@example.com", visibility: "public" },
    },
    summary:
      "PM shipping B2C features to 5M users. Drove 25% engagement increase. Strong in user research & analytics.",
    experience: [
      {
        id: "exp-1",
        company: "Consumer App",
        role: "Product Manager",
        startDate: "2022-06",
        endDate: "Present",
        description:
          "Own discovery features (5M MAU). Launched 8 features driving 25% engagement lift. Run weekly user interviews.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "ISB Hyderabad",
        degree: "MBA",
        startDate: "2020",
        endDate: "2021",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Product Strategy",
        level: "Advanced",
        visibility: "public",
      },
    ],
    projects: [],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  "16": {
    id: "demo-senior-pm",
    versionId: "v1",
    title: "Senior Product Manager",
    slug: "karan-khanna",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Karan Khanna",
      title: "Senior Product Manager",
      email: "karan@example.com",
      location: "Gurgaon",
    },
    contact: {
      email: { value: "karan@example.com", visibility: "public" },
    },
    summary:
      "Senior PM owning checkout flow ($50M GMV). 6 years PM experience. Data-driven decision maker.",
    experience: [
      {
        id: "exp-1",
        company: "E-Commerce",
        role: "Senior PM",
        startDate: "2021-01",
        endDate: "Present",
        description:
          "Own payments & checkout ($50M annual GMV). Reduced cart abandonment 35%→22%. Lead team of 8 engineers.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "IIT Kanpur",
        degree: "B.Tech",
        startDate: "2013",
        endDate: "2017",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Product Leadership",
        level: "Expert",
        visibility: "public",
      },
    ],
    projects: [],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  "17": {
    id: "demo-devops",
    versionId: "v1",
    title: "DevOps Engineer",
    slug: "sanjay-reddy",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Sanjay Reddy",
      title: "DevOps Engineer",
      email: "sanjay@example.com",
      location: "Hyderabad",
    },
    contact: {
      email: { value: "sanjay@example.com", visibility: "public" },
    },
    summary:
      "DevOps engineer managing K8s clusters for 50+ microservices. Reduced deployment time 90%. Expert in infrastructure as code.",
    experience: [
      {
        id: "exp-1",
        company: "Cloud Platform",
        role: "DevOps Engineer",
        startDate: "2021-08",
        endDate: "Present",
        description:
          "Manage AWS infrastructure for 50+ services. Built CI/CD reducing deploy time 45min→4min. Saved $200K/year cloud costs.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "VIT Vellore",
        degree: "B.Tech",
        startDate: "2017",
        endDate: "2021",
        visibility: "public",
      },
    ],
    skills: [
      { id: "s1", name: "Kubernetes", level: "Expert", visibility: "public" },
      { id: "s2", name: "Terraform", level: "Expert", visibility: "public" },
      { id: "s3", name: "AWS", level: "Expert", visibility: "public" },
    ],
    projects: [],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  "18": {
    id: "demo-security",
    versionId: "v1",
    title: "Security Engineer",
    slug: "divya-krishnan",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Divya Krishnan",
      title: "Application Security Engineer",
      email: "divya@example.com",
      location: "Bangalore",
    },
    contact: {
      email: { value: "divya@example.com", visibility: "public" },
    },
    summary:
      "AppSec engineer. Found and fixed 200+ vulnerabilities. Built security automation reducing manual testing by 70%.",
    experience: [
      {
        id: "exp-1",
        company: "FinTech",
        role: "Security Engineer",
        startDate: "2020-09",
        endDate: "Present",
        description:
          "Run security program for payments platform. Built SAST/DAST pipeline catching 95% vulns pre-production. SOC2 compliant.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "NIT Trichy",
        degree: "B.Tech CS",
        startDate: "2016",
        endDate: "2020",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Penetration Testing",
        level: "Expert",
        visibility: "public",
      },
      { id: "s2", name: "OWASP Top 10", level: "Expert", visibility: "public" },
    ],
    projects: [],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },
};
