import { DashboardResume } from "@/types";

export const diverseDemoResumes6: Record<string, DashboardResume> = {
  "8": {
    id: "demo-em",
    versionId: "v1",
    title: "Engineering Manager",
    slug: "anjali-mehta",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Anjali Mehta",
      title: "Engineering Manager",
      email: "anjali.mehta@example.com",
      phone: "+91 92109 87654",
      location: "Chennai, Tamil Nadu",
      linkedin: "linkedin.com/in/anjalimehta-em",
      github: "github.com/anjali-codes",
    },
    contact: {
      email: { value: "anjali.mehta@example.com", visibility: "public" },
      phone: { value: "+91 92109 87654", visibility: "public" },
    },
    summary:
      "Engineering Manager with 8 years experience (5 as IC, 3 managing). Leading team of 8 engineers building customer-facing products. Balanced technical depth with people leadership - still code 20% of time while growing high-performing team. Promoted 4 engineers in 2 years.",
    experience: [
      {
        id: "exp-1",
        company: "ProductTech Solutions",
        role: "Engineering Manager",
        startDate: "2022-09",
        endDate: "Present",
        description:
          "**Team Leadership** (8 engineers: 2 Senior, 4 Mid, 2 Junior)\n• Grew team from 4 to 8 engineers while maintaining 95% retention\n• Promoted 4 engineers (2 Junior→Mid, 2 Mid→Senior) through structured growth plans\n• Established 1:1 cadence, career development frameworks, and peer mentorship program\n• Improved team velocity by 40% through agile process improvements\n\n**Technical Delivery**\n• Launched 3 major products serving 500K+ users with 99.9% uptime\n• Reduced sprint spillover from 35% to 8% through better estimation and scope management\n• Implemented on-call rotation reducing manager escalations by 70%\n\n**Cross-functional Collaboration**\n• Partner with Product and Design to define quarterly roadmaps\n• Present technical updates to C-suite and board members\n• Collaborate with 4 peer teams on platform integration initiatives",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "DataSync Technologies",
        role: "Senior Software Engineer",
        startDate: "2019-04",
        endDate: "2022-08",
        description:
          "• Led projects as tech lead managing 3-4 engineers per project\n• Architected data pipeline processing 50M+ records daily\n• Mentored 5 junior engineers, 3 promoted to mid-level roles\n• Contributed to hiring: interviewed 50+ candidates, hired 8",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Anna University - CEG Campus",
        degree: "B.E. in Computer Science",
        startDate: "2013",
        endDate: "2017",
        visibility: "public",
      },
    ],
    skills: [
      // Leadership
      {
        id: "s1",
        name: "Team Leadership",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s2",
        name: "Performance Management",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s3",
        name: "Hiring & Interviewing",
        level: "Advanced",
        visibility: "public",
      },
      { id: "s4", name: "Agile/Scrum", level: "Expert", visibility: "public" },
      // Technical
      {
        id: "s5",
        name: "System Architecture",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s6",
        name: "Python & Java",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s7",
        name: "React & TypeScript",
        level: "Advanced",
        visibility: "public",
      },
      { id: "s8", name: "AWS", level: "Advanced", visibility: "public" },
    ],
    projects: [
      {
        id: "p1",
        name: "Customer Portal Redesign",
        description:
          "Led 6-month project rebuilding customer dashboard. Managed 8-person team (6 eng, 1 designer, 1 PM). Delivered on time increasing user engagement by 60% and reducing support tickets by 30%. Tech: React, Node.js, PostgreSQL, AWS.",
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  "9": {
    id: "demo-senior-em",
    versionId: "v1",
    title: "Senior Engineering Manager",
    slug: "rajesh-kumar",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Rajesh Kumar",
      title: "Senior Engineering Manager - Payments",
      email: "rajesh.kumar@example.com",
      phone: "+91 91234 56780",
      location: "Bangalore, Karnataka",
      linkedin: "linkedin.com/in/rajesh-kumar-sem",
    },
    contact: {
      email: { value: "rajesh.kumar@example.com", visibility: "public" },
      phone: { value: "+91 91234 56780", visibility: "public" },
    },
    summary:
      "Senior EM managing 25+ engineers across 3 teams. 12 years industry experience (7 IC, 5 management). Scaled payments org from 10 to 30 engineers. $5M annual budget owner.",
    experience: [
      {
        id: "exp-1",
        company: "FinTech Unicorn",
        role: "Senior Engineering Manager",
        startDate: "2020-01",
        endDate: "Present",
        description:
          "Lead Payments Engineering (3 teams, 25 engineers, 3 EMs reporting). Scaled from 10 to 30 headcount. Shipped 40+ features processing $500M GMV.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "IIT Bombay",
        degree: "B.Tech CS",
        startDate: "2008",
        endDate: "2012",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Organizational Leadership",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s2",
        name: "Scaling Teams",
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

  "10": {
    id: "demo-dir-eng",
    versionId: "v1",
    title: "Director of Engineering",
    slug: "kavita-nair",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Kavita Nair",
      title: "Director of Engineering",
      email: "kavita.nair@example.com",
      phone: "+91 90123 45678",
      location: "Hyderabad",
      linkedin: "linkedin.com/in/kavita-nair",
    },
    contact: {
      email: { value: "kavita.nair@example.com", visibility: "public" },
      phone: { value: "+91 90123 45678", visibility: "public" },
    },
    summary:
      "Director managing 60+ engineers across Platform Engineering. P&L owner. Built engineering culture at 2 startups.",
    experience: [
      {
        id: "exp-1",
        company: "SaaS Startup",
        role: "Director of Engineering",
        startDate: "2019-01",
        endDate: "Present",
        description:
          "Built engineering from 12 to 65 engineers. 5 EMs reporting. $8M budget. Delivered platform powering $25M ARR product.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "IIT Madras",
        degree: "B.Tech + M.Tech CS",
        startDate: "2005",
        endDate: "2010",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Engineering Leadership",
        level: "Expert",
        visibility: "public",
      },
      { id: "s2", name: "Org Building", level: "Expert", visibility: "public" },
    ],
    projects: [],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },
};
