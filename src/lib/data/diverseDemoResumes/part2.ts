import { DashboardResume } from "@/types";

export const diverseDemoResumes2: Record<string, DashboardResume> = {
  "3": {
    id: "demo-detailed-sde1",
    versionId: "v1",
    title: "Software Engineer",
    slug: "rahul-verma",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Rahul Verma",
      title: "Software Development Engineer",
      email: "rahul.verma@example.com",
      phone: "+91 97654 32109",
      location: "Pune, Maharashtra, India",
      linkedin: "linkedin.com/in/rahul-verma-sde",
      github: "github.com/rahuldev",
    },
    contact: {
      email: { value: "rahul.verma@example.com", visibility: "public" },
      phone: { value: "+91 97654 32109", visibility: "public" },
    },
    summary:
      "Backend-focused software engineer with 1.5 years of experience building scalable microservices. Specialized in RESTful API design, database optimization, and caching strategies. Successfully reduced API latency by 50% for high-traffic services. Passionate about system performance and distributed architectures.",
    experience: [
      {
        id: "exp-1",
        company: "CloudTech Systems Pvt. Ltd.",
        role: "Software Development Engineer I",
        startDate: "2024-07",
        endDate: "Present",
        description:
          "Working on the payments microservice team where I develop and maintain backend services processing $2M+ daily transactions. My primary responsibility is building RESTful APIs using Node.js and Express that integrate with multiple payment gateways including Razorpay, Stripe, and PayU. I implemented a sophisticated caching layer using Redis that reduced database load by 65% during peak traffic hours. Recently designed and deployed an async job processing system using Bull Queue that handles 50K+ payment confirmations daily. I also participate in on-call rotations and have successfully debugged and resolved 3 critical production incidents, including a memory leak that was causing service crashes. Currently mentoring 2 interns on API design best practices.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Pune Institute of Computer Technology (PICT)",
        degree: "Bachelor of Engineering in Computer Engineering",
        startDate: "2020",
        endDate: "2024",
        description:
          "Graduated with First Class with Distinction (CGPA: 8.9/10). Final year project on microservices scalability won Best Project Award.",
        visibility: "public",
      },
    ],
    skills: [
      { id: "s1", name: "Node.js", level: "Advanced", visibility: "public" },
      { id: "s2", name: "TypeScript", level: "Advanced", visibility: "public" },
      {
        id: "s3",
        name: "PostgreSQL",
        level: "Intermediate",
        visibility: "public",
      },
      { id: "s4", name: "Redis", level: "Intermediate", visibility: "public" },
      { id: "s5", name: "Docker", level: "Intermediate", visibility: "public" },
      { id: "s6", name: "Express.js", level: "Advanced", visibility: "public" },
      { id: "s7", name: "REST APIs", level: "Advanced", visibility: "public" },
      {
        id: "s8",
        name: "Jest/Mocha",
        level: "Intermediate",
        visibility: "public",
      },
      { id: "s9", name: "Git", level: "Advanced", visibility: "public" },
      {
        id: "s10",
        name: "AWS (EC2, S3, RDS)",
        level: "Beginner",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Payment Gateway Abstraction Layer",
        description:
          "Designed unified API interface for 3 payment providers (Razorpay, Stripe, PayU). Implemented strategy pattern for provider selection based on transaction type and geography. Reduced integration effort for new providers from 2 weeks to 3 days. Tech: Node.js, TypeScript, PostgreSQL.",
        visibility: "public",
      },
      {
        id: "p2",
        name: "Transaction Monitoring Dashboard",
        description:
          "Built real-time analytics dashboard showing payment success rates, failure patterns, and provider performance metrics. Helped identify and fix issues reducing failure rate from 8% to 2%. Tech: React, Chart.js, Socket.io, Express.",
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
