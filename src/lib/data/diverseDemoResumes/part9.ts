import { DashboardResume } from "@/types";

export const diverseDemoResumes9: Record<string, DashboardResume> = {
  "19": {
    id: "demo-data-scientist",
    versionId: "v1",
    title: "Data Scientist",
    slug: "rohan-sharma",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Rohan Sharma",
      title: "Senior Data Scientist",
      email: "rohan@example.com",
      location: "Bangalore",
    },
    contact: {
      email: { value: "rohan@example.com", visibility: "public" },
    },
    summary:
      "Data Scientist building ML models for recommendations. Deployed models driving $5M revenue impact. PhD in Machine Learning.",
    experience: [
      {
        id: "exp-1",
        company: "E-Commerce Giant",
        role: "Senior Data Scientist",
        startDate: "2021-03",
        endDate: "Present",
        description:
          "Built recommendation engine (collaborative filtering + deep learning) driving 18% GMV increase ($5M impact). Models serve 10M users daily.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "IISc Bangalore",
        degree: "PhD Machine Learning",
        startDate: "2016",
        endDate: "2021",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Python/PyTorch",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s2",
        name: "Deep Learning",
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

  "20": {
    id: "demo-solutions-architect",
    versionId: "v1",
    title: "Solutions Architect",
    slug: "manish-agarwal",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Manish Agarwal",
      title: "Solutions Architect",
      email: "manish@example.com",
      location: "Gurgaon",
    },
    contact: {
      email: { value: "manish@example.com", visibility: "public" },
    },
    summary:
      "Solutions Architect designing enterprise systems. 10+ years architecting cloud solutions. AWS Certified Solutions Architect Professional.",
    experience: [
      {
        id: "exp-1",
        company: "Consulting Firm",
        role: "Solutions Architect",
        startDate: "2019-01",
        endDate: "Present",
        description:
          "Design cloud architectures for enterprise clients. Led 15+ migrations to AWS/Azure. Designed systems for banks, healthcare, retail.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "IIT Roorkee",
        degree: "B.Tech CS",
        startDate: "2009",
        endDate: "2013",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "AWS Architecture",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s2",
        name: "System Design",
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

  "21": {
    id: "demo-ceo",
    versionId: "v1",
    title: "CEO & Founder",
    slug: "vishal-kapoor",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Vishal Kapoor",
      title: "CEO & Founder",
      email: "vishal@example.com",
      location: "Bangalore",
    },
    contact: {
      email: { value: "vishal@example.com", visibility: "public" },
    },
    summary:
      "CEO & Founder of SaaS startup. Built 0→$10M ARR, 300 employees. Raised $75M Series A-C. Ex-Amazon engineer turned founder.",
    experience: [
      {
        id: "exp-1",
        company: "SaaS Startup (Founder)",
        role: "CEO & Founder",
        startDate: "2018-01",
        endDate: "Present",
        description:
          "Founded B2B SaaS company. Grew 0→$10M ARR, 300 employees, 500+ customers. Raised $75M across Series A, B, C from Sequoia, Accel.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Stanford GSB",
        degree: "MBA",
        startDate: "2014",
        endDate: "2016",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Business Strategy",
        level: "Expert",
        visibility: "public",
      },
      { id: "s2", name: "Fundraising", level: "Expert", visibility: "public" },
    ],
    projects: [],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },
};
