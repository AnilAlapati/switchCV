import React from "react";
import { TemplateRenderer } from "@/components/resume/TemplateRenderer";
import { DashboardResume } from "@/types";
import { RESUME_TEMPLATES } from "@/lib/templates/resumeTemplates";
import Link from "next/link";
import { notFound } from "next/navigation";

// --- Demo Resume Database ---
const DEMO_RESUMES: Record<string, DashboardResume> = {
  // 1. ORIGINAL - Anil A. - Senior Software Engineer (DO NOT REMOVE)
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

  // 2. Fresh Graduate - Entry Level
  "2": {
    id: "demo-fresh-grad",
    versionId: "v1",
    title: "Computer Science Graduate | Full Stack Developer",
    slug: "priya-sharma",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Priya Sharma",
      title: "Computer Science Graduate | Full Stack Developer",
      email: "priya.sharma@example.com",
      phone: "+91 98765 43210",
      location: "Bangalore, India",
      linkedin: "linkedin.com/in/priya-sharma-dev",
      github: "github.com/priya-codes",
    },
    contact: {
      email: { value: "priya.sharma@example.com", visibility: "public" },
      phone: { value: "+91 98765 43210", visibility: "public" },
    },
    summary:
      "Recent Computer Science graduate with strong foundation in data structures, algorithms, and full-stack development. Completed 3 internships building scalable web applications. Passionate about clean code, test-driven development, and continuous learning. Seeking entry-level software engineer role to contribute to innovative products while growing technical expertise.",
    experience: [
      {
        id: "exp-1",
        company: "TechCorp Solutions",
        role: "Software Engineering Intern",
        startDate: "2025-06",
        endDate: "2025-12",
        description:
          "Built RESTful APIs for customer management system serving 10K+ users using Node.js and Express.\n• Implemented JWT authentication reducing unauthorized access attempts by 95%.\n• Wrote 80+ unit tests achieving 92% code coverage using Jest.\n• Collaborated with 4-member team using Agile methodologies and Git workflows.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "Innovate Labs",
        role: "Full Stack Intern",
        startDate: "2025-01",
        endDate: "2025-05",
        description:
          "Developed responsive React dashboard for real-time analytics visualization.\n• Integrated Chart.js reducing data interpretation time by 40%.\n• Optimized MongoDB queries improving page load times by 30%.\n• Participated in daily standups and code reviews.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "National Institute of Technology (NIT) Trichy",
        degree: "B.Tech in Computer Science & Engineering",
        startDate: "2021",
        endDate: "2025",
        description:
          "CGPA: 8.7/10 | Relevant Coursework: Data Structures, Algorithms, Database Systems, Operating Systems, Computer Networks, Web Development",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "JavaScript/TypeScript",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s2",
        name: "React & Next.js",
        level: "Intermediate",
        visibility: "public",
      },
      {
        id: "s3",
        name: "Node.js & Express",
        level: "Intermediate",
        visibility: "public",
      },
      {
        id: "s4",
        name: "MongoDB & PostgreSQL",
        level: "Intermediate",
        visibility: "public",
      },
      {
        id: "s5",
        name: "Git & GitHub",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s6",
        name: "REST APIs",
        level: "Intermediate",
        visibility: "public",
      },
      {
        id: "s7",
        name: "Jest & Testing",
        level: "Beginner",
        visibility: "public",
      },
      {
        id: "s8",
        name: "HTML/CSS/Tailwind",
        level: "Advanced",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "E-Commerce Platform (Final Year Project)",
        description:
          "Built full-stack marketplace with 5,000+ products, payment gateway integration, and real-time order tracking. Tech: MERN stack, Stripe API, Socket.io. Deployed on AWS EC2.",
        visibility: "public",
      },
      {
        id: "p2",
        name: "Campus Event Management System",
        description:
          "Developed web app managing 50+ campus events with 2,000+ registrations. Features: QR code check-in, email notifications, admin dashboard. Tech: React, Firebase, Material-UI.",
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  // 3. SDE 1 - Junior Developer
  "3": {
    id: "demo-sde1",
    versionId: "v1",
    title: "Software Development Engineer I",
    slug: "rahul-verma",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Rahul Verma",
      title: "Software Development Engineer I",
      email: "rahul.verma@example.com",
      phone: "+91 97654 32109",
      location: "Pune, India",
      linkedin: "linkedin.com/in/rahul-verma-sde",
      github: "github.com/rahul-dev",
    },
    contact: {
      email: { value: "rahul.verma@example.com", visibility: "public" },
      phone: { value: "+91 97654 32109", visibility: "public" },
    },
    summary:
      "Software Development Engineer with 1.5 years of experience building scalable backend services and RESTful APIs. Reduced API response times by 45% through caching strategies and database optimization. Strong problem-solver with proven ability to debug complex issues in production environments. Eager to tackle challenging technical problems in high-growth teams.",
    experience: [
      {
        id: "exp-1",
        company: "CloudTech Systems",
        role: "Software Development Engineer I",
        startDate: "2024-07",
        endDate: "Present",
        description:
          "Develop and maintain microservices for SaaS platform serving 50K+ active users.\n• Built notification service processing 100K+ emails/day using Node.js and RabbitMQ.\n• Implemented Redis caching reducing database load by 60% and API latency by 45%.\n• Fixed 30+ production bugs improving system stability and user satisfaction.\n• Participated in on-call rotation handling incidents with 99.5% SLA adherence.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "TechFlow India",
        role: "Associate Software Engineer",
        startDate: "2023-08",
        endDate: "2024-06",
        description:
          "Contributed to payment processing module handling $2M+ monthly transactions.\n• Developed RESTful APIs for invoice generation and payment reconciliation.\n• Wrote comprehensive unit tests achieving 85% code coverage.\n• Collaborated with QA team to resolve 40+ critical defects before releases.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "VIT University Vellore",
        degree: "B.Tech in Computer Science",
        startDate: "2019",
        endDate: "2023",
        description: "CGPA: 8.5/10",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Java & Spring Boot",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s2",
        name: "Node.js & Express",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s3",
        name: "PostgreSQL & MySQL",
        level: "Intermediate",
        visibility: "public",
      },
      {
        id: "s4",
        name: "Redis & Caching",
        level: "Intermediate",
        visibility: "public",
      },
      {
        id: "s5",
        name: "RabbitMQ & Kafka",
        level: "Beginner",
        visibility: "public",
      },
      { id: "s6", name: "Docker", level: "Intermediate", visibility: "public" },
      { id: "s7", name: "REST APIs", level: "Expert", visibility: "public" },
      {
        id: "s8",
        name: "Git & CI/CD",
        level: "Advanced",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Real-Time Notification Service",
        description:
          "Built scalable notification service using Node.js, RabbitMQ, and SendGrid. Handles 100K+ daily emails with 99.9% delivery rate. Implemented retry logic and dead-letter queues for reliability.",
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  // 4. SDE 2 - Mid-Level Engineer
  "4": {
    id: "demo-sde2",
    versionId: "v1",
    title: "Software Development Engineer II",
    slug: "ananya-reddy",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Ananya Reddy",
      title: "Software Development Engineer II",
      email: "ananya.reddy@example.com",
      phone: "+91 96543 21098",
      location: "Hyderabad, India",
      linkedin: "linkedin.com/in/ananya-reddy-sde",
      github: "github.com/ananya-codes",
    },
    contact: {
      email: { value: "ananya.reddy@example.com", visibility: "public" },
      phone: { value: "+91 96543 21098", visibility: "public" },
    },
    summary:
      "Software Development Engineer II with 3.5 years of experience architecting and delivering high-performance distributed systems. Led migration of monolithic application to microservices architecture, improving deployment frequency by 10x. Expert in backend technologies, system design, and mentoring junior developers. Passionate about building scalable, maintainable systems that solve real business problems.",
    experience: [
      {
        id: "exp-1",
        company: "ScaleTech Solutions",
        role: "Software Development Engineer II",
        startDate: "2023-01",
        endDate: "Present",
        description:
          "Design and develop microservices for enterprise SaaS platform serving 200K+ users.\n• Led monolith-to-microservices migration reducing deployment time from 2 hours to 15 minutes.\n• Architected event-driven system using Kafka processing 500K+ events daily.\n• Implemented distributed caching with Redis improving read performance by 70%.\n• Mentored 3 junior engineers on best practices, code reviews, and system design.\n• Reduced production incidents by 40% through improved monitoring and alerting.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "DataFlow Systems",
        role: "Software Engineer",
        startDate: "2021-07",
        endDate: "2022-12",
        description:
          "Built RESTful APIs and data processing pipelines for analytics platform.\n• Developed ETL pipeline processing 10M+ records daily with 99.9% accuracy.\n• Optimized database queries reducing report generation time by 60%.\n• Implemented OAuth 2.0 authentication for third-party integrations.\n• Participated in design reviews and contributed to technical roadmap planning.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution:
          "International Institute of Information Technology (IIIT) Hyderabad",
        degree: "B.Tech in Computer Science",
        startDate: "2017",
        endDate: "2021",
        description: "CGPA: 8.9/10",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "System Design",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s2",
        name: "Python & FastAPI",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s3",
        name: "Java & Spring Boot",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s4",
        name: "PostgreSQL & MongoDB",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s5",
        name: "Kafka & RabbitMQ",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s6",
        name: "Docker & Kubernetes",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s7",
        name: "AWS (EC2, S3, Lambda)",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s8",
        name: "Microservices Architecture",
        level: "Expert",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Event-Driven Order Processing System",
        description:
          "Architected microservices-based order processing system handling 50K+ daily orders. Used Kafka for event streaming, Redis for caching, and PostgreSQL for persistence. Achieved 99.99% uptime.",
        visibility: "public",
      },
      {
        id: "p2",
        name: "Real-Time Analytics Dashboard",
        description:
          "Built real-time analytics platform processing clickstream data from 1M+ daily users. Tech: Kafka, ClickHouse, Grafana. Reduced data latency from minutes to sub-seconds.",
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  // 5. SDE 3 - Senior Engineer
  "5": {
    id: "demo-sde3",
    versionId: "v1",
    title: "Software Development Engineer III | Senior Backend Engineer",
    slug: "anil-kumar",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Anil Kumar",
      title: "Software Development Engineer III",
      email: "anil.kumar@example.com",
      phone: "+91 95432 10987",
      location: "Bangalore, India",
      linkedin: "linkedin.com/in/anil-kumar-sde3",
      github: "github.com/anil-kumar-tech",
    },
    contact: {
      email: { value: "anil.kumar@example.com", visibility: "public" },
      phone: { value: "+91 95432 10987", visibility: "public" },
    },
    summary:
      "Senior Software Development Engineer with 6+ years of experience designing and building distributed systems at scale. Led critical infrastructure projects serving 10M+ users with 99.99% uptime. Expert in system design, performance optimization, and cross-team collaboration. Proven track record of mentoring engineers and driving technical excellence across organizations. Seeking Staff Engineer role to amplify impact on product architecture and engineering culture.",
    experience: [
      {
        id: "exp-1",
        company: "PaymentTech Global",
        role: "Software Development Engineer III",
        startDate: "2021-03",
        endDate: "Present",
        description:
          "Lead technical design and implementation of payment processing infrastructure handling $100M+ monthly transactions.\n• Architected multi-region payment gateway achieving 99.99% uptime and sub-200ms latency.\n• Designed idempotency framework preventing duplicate charges saving $2M+ annually.\n• Led migration to event-driven architecture reducing coupling and improving scalability 5x.\n• Mentored team of 8 engineers through design reviews, code reviews, and 1-on-1s.\n• Drove adoption of observability practices reducing MTTR from 2 hours to 15 minutes.\n• Presented technical talks on distributed systems at internal engineering conferences.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "E-Commerce Giants Inc.",
        role: "Senior Software Engineer",
        startDate: "2018-06",
        endDate: "2021-02",
        description:
          "Built and scaled backend services for marketplace serving 5M+ daily active users.\n• Designed inventory management system handling 100K+ SKUs with real-time updates.\n• Implemented rate limiting and circuit breaker patterns improving system resilience.\n• Reduced API p99 latency by 65% through database optimization and caching strategies.\n• Led incident response for critical production issues maintaining 99.9% SLA.",
        visibility: "public",
      },
      {
        id: "exp-3",
        company: "StartupHub Technologies",
        role: "Software Engineer",
        startDate: "2017-07",
        endDate: "2018-05",
        description:
          "Built core platform features for B2B SaaS product from ground up.\n• Developed multi-tenancy architecture supporting 500+ enterprise customers.\n• Implemented role-based access control (RBAC) system securing customer data.\n• Contributed to API design standards adopted across the engineering team.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Indian Institute of Technology (IIT) Delhi",
        degree: "B.Tech in Computer Science & Engineering",
        startDate: "2013",
        endDate: "2017",
        description: "CGPA: 9.2/10",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Distributed Systems",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s2",
        name: "System Design & Architecture",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s3",
        name: "Java & Spring Ecosystem",
        level: "Expert",
        visibility: "public",
      },
      { id: "s4", name: "Go & gRPC", level: "Advanced", visibility: "public" },
      {
        id: "s5",
        name: "PostgreSQL & DynamoDB",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s6",
        name: "Kafka & Event Streaming",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s7",
        name: "Kubernetes & Helm",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s8",
        name: "AWS (Full Stack)",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s9",
        name: "Monitoring (Prometheus, Grafana)",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s10",
        name: "Technical Leadership",
        level: "Advanced",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Multi-Region Payment Gateway",
        description:
          "Designed and built payment processing system deployed across 3 AWS regions handling 1M+ daily transactions. Implemented automatic failover, idempotency, and reconciliation. Achieved 99.99% uptime and PCI DSS compliance.",
        visibility: "public",
      },
      {
        id: "p2",
        name: "Event-Driven Order Management System",
        description:
          "Architected event-sourced system using Kafka and CQRS pattern. Handled 500K+ daily orders with eventual consistency guarantees. Reduced order processing time by 80%.",
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  // 6. Staff Engineer
  "6": {
    id: "demo-staff-engineer",
    versionId: "v1",
    title: "Staff Software Engineer | Technical Lead",
    slug: "meera-patel",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Meera Patel",
      title: "Staff Software Engineer",
      email: "meera.patel@example.com",
      phone: "+91 94321 09876",
      location: "Bangalore, India",
      linkedin: "linkedin.com/in/meera-patel-staff",
      github: "github.com/meera-tech",
    },
    contact: {
      email: { value: "meera.patel@example.com", visibility: "public" },
      phone: { value: "+91 94321 09876", visibility: "public" },
    },
    summary:
      "Staff Software Engineer with 9+ years of experience architecting large-scale distributed systems and driving technical strategy across organizations. Led platform initiatives impacting 50M+ users with measurable business outcomes. Expert in system design, performance engineering, and cross-functional leadership. Mentor to 20+ engineers across multiple teams. Passionate about building resilient systems and fostering engineering excellence through technical vision and collaborative problem-solving.",
    experience: [
      {
        id: "exp-1",
        company: "GlobalTech Corporation",
        role: "Staff Software Engineer",
        startDate: "2020-04",
        endDate: "Present",
        description:
          "Define technical architecture and drive engineering excellence across platform serving 50M+ users.\n• Led design and implementation of service mesh reducing inter-service latency by 40%.\n• Architected multi-cloud disaster recovery strategy achieving RPO < 5 minutes and RTO < 30 minutes.\n• Drove adoption of observability-first development reducing production incidents by 60%.\n• Designed API gateway handling 1B+ requests/day with auto-scaling and rate limiting.\n• Established engineering standards for microservices adopted by 15+ teams (100+ engineers).\n• Mentored 8 senior engineers on system design, architecture patterns, and technical leadership.\n• Led incident response for P0 outages coordinating cross-functional teams.\n• Presented at external conferences on building resilient distributed systems.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "CloudScale Systems",
        role: "Senior Software Engineer",
        startDate: "2017-05",
        endDate: "2020-03",
        description:
          "Built core infrastructure for cloud-native platform supporting 1000+ enterprise customers.\n• Designed distributed tracing system reducing debugging time by 70%.\n• Implemented auto-scaling infrastructure saving $500K+ annually in cloud costs.\n• Led migration from monolith to 50+ microservices over 18 months.\n• Built internal developer platform reducing service deployment time from days to minutes.",
        visibility: "public",
      },
      {
        id: "exp-3",
        company: "FinTech Innovations",
        role: "Software Engineer II",
        startDate: "2015-07",
        endDate: "2017-04",
        description:
          "Developed payment processing and fraud detection systems for digital wallet platform.\n• Built real-time fraud detection engine processing 10K+ transactions/second.\n• Implemented event sourcing pattern for audit compliance and regulatory requirements.\n• Reduced false positive rate by 35% through machine learning integration.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Indian Institute of Technology (IIT) Bombay",
        degree: "B.Tech in Computer Science & Engineering",
        startDate: "2011",
        endDate: "2015",
        description: "CGPA: 9.4/10 | Institute Gold Medal",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Distributed Systems Architecture",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s2",
        name: "Cloud Architecture (AWS, GCP)",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s3",
        name: "Microservices & Service Mesh",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s4",
        name: "Java, Go, Python",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s5",
        name: "Kubernetes & Istio",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s6",
        name: "Event Streaming (Kafka)",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s7",
        name: "Database Design (SQL & NoSQL)",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s8",
        name: "Site Reliability Engineering",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s9",
        name: "Technical Leadership",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s10",
        name: "Engineering Strategy",
        level: "Advanced",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Platform Service Mesh",
        description:
          "Designed and implemented Istio-based service mesh for 100+ microservices. Provided mTLS, traffic management, observability, and circuit breaking. Reduced inter-service failures by 75%.",
        visibility: "public",
      },
      {
        id: "p2",
        name: "Multi-Cloud Disaster Recovery System",
        description:
          "Architected active-active deployment across AWS and GCP with automatic failover. Achieved 99.995% uptime SLA. Handled regional outages with zero customer impact.",
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  // 7. Principal Engineer
  "7": {
    id: "demo-principal-engineer",
    versionId: "v1",
    title: "Principal Software Engineer | Infrastructure Architect",
    slug: "vikram-singh",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Vikram Singh",
      title: "Principal Software Engineer",
      email: "vikram.singh@example.com",
      phone: "+91 93210 98765",
      location: "Gurgaon, India",
      linkedin: "linkedin.com/in/vikram-singh-principal",
      github: "github.com/vikram-principal",
    },
    contact: {
      email: { value: "vikram.singh@example.com", visibility: "public" },
      phone: { value: "+91 93210 98765", visibility: "public" },
    },
    summary:
      "Principal Software Engineer with 12+ years of experience architecting enterprise-grade distributed systems and leading technical transformation at scale. Spearheaded platform initiatives supporting 100M+ users with $1B+ annual revenue impact. Recognized expert in cloud infrastructure, performance engineering, and technical strategy. Drive organizational impact through technical vision, cross-team influence, and mentorship of senior engineering leaders. Seeking Distinguished Engineer role to shape next-generation architecture and engineering culture.",
    experience: [
      {
        id: "exp-1",
        company: "MegaCorp Technologies",
        role: "Principal Software Engineer",
        startDate: "2019-01",
        endDate: "Present",
        description:
          "Define and execute technical vision for infrastructure platform supporting 100M+ users and 500+ services.\n• Architected next-generation platform reducing infrastructure costs by $10M+ annually while improving performance 3x.\n• Led cloud migration strategy moving 2000+ workloads to Kubernetes with zero downtime.\n• Designed global content delivery network reducing p95 latency from 800ms to 150ms across 20+ countries.\n• Established platform SLO framework adopted org-wide (200+ teams, 1000+ engineers).\n• Created technical roadmap aligning with business strategy and driving $50M+ cost optimization.\n• Mentored 5 Staff Engineers and 15+ Senior Engineers on architecture, system design, and technical leadership.\n• Led design reviews for critical systems ensuring scalability, reliability, and maintainability.\n• Represented engineering in C-level discussions on technical investments and strategic priorities.\n• Published 10+ internal technical papers on distributed systems patterns and best practices.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "CloudFirst Systems",
        role: "Staff Software Engineer",
        startDate: "2015-06",
        endDate: "2018-12",
        description:
          "Led architecture and implementation of cloud-native platform for enterprise SaaS.\n• Designed multi-tenant platform supporting 5000+ enterprise customers with 99.99% uptime SLA.\n• Built self-service infrastructure platform reducing provisioning time from weeks to minutes.\n• Implemented chaos engineering practices improving system resilience by 80%.\n• Drove API-first architecture enabling 100+ third-party integrations.\n• Led performance optimization efforts improving throughput 10x while reducing costs 40%.",
        visibility: "public",
      },
      {
        id: "exp-3",
        company: "Analytics Corp",
        role: "Senior Software Engineer",
        startDate: "2012-07",
        endDate: "2015-05",
        description:
          "Built real-time data processing infrastructure for big data analytics platform.\n• Designed distributed data pipeline processing 100TB+ daily with sub-minute latency.\n• Implemented stream processing system using Kafka and Spark handling 10M+ events/second.\n• Reduced data processing costs by 60% through architectural optimization.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Indian Institute of Technology (IIT) Kanpur",
        degree: "B.Tech in Computer Science & Engineering",
        startDate: "2008",
        endDate: "2012",
        description: "CGPA: 9.6/10 | President's Gold Medal",
        visibility: "public",
      },
      {
        id: "edu-2",
        institution: "Stanford University",
        degree: "M.S. in Computer Science (Part-time)",
        startDate: "2016",
        endDate: "2018",
        description: "Focus: Distributed Systems and Cloud Computing",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Enterprise Architecture",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s2",
        name: "Distributed Systems at Scale",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s3",
        name: "Cloud Infrastructure (AWS, GCP, Azure)",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s4",
        name: "Platform Engineering",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s5",
        name: "Performance Engineering",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s6",
        name: "Technical Strategy & Roadmapping",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s7",
        name: "Kubernetes Ecosystem",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s8",
        name: "Site Reliability Engineering",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s9",
        name: "Executive Communication",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s10",
        name: "Engineering Leadership",
        level: "Expert",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Global Infrastructure Platform",
        description:
          "Architected and delivered next-gen infrastructure platform deployed across 15 AWS regions. Supports 500+ microservices and 100M+ users. Achieved 99.995% uptime with automated failover and disaster recovery. $10M+ annual cost savings.",
        visibility: "public",
      },
      {
        id: "p2",
        name: "Zero-Downtime Cloud Migration",
        description:
          "Led migration of 2000+ legacy applications to Kubernetes-based platform. Implemented blue-green deployment strategy with automated rollback. Completed in 18 months with zero customer-facing incidents.",
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  // 8. Engineering Manager
  "8": {
    id: "demo-eng-manager",
    versionId: "v1",
    title: "Engineering Manager | Team Lead",
    slug: "sneha-iyer",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Sneha Iyer",
      title: "Engineering Manager",
      email: "sneha.iyer@example.com",
      phone: "+91 92109 87654",
      location: "Chennai, India",
      linkedin: "linkedin.com/in/sneha-iyer-em",
      github: "github.com/sneha-tech-lead",
    },
    contact: {
      email: { value: "sneha.iyer@example.com", visibility: "public" },
      phone: { value: "+91 92109 87654", visibility: "public" },
    },
    summary:
      "Engineering Manager with 8+ years of technical experience and 3+ years of leadership. Built and scaled high-performing teams delivering critical platform features for 20M+ users. Strong technical background in distributed systems combined with proven ability to coach engineers, drive execution, and align technical work with business objectives. Passionate about creating inclusive engineering culture where teams can do their best work.",
    experience: [
      {
        id: "exp-1",
        company: "TechScale Solutions",
        role: "Engineering Manager",
        startDate: "2022-03",
        endDate: "Present",
        description:
          "Lead team of 10 engineers building core platform services for B2B SaaS product.\n• Grew team from 4 to 10 engineers through strategic hiring and onboarding.\n• Delivered 3 major platform features ahead of schedule generating $5M+ ARR.\n• Improved team velocity by 40% through process improvements and removing blockers.\n• Reduced production incidents by 50% through better testing practices and code reviews.\n• Conducted 1-on-1s, performance reviews, and career development conversations for all team members.\n• Partnered with Product and Design to define quarterly roadmap and priorities.\n• Implemented on-call rotation and incident response processes improving MTTR by 60%.\n• Mentored 2 engineers to senior level and 1 to team lead role.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "CloudTech Systems",
        role: "Tech Lead / Senior Software Engineer",
        startDate: "2019-06",
        endDate: "2022-02",
        description:
          "Led team of 6 engineers building payment processing infrastructure.\n• Architected payment gateway processing $50M+ monthly transactions with 99.99% uptime.\n• Drove technical decisions for microservices migration reducing deployment time by 80%.\n• Conducted design reviews and mentored engineers on system design and best practices.\n• Coordinated with Product, Security, and Compliance teams for PCI DSS certification.",
        visibility: "public",
      },
      {
        id: "exp-3",
        company: "StartupVentures Inc.",
        role: "Senior Software Engineer",
        startDate: "2016-07",
        endDate: "2019-05",
        description:
          "Built full-stack features for e-commerce marketplace serving 2M+ users.\n• Developed recommendation engine increasing conversion rate by 25%.\n• Implemented search functionality using Elasticsearch improving search relevance.\n• Contributed to API design and database architecture decisions.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Anna University Chennai",
        degree: "B.E. in Computer Science & Engineering",
        startDate: "2012",
        endDate: "2016",
        description: "CGPA: 8.8/10",
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
      {
        id: "s2",
        name: "Team Building & Hiring",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s3",
        name: "Agile & Scrum",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s4",
        name: "Performance Management",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s5",
        name: "System Design",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s6",
        name: "Microservices Architecture",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s7",
        name: "Python & Java",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s8",
        name: "Cloud Platforms (AWS)",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s9",
        name: "Stakeholder Management",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s10",
        name: "Technical Strategy",
        level: "Advanced",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Platform Modernization Initiative",
        description:
          "Led team migrating 20+ legacy services to modern microservices architecture. Delivered in 6 months with zero downtime. Reduced operational costs by 35% and improved developer productivity by 50%.",
        visibility: "public",
      },
      {
        id: "p2",
        name: "Payment Processing Infrastructure",
        description:
          "Architected PCI DSS compliant payment gateway handling $50M+ monthly volume. Built with fraud detection, reconciliation, and multi-currency support. Achieved 99.99% uptime SLA.",
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  // 9. Senior Engineering Manager
  "9": {
    id: "demo-senior-em",
    versionId: "v1",
    title: "Senior Engineering Manager",
    slug: "rajesh-nair",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Rajesh Nair",
      title: "Senior Engineering Manager",
      email: "rajesh.nair@example.com",
      phone: "+91 91098 76543",
      location: "Bangalore, India",
      linkedin: "linkedin.com/in/rajesh-nair-sem",
      github: "github.com/rajesh-engineering",
    },
    contact: {
      email: { value: "rajesh.nair@example.com", visibility: "public" },
      phone: { value: "+91 91098 76543", visibility: "public" },
    },
    summary:
      "Senior Engineering Manager with 11+ years of technical experience and 5+ years of leadership managing teams of 25+ engineers. Built and scaled multiple engineering teams delivering platform products supporting 50M+ users. Expert in balancing technical excellence with business outcomes, organizational development, and strategic planning. Proven track record of developing high-performing teams, driving technical initiatives, and partnering with cross-functional stakeholders.",
    experience: [
      {
        id: "exp-1",
        company: "EnterpriseCloud Inc.",
        role: "Senior Engineering Manager",
        startDate: "2020-08",
        endDate: "Present",
        description:
          "Lead organization of 30 engineers across 3 teams building cloud infrastructure platform.\n• Scaled engineering organization from 12 to 30 engineers through strategic hiring and team structuring.\n• Delivered platform supporting 1000+ enterprise customers with 99.99% uptime SLA.\n• Drove technical roadmap generating $20M+ ARR through new platform capabilities.\n• Reduced time-to-market for new features by 50% through improved processes and automation.\n• Established engineering standards and best practices adopted across 100+ engineer organization.\n• Built strong engineering culture with focus on ownership, innovation, and customer impact.\n• Managed 3 Engineering Managers and mentored them on leadership and people management.\n• Partnered with Product, Sales, and Customer Success to align engineering priorities with business goals.\n• Led organizational restructuring improving team autonomy and reducing dependencies.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "DataPlatform Systems",
        role: "Engineering Manager",
        startDate: "2017-05",
        endDate: "2020-07",
        description:
          "Managed team of 12 engineers building real-time data processing platform.\n• Led development of streaming data pipeline processing 1TB+ daily with sub-minute latency.\n• Improved team productivity by 60% through agile transformation and tooling investments.\n• Reduced production incidents by 70% through better testing and monitoring practices.\n• Hired and onboarded 8 engineers including 2 senior hires from top tech companies.",
        visibility: "public",
      },
      {
        id: "exp-3",
        company: "TechStartup Co.",
        role: "Tech Lead / Staff Engineer",
        startDate: "2013-07",
        endDate: "2017-04",
        description:
          "Led technical direction for core product serving 5M+ users.\n• Architected microservices platform powering mobile and web applications.\n• Grew engineering team from 3 to 15 engineers as company scaled.\n• Built CI/CD infrastructure reducing deployment time from hours to minutes.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "National Institute of Technology (NIT) Calicut",
        degree: "B.Tech in Computer Science & Engineering",
        startDate: "2009",
        endDate: "2013",
        description: "CGPA: 9.1/10",
        visibility: "public",
      },
      {
        id: "edu-2",
        institution: "Executive Education",
        degree: "Engineering Leadership Program",
        startDate: "2021",
        endDate: "2021",
        description: "MIT Sloan School of Management",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Engineering Leadership at Scale",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s2",
        name: "Organizational Development",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s3",
        name: "Strategic Planning",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s4",
        name: "Talent Development & Coaching",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s5",
        name: "Distributed Systems",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s6",
        name: "Cloud Architecture",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s7",
        name: "Agile & Lean Methodologies",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s8",
        name: "Cross-functional Leadership",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s9",
        name: "Technical Roadmapping",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s10",
        name: "Engineering Operations",
        level: "Advanced",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Cloud Infrastructure Platform",
        description:
          "Led 30-engineer organization delivering multi-tenant cloud platform for 1000+ enterprise customers. Achieved 99.99% uptime SLA and $20M+ ARR. Built team culture focused on ownership and customer impact.",
        visibility: "public",
      },
      {
        id: "p2",
        name: "Engineering Transformation Initiative",
        description:
          "Drove organizational transformation implementing modern engineering practices. Reduced deployment frequency from monthly to daily. Improved employee satisfaction scores by 40%.",
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  // 10. Director of Engineering
  "10": {
    id: "demo-dir-engineering",
    versionId: "v1",
    title: "Director of Engineering",
    slug: "kavita-desai",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Kavita Desai",
      title: "Director of Engineering",
      email: "kavita.desai@example.com",
      phone: "+91 90987 65432",
      location: "Mumbai, India",
      linkedin: "linkedin.com/in/kavita-desai-director",
      github: "github.com/kavita-engineering",
    },
    contact: {
      email: { value: "kavita.desai@example.com", visibility: "public" },
      phone: { value: "+91 90987 65432", visibility: "public" },
    },
    summary:
      "Director of Engineering with 14+ years of technical experience and 7+ years of leadership managing organizations of 60+ engineers. Built and scaled engineering teams delivering products serving 100M+ users with $100M+ annual revenue impact. Strategic leader combining deep technical expertise with business acumen, organizational development, and executive presence. Proven ability to drive technical vision, build high-performing teams, and align engineering strategy with company objectives.",
    experience: [
      {
        id: "exp-1",
        company: "Global SaaS Corporation",
        role: "Director of Engineering",
        startDate: "2019-06",
        endDate: "Present",
        description:
          "Lead engineering organization of 65 engineers across 6 teams building enterprise SaaS platform.\n• Scaled engineering from 25 to 65 engineers while maintaining quality and velocity.\n• Delivered platform supporting 100M+ users generating $100M+ ARR with 99.99% uptime.\n• Drove technical strategy and multi-year roadmap aligned with company growth objectives.\n• Reduced infrastructure costs by $15M+ annually through architectural optimization.\n• Improved engineering productivity by 70% through platform investments and process improvements.\n• Built diverse and inclusive team with 35% women engineers (2x industry average).\n• Managed 5 Engineering Managers and 2 Staff Engineers developing next generation of leaders.\n• Partnered with C-suite on product strategy, technical investments, and organizational planning.\n• Led security and compliance initiatives achieving SOC2, ISO 27001, and GDPR compliance.\n• Established engineering KPIs and metrics improving visibility into team performance and impact.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "FinTech Unicorn",
        role: "Senior Engineering Manager",
        startDate: "2016-03",
        endDate: "2019-05",
        description:
          "Led engineering organization of 30 engineers building payment and banking platform.\n• Built platform processing $500M+ annual payment volume with zero fraud incidents.\n• Drove cloud migration saving $5M+ annually while improving performance 3x.\n• Established engineering excellence practices including design reviews, testing standards, and SLOs.\n• Grew team from 12 to 30 engineers through strategic hiring and talent development.",
        visibility: "public",
      },
      {
        id: "exp-3",
        company: "E-Commerce Platform",
        role: "Engineering Manager",
        startDate: "2012-07",
        endDate: "2016-02",
        description:
          "Managed teams building marketplace platform serving 10M+ users.\n• Led development of recommendation engine increasing revenue by $10M+ annually.\n• Built search and discovery features improving conversion rate by 30%.\n• Mentored engineers on technical skills and career development.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Indian Institute of Technology (IIT) Bombay",
        degree: "B.Tech in Computer Science & Engineering",
        startDate: "2007",
        endDate: "2011",
        description: "CGPA: 9.3/10",
        visibility: "public",
      },
      {
        id: "edu-2",
        institution: "Indian School of Business (ISB)",
        degree: "Executive MBA",
        startDate: "2018",
        endDate: "2019",
        description: "Focus: Technology Strategy and Leadership",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Engineering Leadership & Strategy",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s2",
        name: "Organizational Scaling",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s3",
        name: "Technical Vision & Roadmapping",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s4",
        name: "Business Strategy Alignment",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s5",
        name: "Executive Communication",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s6",
        name: "Talent Development at Scale",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s7",
        name: "Distributed Systems Architecture",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s8",
        name: "Cloud & Platform Engineering",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s9",
        name: "Engineering Operations",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s10",
        name: "Cross-functional Partnership",
        level: "Expert",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Enterprise SaaS Platform Transformation",
        description:
          "Led 65-engineer organization delivering next-gen platform serving 100M+ users. Achieved $100M+ ARR with 99.99% uptime. Reduced costs by $15M+ annually. Built inclusive team culture with industry-leading diversity metrics.",
        visibility: "public",
      },
      {
        id: "p2",
        name: "Global Compliance & Security Program",
        description:
          "Drove security and compliance transformation achieving SOC2, ISO 27001, and GDPR compliance. Built security-first culture across engineering organization. Zero security incidents in 3+ years.",
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  // 11. VP of Engineering
  "11": {
    id: "demo-vp-engineering",
    versionId: "v1",
    title: "Vice President of Engineering",
    slug: "arjun-mehta",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Arjun Mehta",
      title: "Vice President of Engineering",
      email: "arjun.mehta@example.com",
      phone: "+91 89876 54321",
      location: "Bangalore, India",
      linkedin: "linkedin.com/in/arjun-mehta-vp",
      github: "github.com/arjun-vpe",
    },
    contact: {
      email: { value: "arjun.mehta@example.com", visibility: "public" },
      phone: { value: "89876 54321", visibility: "public" },
    },
    summary:
      "Vice President of Engineering with 16+ years of technical experience and 10+ years of leadership building world-class engineering organizations. Scaled teams from 30 to 150+ engineers while delivering products serving 200M+ users with $500M+ revenue impact. Strategic executive combining technical depth, business acumen, and organizational leadership. Proven track record of defining technical vision, building engineering culture, recruiting top talent, and driving company-wide transformation initiatives.",
    experience: [
      {
        id: "exp-1",
        company: "TechGiant Corporation",
        role: "Vice President of Engineering",
        startDate: "2020-01",
        endDate: "Present",
        description:
          "Lead global engineering organization of 150 engineers across 4 offices building enterprise cloud platform.\n• Scaled engineering from 60 to 150 engineers while improving quality, velocity, and employee satisfaction.\n• Delivered platform serving 200M+ users generating $500M+ ARR with 99.995% uptime SLA.\n• Defined and executed 3-year technical strategy aligned with company's $1B revenue goal.\n• Reduced annual infrastructure costs by $30M+ through multi-cloud strategy and optimization.\n• Built engineering culture of innovation, ownership, and customer obsession (eNPS 75+).\n• Established engineering career framework and leveling system adopted across organization.\n• Managed leadership team of 4 Directors, 12 Engineering Managers, and 8 Staff+ Engineers.\n• Partnered with CEO, CPO, and Board on product strategy, technical investments, and M&A due diligence.\n• Led acquisition integration of 2 companies (40+ engineers) with seamless cultural and technical integration.\n• Drove diversity initiatives achieving 40% women in engineering (3x improvement).\n• Represented company at industry conferences and recruited top talent from FAANG companies.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "Scale-Up Unicorn",
        role: "Director of Engineering",
        startDate: "2015-08",
        endDate: "2019-12",
        description:
          "Led engineering organization of 80 engineers building fintech platform during hypergrowth.\n• Scaled team from 20 to 80 engineers supporting company growth from $10M to $200M ARR.\n• Built payment infrastructure processing $2B+ annual volume with zero security breaches.\n• Drove cloud-native transformation reducing time-to-market by 60%.\n• Established engineering operations and DevOps practices improving deployment frequency 10x.\n• Recruited and developed 3 Engineering Directors who later became VPs at other companies.",
        visibility: "public",
      },
      {
        id: "exp-3",
        company: "Product Company",
        role: "Senior Engineering Manager",
        startDate: "2011-06",
        endDate: "2015-07",
        description:
          "Led multiple teams building consumer product serving 20M+ users.\n• Built mobile platforms (iOS/Android) from ground up reaching #1 in app store category.\n• Architected backend infrastructure scaling from 1M to 20M users.\n• Grew team from 8 to 35 engineers through strategic hiring and retention.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Indian Institute of Technology (IIT) Delhi",
        degree: "B.Tech in Computer Science & Engineering",
        startDate: "2004",
        endDate: "2008",
        description: "CGPA: 9.5/10 | President's Gold Medal",
        visibility: "public",
      },
      {
        id: "edu-2",
        institution: "Stanford University Graduate School of Business",
        degree: "Executive Program in Leadership",
        startDate: "2019",
        endDate: "2019",
        description: "Advanced leadership and business strategy",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Executive Leadership",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s2",
        name: "Organizational Strategy & Scaling",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s3",
        name: "Technical Vision & Architecture",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s4",
        name: "Business-Technology Alignment",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s5",
        name: "M&A Integration",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s6",
        name: "Board-level Communication",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s7",
        name: "Engineering Culture Building",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s8",
        name: "Executive Talent Development",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s9",
        name: "Cloud & Platform Strategy",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s10",
        name: "P&L Management",
        level: "Advanced",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Global Engineering Transformation",
        description:
          "Led 150-engineer organization delivering enterprise platform serving 200M+ users with $500M+ ARR. Scaled team 2.5x while improving quality and culture. Reduced costs by $30M+ annually. Built industry-leading engineering culture.",
        visibility: "public",
      },
      {
        id: "p2",
        name: "Multi-Company Acquisition Integration",
        description:
          "Successfully integrated 2 acquired companies (40+ engineers, $50M+ value) into engineering organization. Achieved seamless technical and cultural integration with 95% retention rate.",
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  // 12. CTO
  "12": {
    id: "demo-cto",
    versionId: "v1",
    title: "Chief Technology Officer",
    slug: "deepak-kumar",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Deepak Kumar",
      title: "Chief Technology Officer",
      email: "deepak.kumar@example.com",
      phone: "+91 88765 43210",
      location: "Bangalore, India",
      linkedin: "linkedin.com/in/deepak-kumar-cto",
      github: "github.com/deepak-cto",
    },
    contact: {
      email: { value: "deepak.kumar@example.com", visibility: "public" },
      phone: { value: "+91 88765 43210", visibility: "public" },
    },
    summary:
      "Chief Technology Officer with 18+ years of experience building and scaling technology organizations from startup to unicorn stage. Led engineering teams of 200+ delivering products serving 500M+ users with $1B+ revenue impact. Strategic technology executive with proven track record of defining technical vision, driving innovation, building world-class teams, and partnering with C-suite on business strategy. Expert in cloud architecture, AI/ML, platform engineering, and organizational transformation.",
    experience: [
      {
        id: "exp-1",
        company: "Unicorn Tech Inc.",
        role: "Chief Technology Officer",
        startDate: "2018-03",
        endDate: "Present",
        description:
          "Lead all technology functions including Engineering, Product, Data Science, Security, and IT for $1B+ valuation company.\n• Scaled technology organization from 50 to 250 people across 5 global offices.\n• Delivered platform serving 500M+ users with 99.99% uptime generating $1B+ annual revenue.\n• Defined and executed technology strategy supporting company's path to IPO.\n• Built AI/ML platform powering personalization engine increasing revenue by $200M+ annually.\n• Reduced technology costs by $50M+ annually through cloud optimization and architectural improvements.\n• Led security and compliance transformation achieving SOC2 Type II, ISO 27001, PCI DSS certification.\n• Built diverse leadership team of 5 VPs, 15 Directors, and 30+ senior ICs from top tech companies.\n• Partnered with CEO and Board on product strategy, M&A due diligence, and strategic technology investments.\n• Led acquisition and integration of 4 companies ($300M+ combined value) expanding product capabilities.\n• Represented company at industry conferences, Board meetings, and investor presentations.\n• Established engineering brand attracting top 1% talent from FAANG and unicorn companies.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "Growth Stage Startup",
        role: "VP of Engineering",
        startDate: "2013-06",
        endDate: "2018-02",
        description:
          "Led engineering organization through hypergrowth from Series A to Series C ($250M valuation).\n• Scaled engineering from 15 to 120 people supporting growth from $5M to $100M ARR.\n• Built cloud-native platform handling 100M+ daily active users with sub-100ms latency.\n• Established engineering practices, technical standards, and development processes.\n• Drove adoption of microservices, containerization, and modern DevOps practices.\n• Recruited and developed executive leadership team including 3 Directors of Engineering.",
        visibility: "public",
      },
      {
        id: "exp-3",
        company: "Enterprise Software Company",
        role: "Director of Engineering / Architect",
        startDate: "2008-07",
        endDate: "2013-05",
        description:
          "Led technical architecture and platform development for enterprise products.\n• Architected multi-tenant SaaS platform supporting 1000+ enterprise customers.\n• Built distributed systems infrastructure processing 1TB+ data daily.\n• Grew team from 10 to 50 engineers across backend, frontend, and data teams.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Indian Institute of Technology (IIT) Kharagpur",
        degree: "B.Tech in Computer Science & Engineering",
        startDate: "2002",
        endDate: "2006",
        description: "CGPA: 9.7/10 | Institute Silver Medal",
        visibility: "public",
      },
      {
        id: "edu-2",
        institution: "Massachusetts Institute of Technology (MIT)",
        degree: "M.S. in Computer Science",
        startDate: "2006",
        endDate: "2008",
        description: "Focus: Distributed Systems and AI",
        visibility: "public",
      },
      {
        id: "edu-3",
        institution: "Harvard Business School",
        degree: "Executive Education - CTO Program",
        startDate: "2017",
        endDate: "2017",
        description: "Technology leadership and business strategy",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Executive Technology Leadership",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s2",
        name: "Technology Strategy & Vision",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s3",
        name: "Organizational Scaling (0→250)",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s4",
        name: "Product & Business Strategy",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s5",
        name: "M&A Due Diligence & Integration",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s6",
        name: "Board & Investor Relations",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s7",
        name: "AI/ML & Data Strategy",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s8",
        name: "Cloud Architecture at Scale",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s9",
        name: "Security & Compliance",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s10",
        name: "Executive Team Building",
        level: "Expert",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Unicorn-Scale Technology Platform",
        description:
          "Built and scaled technology organization from 50 to 250 people supporting company growth to $1B+ valuation. Delivered platform serving 500M+ users with $1B+ annual revenue. Led company through successful Series D and path to IPO.",
        visibility: "public",
      },
      {
        id: "p2",
        name: "AI-Powered Personalization Engine",
        description:
          "Led development of machine learning platform powering personalization across product. Increased user engagement by 50% and revenue by $200M+ annually. Built from ground up with scalable ML infrastructure.",
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  // 13. Technical Project Manager
  "13": {
    id: "demo-project-manager",
    versionId: "v1",
    title: "Technical Project Manager",
    slug: "neha-gupta",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Neha Gupta",
      title: "Technical Project Manager",
      email: "neha.gupta@example.com",
      phone: "+91 87654 32109",
      location: "Noida, India",
      linkedin: "linkedin.com/in/neha-gupta-tpm",
      github: "github.com/neha-tpm",
    },
    contact: {
      email: { value: "neha.gupta@example.com", visibility: "public" },
      phone: { value: "+91 87654 32109", visibility: "public" },
    },
    summary:
      "Technical Project Manager with 5+ years of experience delivering complex software projects across web, mobile, and cloud platforms. Strong technical background combined with excellent stakeholder management and Agile expertise. Successfully delivered 15+ projects on time and within budget, with proven ability to coordinate cross-functional teams, manage risks, and drive execution. Certified Scrum Master (CSM) and PMP with passion for process improvement and team enablement.",
    experience: [
      {
        id: "exp-1",
        company: "TechSolutions Global",
        role: "Technical Project Manager",
        startDate: "2021-04",
        endDate: "Present",
        description:
          "Manage multiple concurrent projects for enterprise SaaS platform serving 100K+ users.\n• Led cloud migration project (50+ microservices) completed 2 months ahead of schedule saving $500K.\n• Coordinated cross-functional teams of 20+ members (Engineering, QA, DevOps, Design) across 3 time zones.\n• Reduced project delivery time by 30% through implementation of Agile best practices.\n• Managed $2M+ annual project budget with 98% budget adherence.\n• Implemented JIRA workflows and dashboards improving project visibility and stakeholder satisfaction.\n• Conducted risk assessments and mitigation planning reducing project blockers by 40%.\n• Facilitated sprint planning, daily standups, retrospectives, and demos for 4 Scrum teams.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "Digital Innovations Inc.",
        role: "Associate Project Manager",
        startDate: "2019-06",
        endDate: "2021-03",
        description:
          "Managed web and mobile application projects for B2C fintech platform.\n• Delivered mobile app redesign project (iOS + Android) to 2M+ users with 4.5+ star rating.\n• Coordinated with Product, Engineering, and QA teams to define requirements and timelines.\n• Created detailed project plans, tracked progress, and reported to stakeholders weekly.\n• Managed vendor relationships for third-party integrations and outsourced development.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Delhi Technological University (DTU)",
        degree: "B.Tech in Information Technology",
        startDate: "2015",
        endDate: "2019",
        description: "CGPA: 8.6/10",
        visibility: "public",
      },
      {
        id: "edu-2",
        institution: "Professional Certifications",
        degree: "Certified Scrum Master (CSM) | PMP Certified",
        startDate: "2020",
        endDate: "2021",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Agile & Scrum",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s2",
        name: "JIRA & Confluence",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s3",
        name: "Project Planning & Scheduling",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s4",
        name: "Risk Management",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s5",
        name: "Stakeholder Management",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s6",
        name: "Technical Documentation",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s7",
        name: "Budget Management",
        level: "Intermediate",
        visibility: "public",
      },
      {
        id: "s8",
        name: "Software Development Lifecycle",
        level: "Advanced",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Enterprise Cloud Migration",
        description:
          "Led migration of 50+ microservices to AWS from on-premise infrastructure. Coordinated 5 engineering teams across 6 months. Completed 2 months early with zero downtime. Saved $500K annually.",
        visibility: "public",
      },
      {
        id: "p2",
        name: "Mobile App Redesign & Launch",
        description:
          "Managed end-to-end redesign and launch of iOS and Android apps. Coordinated with Design, Engineering, and Marketing. Achieved 4.5+ star rating and 30% increase in user engagement.",
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  // 14. Senior Technical Project Manager
  "14": {
    id: "demo-senior-pm",
    versionId: "v1",
    title: "Senior Technical Project Manager",
    slug: "amit-shah",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Amit Shah",
      title: "Senior Technical Project Manager",
      email: "amit.shah@example.com",
      phone: "+91 86543 21098",
      location: "Pune, India",
      linkedin: "linkedin.com/in/amit-shah-stpm",
      github: "github.com/amit-tpm",
    },
    contact: {
      email: { value: "amit.shah@example.com", visibility: "public" },
      phone: { value: "+91 86543 21098", visibility: "public" },
    },
    summary:
      "Senior Technical Project Manager with 8+ years of experience leading large-scale technology initiatives across cloud infrastructure, platform engineering, and enterprise software. Delivered 40+ projects with combined value of $50M+ managing teams of 50+ members across global locations. Expert in Agile transformation, risk management, and stakeholder alignment. PMP and SAFe certified with strong technical background enabling effective collaboration with engineering teams.",
    experience: [
      {
        id: "exp-1",
        company: "Enterprise Cloud Systems",
        role: "Senior Technical Project Manager",
        startDate: "2019-08",
        endDate: "Present",
        description:
          "Lead portfolio of strategic technology projects for enterprise cloud platform serving 5000+ customers.\n• Managed $15M+ annual project portfolio across infrastructure, platform, and product initiatives.\n• Led digital transformation program (30+ projects, 50+ team members) delivered on time generating $10M+ revenue.\n• Established PMO practices and governance framework adopted across 100+ person engineering org.\n• Reduced average project delivery time by 45% through process optimization and automation.\n• Managed relationships with C-level executives providing weekly status updates and quarterly business reviews.\n• Coordinated cross-functional teams across Engineering, Product, Sales, and Customer Success.\n• Implemented agile scaling framework (SAFe) improving cross-team collaboration and delivery predictability.\n• Mentored 3 junior project managers on best practices and stakeholder management.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "FinTech Solutions Ltd.",
        role: "Technical Project Manager",
        startDate: "2016-05",
        endDate: "2019-07",
        description:
          "Managed complex projects for payment processing and banking platform.\n• Delivered PCI DSS compliance project on time ensuring regulatory requirements were met.\n• Led API platform development serving 500+ third-party integrations.\n• Managed vendor relationships for core banking system implementation ($5M contract).\n• Coordinated offshore teams across India, US, and Europe ensuring seamless delivery.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Pune Institute of Technology",
        degree: "B.E. in Computer Engineering",
        startDate: "2012",
        endDate: "2016",
        description: "CGPA: 8.7/10",
        visibility: "public",
      },
      {
        id: "edu-2",
        institution: "Professional Certifications",
        degree: "PMP | SAFe 5.0 Agilist | AWS Certified Cloud Practitioner",
        startDate: "2017",
        endDate: "2021",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Program & Portfolio Management",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s2",
        name: "Agile at Scale (SAFe)",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s3",
        name: "Risk & Issue Management",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s4",
        name: "Executive Stakeholder Management",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s5",
        name: "Budget & Resource Planning",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s6",
        name: "Vendor Management",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s7",
        name: "Cloud Technologies (AWS, Azure)",
        level: "Intermediate",
        visibility: "public",
      },
      {
        id: "s8",
        name: "Process Improvement & PMO",
        level: "Expert",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Digital Transformation Program",
        description:
          "Led enterprise-wide digital transformation initiative with 30+ projects and 50+ team members. Delivered in 18 months generating $10M+ incremental revenue. Achieved 100% on-time delivery rate.",
        visibility: "public",
      },
      {
        id: "p2",
        name: "Cloud Infrastructure Modernization",
        description:
          "Managed migration of 200+ applications to AWS cloud infrastructure. $8M budget, 12-month timeline, zero downtime. Reduced operational costs by 40% while improving performance 3x.",
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  // 15. Product Manager
  "15": {
    id: "demo-product-manager",
    versionId: "v1",
    title: "Product Manager",
    slug: "ritika-sinha",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Ritika Sinha",
      title: "Product Manager",
      email: "ritika.sinha@example.com",
      phone: "+91 85432 10987",
      location: "Bangalore, India",
      linkedin: "linkedin.com/in/ritika-sinha-pm",
      github: "github.com/ritika-pm",
    },
    contact: {
      email: { value: "ritika.sinha@example.com", visibility: "public" },
      phone: { value: "+91 85432 10987", visibility: "public" },
    },
    summary:
      "Product Manager with 4+ years of experience building customer-centric products for SaaS and fintech platforms. Launched 5+ products serving 500K+ users with measurable business impact. Strong analytical skills combined with user empathy and technical understanding. Expert in product strategy, roadmapping, and cross-functional collaboration. Passionate about solving customer problems through data-driven decision making and iterative development.",
    experience: [
      {
        id: "exp-1",
        company: "SaaS Innovations Inc.",
        role: "Product Manager",
        startDate: "2021-07",
        endDate: "Present",
        description:
          "Own product roadmap and strategy for B2B SaaS platform serving 10K+ business customers.\n• Launched analytics dashboard increasing customer engagement by 45% and reducing churn by 20%.\n• Drove $2M+ ARR growth through new feature releases based on customer research and data analysis.\n• Conducted 100+ customer interviews identifying key pain points and prioritizing feature backlog.\n• Collaborated with Engineering, Design, Sales, and Customer Success teams to deliver quarterly roadmap.\n• Defined and tracked product KPIs (activation, retention, revenue) reporting to leadership monthly.\n• Wrote detailed PRDs, user stories, and acceptance criteria for engineering team.\n• Led go-to-market planning and product launches coordinating across multiple teams.\n• Implemented A/B testing framework improving feature adoption by 30%.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "FinTech Startup",
        role: "Associate Product Manager",
        startDate: "2019-08",
        endDate: "2021-06",
        description:
          "Managed payment and checkout experience for digital wallet serving 500K+ users.\n• Launched one-click checkout feature increasing conversion rate by 25%.\n• Conducted user research and usability testing to improve payment flow reducing drop-off by 35%.\n• Analyzed user behavior data using Mixpanel and Google Analytics to identify optimization opportunities.\n• Coordinated with engineering team to prioritize bug fixes and feature enhancements.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Indian Institute of Management (IIM) Ahmedabad",
        degree: "MBA",
        startDate: "2017",
        endDate: "2019",
        description: "Specialization: Product Management & Marketing",
        visibility: "public",
      },
      {
        id: "edu-2",
        institution: "Delhi College of Engineering",
        degree: "B.Tech in Computer Science",
        startDate: "2013",
        endDate: "2017",
        description: "CGPA: 8.5/10",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Product Strategy & Roadmapping",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s2",
        name: "User Research & Customer Interviews",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s3",
        name: "Data Analysis (SQL, Mixpanel, GA)",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s4",
        name: "A/B Testing & Experimentation",
        level: "Intermediate",
        visibility: "public",
      },
      {
        id: "s5",
        name: "Agile & Scrum",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s6",
        name: "Product Requirement Documents",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s7",
        name: "Go-to-Market Strategy",
        level: "Intermediate",
        visibility: "public",
      },
      {
        id: "s8",
        name: "Stakeholder Management",
        level: "Advanced",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Analytics Dashboard Launch",
        description:
          "Led end-to-end development and launch of customer analytics dashboard. Conducted user research, defined requirements, and coordinated with Engineering and Design. Increased engagement by 45% and reduced churn by 20%.",
        visibility: "public",
      },
      {
        id: "p2",
        name: "One-Click Checkout Feature",
        description:
          "Shipped one-click payment feature for 500K+ users. Improved conversion rate by 25% and reduced checkout abandonment by 35%. Managed full product lifecycle from ideation to launch.",
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  // 16. Senior Product Manager
  "16": {
    id: "demo-senior-pm-product",
    versionId: "v1",
    title: "Senior Product Manager",
    slug: "karan-malhotra",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Karan Malhotra",
      title: "Senior Product Manager",
      email: "karan.malhotra@example.com",
      phone: "+91 84321 09876",
      location: "Hyderabad, India",
      linkedin: "linkedin.com/in/karan-malhotra-spm",
      github: "github.com/karan-product",
    },
    contact: {
      email: { value: "karan.malhotra@example.com", visibility: "public" },
      phone: { value: "+91 84321 09876", visibility: "public" },
    },
    summary:
      "Senior Product Manager with 7+ years of experience building and scaling products from 0 to 1 and 1 to 100M+ users. Led product initiatives generating $50M+ revenue across B2B SaaS and consumer platforms. Strategic thinker with strong technical background, data-driven approach, and customer obsession. Expert in product strategy, growth, and cross-functional leadership. Passionate about building products that solve real customer problems at scale.",
    experience: [
      {
        id: "exp-1",
        company: "TechUnicorn Ltd.",
        role: "Senior Product Manager",
        startDate: "2020-05",
        endDate: "Present",
        description:
          "Lead product strategy and execution for enterprise SaaS platform serving 50K+ business customers.\n• Grew product line from $5M to $50M ARR through strategic feature development and market expansion.\n• Launched AI-powered recommendation engine increasing user engagement by 60% and revenue by $10M+.\n• Defined 3-year product vision and roadmap aligned with company's $200M ARR goal.\n• Led cross-functional team of 15 (Engineering, Design, Data Science) delivering quarterly OKRs.\n• Drove pricing and packaging strategy resulting in 30% increase in ARPU.\n• Conducted competitive analysis and market research informing product positioning and differentiation.\n• Established product analytics framework tracking 50+ KPIs across acquisition, activation, retention, revenue.\n• Mentored 2 Product Managers on product strategy, stakeholder management, and execution.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "Consumer Tech Startup",
        role: "Product Manager",
        startDate: "2017-06",
        endDate: "2020-04",
        description:
          "Owned product roadmap for consumer mobile app reaching 10M+ downloads.\n• Launched social features increasing DAU by 40% and session time by 50%.\n• Implemented growth experiments (A/B tests, feature flags) improving conversion funnel by 35%.\n• Analyzed user behavior using cohort analysis and retention curves to identify optimization opportunities.\n• Partnered with Marketing on user acquisition and retention campaigns.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Indian School of Business (ISB)",
        degree: "MBA",
        startDate: "2015",
        endDate: "2017",
        description: "Specialization: Product Management & Strategy",
        visibility: "public",
      },
      {
        id: "edu-2",
        institution: "BITS Pilani",
        degree: "B.E. in Computer Science",
        startDate: "2011",
        endDate: "2015",
        description: "CGPA: 8.9/10",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Product Strategy & Vision",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s2",
        name: "Growth & Monetization",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s3",
        name: "Data-Driven Decision Making",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s4",
        name: "SQL & Product Analytics",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s5",
        name: "A/B Testing & Experimentation",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s6",
        name: "Cross-functional Leadership",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s7",
        name: "Market Research & Competitive Analysis",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s8",
        name: "Pricing & Packaging",
        level: "Advanced",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "AI-Powered Recommendation System",
        description:
          "Led development of ML-powered recommendation engine for B2B platform. Increased engagement by 60% and generated $10M+ incremental revenue. Coordinated with Data Science and Engineering teams.",
        visibility: "public",
      },
      {
        id: "p2",
        name: "Pricing Strategy Overhaul",
        description:
          "Redesigned pricing and packaging strategy based on customer research and competitive analysis. Increased ARPU by 30% and reduced sales cycle time by 25%. Led cross-functional pricing committee.",
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  // 17. DevOps Engineer
  "17": {
    id: "demo-devops-engineer",
    versionId: "v1",
    title: "DevOps Engineer | SRE",
    slug: "prakash-rao",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Prakash Rao",
      title: "DevOps Engineer | Site Reliability Engineer",
      email: "prakash.rao@example.com",
      phone: "+91 83210 98765",
      location: "Bangalore, India",
      linkedin: "linkedin.com/in/prakash-rao-devops",
      github: "github.com/prakash-sre",
    },
    contact: {
      email: { value: "prakash.rao@example.com", visibility: "public" },
      phone: { value: "+91 83210 98765", visibility: "public" },
    },
    summary:
      "DevOps Engineer with 5+ years of experience building and maintaining cloud infrastructure and CI/CD pipelines for high-traffic applications. Expert in Kubernetes, AWS, and Infrastructure as Code. Improved deployment frequency by 10x while reducing incidents by 60% through automation and observability. Strong focus on reliability, scalability, and developer experience. Passionate about building robust systems that enable engineering teams to ship faster with confidence.",
    experience: [
      {
        id: "exp-1",
        company: "CloudScale Technologies",
        role: "Senior DevOps Engineer",
        startDate: "2021-09",
        endDate: "Present",
        description:
          "Build and maintain cloud infrastructure for SaaS platform serving 1M+ users across 5 AWS regions.\n• Architected Kubernetes infrastructure handling 10K+ pods with auto-scaling and zero-downtime deployments.\n• Reduced deployment time from 2 hours to 10 minutes through CI/CD pipeline optimization.\n• Implemented infrastructure-as-code using Terraform managing 500+ cloud resources.\n• Built observability stack (Prometheus, Grafana, Loki) reducing MTTR from 1 hour to 10 minutes.\n• Saved $200K+ annually through AWS cost optimization (rightsizing, spot instances, reserved capacity).\n• Automated incident response with PagerDuty and Slack integration improving on-call experience.\n• Implemented GitOps workflow using ArgoCD enabling self-service deployments for 20+ teams.\n• Achieved 99.95% uptime SLA through proactive monitoring and automated remediation.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "E-Commerce Platform",
        role: "DevOps Engineer",
        startDate: "2019-06",
        endDate: "2021-08",
        description:
          "Managed infrastructure and deployment pipelines for e-commerce platform handling 50K daily orders.\n• Built CI/CD pipelines using Jenkins and GitLab CI reducing release cycle from weekly to daily.\n• Migrated applications from VMs to Docker containers improving resource utilization by 40%.\n• Implemented centralized logging using ELK stack processing 1TB+ daily logs.\n• Automated database backups and disaster recovery reducing RPO from 24 hours to 1 hour.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Bangalore Institute of Technology",
        degree: "B.E. in Computer Science",
        startDate: "2015",
        endDate: "2019",
        description: "CGPA: 8.4/10",
        visibility: "public",
      },
      {
        id: "edu-2",
        institution: "Certifications",
        degree: "AWS Solutions Architect | CKA | Terraform Associate",
        startDate: "2020",
        endDate: "2022",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Kubernetes (EKS, Kops)",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s2",
        name: "AWS (EC2, ECS, Lambda, RDS)",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s3",
        name: "Terraform & IaC",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s4",
        name: "Docker & Containerization",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s5",
        name: "CI/CD (Jenkins, GitLab, ArgoCD)",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s6",
        name: "Monitoring (Prometheus, Grafana)",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s7",
        name: "Scripting (Bash, Python)",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s8",
        name: "Linux System Administration",
        level: "Expert",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Kubernetes Infrastructure Platform",
        description:
          "Built production-grade Kubernetes platform on AWS EKS supporting 50+ microservices. Implemented auto-scaling, service mesh (Istio), and GitOps deployments. Achieved 99.95% uptime with zero-downtime deployments.",
        visibility: "public",
      },
      {
        id: "p2",
        name: "Observability & Monitoring Stack",
        description:
          "Designed and implemented comprehensive observability solution using Prometheus, Grafana, and Loki. Monitors 100+ services and 10K+ metrics. Reduced MTTR by 85% through better visibility and automated alerting.",
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  // 18. Security Engineer
  "18": {
    id: "demo-security-engineer",
    versionId: "v1",
    title: "Security Engineer | AppSec Specialist",
    slug: "aditi-khanna",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Aditi Khanna",
      title: "Security Engineer",
      email: "aditi.khanna@example.com",
      phone: "+91 82109 87654",
      location: "Delhi, India",
      linkedin: "linkedin.com/in/aditi-khanna-security",
      github: "github.com/aditi-sec",
    },
    contact: {
      email: { value: "aditi.khanna@example.com", visibility: "public" },
      phone: { value: "+91 82109 87654", visibility: "public" },
    },
    summary:
      "Security Engineer with 6+ years of experience building secure systems and implementing security best practices across cloud infrastructure and application development. Expert in application security, penetration testing, and compliance. Led security initiatives achieving SOC2 Type II and ISO 27001 certifications. Passionate about proactive security, developer enablement, and building security into development lifecycle. Strong collaborator bridging security and engineering teams.",
    experience: [
      {
        id: "exp-1",
        company: "FinTech Security Corp",
        role: "Senior Security Engineer",
        startDate: "2020-07",
        endDate: "Present",
        description:
          "Lead application security and infrastructure security for fintech platform processing $1B+ transactions.\n• Built secure-by-default infrastructure on AWS achieving SOC2 Type II and ISO 27001 compliance.\n• Implemented automated security testing in CI/CD pipeline catching 95% of vulnerabilities pre-production.\n• Conducted 50+ security code reviews and threat modeling sessions for critical features.\n• Developed security training program for 100+ engineers improving secure coding practices.\n• Led incident response for security events with average detection-to-resolution time of 30 minutes.\n• Implemented Zero Trust architecture using Okta and AWS IAM reducing attack surface by 70%.\n• Built vulnerability management program reducing critical CVEs from 50+ to near-zero.\n• Automated security compliance checks saving 100+ hours monthly of manual work.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "CloudSecurity Systems",
        role: "Application Security Engineer",
        startDate: "2018-06",
        endDate: "2020-06",
        description:
          "Performed security assessments and penetration testing for SaaS applications.\n• Conducted 30+ penetration tests identifying and remediating critical vulnerabilities.\n• Implemented OWASP Top 10 security controls across web applications.\n• Built security tooling for static analysis (SAST) and dynamic analysis (DAST).\n• Responded to security incidents and coordinated with engineering teams on remediation.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Delhi University",
        degree: "B.Tech in Computer Science & Engineering",
        startDate: "2014",
        endDate: "2018",
        description: "CGPA: 8.6/10 | Focus: Cybersecurity",
        visibility: "public",
      },
      {
        id: "edu-2",
        institution: "Certifications",
        degree: "OSCP | CEH | AWS Security Specialty | CISSP",
        startDate: "2019",
        endDate: "2023",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Application Security (SAST/DAST)",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s2",
        name: "Penetration Testing",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s3",
        name: "Cloud Security (AWS, GCP)",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s4",
        name: "Security Compliance (SOC2, ISO 27001)",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s5",
        name: "Threat Modeling",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s6",
        name: "Incident Response",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s7",
        name: "Security Automation",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s8",
        name: "Python & Security Tools",
        level: "Expert",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "SOC2 Type II Compliance Program",
        description:
          "Led security compliance initiative achieving SOC2 Type II certification in 8 months. Implemented 150+ security controls across infrastructure and application layers. Zero findings in external audit.",
        visibility: "public",
      },
      {
        id: "p2",
        name: "Automated Security Testing Pipeline",
        description:
          "Built comprehensive security testing pipeline integrated into CI/CD. Includes SAST, DAST, dependency scanning, and secret detection. Catches 95% of vulnerabilities pre-production reducing security incidents by 80%.",
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  // 19. Data Scientist
  "19": {
    id: "demo-data-scientist",
    versionId: "v1",
    title: "Data Scientist | ML Engineer",
    slug: "rohan-joshi",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Rohan Joshi",
      title: "Data Scientist | Machine Learning Engineer",
      email: "rohan.joshi@example.com",
      phone: "+91 81098 76543",
      location: "Bangalore, India",
      linkedin: "linkedin.com/in/rohan-joshi-ds",
      github: "github.com/rohan-ml",
    },
    contact: {
      email: { value: "rohan.joshi@example.com", visibility: "public" },
      phone: { value: "+91 81098 76543", visibility: "public" },
    },
    summary:
      "Data Scientist with 5+ years of experience building machine learning models and data pipelines that drive business value. Developed recommendation systems, fraud detection models, and predictive analytics serving 10M+ users. Expert in Python, deep learning, and MLOps. Delivered ML projects generating $20M+ revenue impact. Strong collaborator translating complex data insights into actionable business recommendations. Passionate about using AI/ML to solve real-world problems at scale.",
    experience: [
      {
        id: "exp-1",
        company: "AI-Powered Platform Inc.",
        role: "Senior Data Scientist",
        startDate: "2021-04",
        endDate: "Present",
        description:
          "Lead ML initiatives for e-commerce platform serving 10M+ users with $100M+ annual GMV.\n• Built recommendation system increasing revenue by $15M+ annually through 25% improvement in CTR.\n• Developed fraud detection model reducing fraudulent transactions by 80% saving $5M+ annually.\n• Designed and deployed real-time ML inference pipeline processing 100K+ predictions/second.\n• Implemented A/B testing framework for ML models improving decision velocity by 3x.\n• Built MLOps infrastructure using Kubeflow and MLflow enabling team to deploy 5+ models monthly.\n• Mentored 2 junior data scientists on ML modeling and production best practices.\n• Collaborated with Product and Engineering teams to define ML product roadmap.\n• Published research on recommendation systems at internal ML conference.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "Analytics Startup",
        role: "Data Scientist",
        startDate: "2019-06",
        endDate: "2021-03",
        description:
          "Built predictive models and analytics for B2B SaaS platform.\n• Developed customer churn prediction model achieving 85% accuracy enabling proactive retention.\n• Created demand forecasting model improving inventory planning accuracy by 30%.\n• Built data pipelines using Airflow processing 10TB+ data daily.\n• Conducted exploratory data analysis and presented insights to stakeholders.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Indian Institute of Science (IISc) Bangalore",
        degree: "M.Tech in Computational Science",
        startDate: "2017",
        endDate: "2019",
        description:
          "CGPA: 9.1/10 | Thesis: Deep Learning for Recommendation Systems",
        visibility: "public",
      },
      {
        id: "edu-2",
        institution: "IIT Roorkee",
        degree: "B.Tech in Computer Science",
        startDate: "2013",
        endDate: "2017",
        description: "CGPA: 8.8/10",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Machine Learning & Deep Learning",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s2",
        name: "Python (NumPy, Pandas, Scikit-learn)",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s3",
        name: "TensorFlow & PyTorch",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s4",
        name: "SQL & Data Warehousing",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s5",
        name: "MLOps (Kubeflow, MLflow)",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s6",
        name: "A/B Testing & Experimentation",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s7",
        name: "Data Visualization (Tableau, Plotly)",
        level: "Intermediate",
        visibility: "public",
      },
      {
        id: "s8",
        name: "Cloud ML (AWS SageMaker, GCP AI)",
        level: "Intermediate",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Real-Time Recommendation Engine",
        description:
          "Built production recommendation system using collaborative filtering and deep learning. Serves 10M+ users with sub-100ms latency. Increased CTR by 25% and revenue by $15M+ annually. Deployed on Kubernetes with auto-scaling.",
        visibility: "public",
      },
      {
        id: "p2",
        name: "Fraud Detection System",
        description:
          "Developed ML-based fraud detection using gradient boosting and anomaly detection. Processes 1M+ transactions daily with 95% precision and 90% recall. Reduced fraud losses by $5M+ annually. Integrated with payment gateway via real-time API.",
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  // 20. Solutions Architect
  "20": {
    id: "demo-solutions-architect",
    versionId: "v1",
    title: "Solutions Architect | Cloud Architect",
    slug: "sanjay-patel",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Sanjay Patel",
      title: "Solutions Architect",
      email: "sanjay.patel@example.com",
      phone: "+91 80987 65432",
      location: "Mumbai, India",
      linkedin: "linkedin.com/in/sanjay-patel-architect",
      github: "github.com/sanjay-solutions",
    },
    contact: {
      email: { value: "sanjay.patel@example.com", visibility: "public" },
      phone: { value: "+91 80987 65432", visibility: "public" },
    },
    summary:
      "Solutions Architect with 10+ years of experience designing and implementing enterprise-grade cloud solutions on AWS and Azure. Led architecture for 50+ projects supporting 100M+ users with 99.99% uptime. Expert in microservices, serverless, and event-driven architectures. Proven ability to translate business requirements into scalable technical solutions while optimizing for cost, performance, and security. Strong communicator bridging business stakeholders and technical teams.",
    experience: [
      {
        id: "exp-1",
        company: "Cloud Consulting Partners",
        role: "Principal Solutions Architect",
        startDate: "2019-08",
        endDate: "Present",
        description:
          "Lead cloud architecture and digital transformation for enterprise clients across finance, healthcare, and retail.\n• Architected cloud solutions for 20+ enterprise clients with combined $500M+ annual revenue.\n• Designed multi-region disaster recovery solution achieving RPO < 5 min and RTO < 30 min for banking client.\n• Led cloud migration of 500+ applications from on-premise to AWS saving $10M+ annually.\n• Implemented microservices architecture for e-commerce platform handling 50M+ daily requests.\n• Built serverless data lake on AWS processing 100TB+ daily with sub-minute query latency.\n• Conducted architecture reviews and provided recommendations improving system reliability by 60%.\n• Developed Well-Architected Framework assessment tool adopted across 50+ client engagements.\n• Mentored team of 10 solutions architects on cloud design patterns and best practices.\n• Presented at AWS re:Invent on serverless architecture patterns.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "Enterprise Tech Corporation",
        role: "Senior Cloud Architect",
        startDate: "2015-06",
        endDate: "2019-07",
        description:
          "Designed cloud infrastructure for SaaS platform serving 5000+ enterprise customers.\n• Architected multi-tenant platform on AWS with tenant isolation and data security.\n• Implemented CI/CD pipelines and IaC using Terraform reducing deployment time by 80%.\n• Designed high-availability architecture achieving 99.99% uptime SLA.\n• Led cost optimization initiative saving $3M+ annually through rightsizing and reserved instances.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Mumbai University",
        degree: "B.E. in Computer Engineering",
        startDate: "2011",
        endDate: "2015",
        description: "CGPA: 8.7/10",
        visibility: "public",
      },
      {
        id: "edu-2",
        institution: "Certifications",
        degree:
          "AWS Solutions Architect Pro | Azure Solutions Architect | TOGAF",
        startDate: "2016",
        endDate: "2022",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Cloud Architecture (AWS, Azure)",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s2",
        name: "Microservices & Event-Driven Architecture",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s3",
        name: "Serverless (Lambda, API Gateway)",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s4",
        name: "Infrastructure as Code (Terraform, CloudFormation)",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s5",
        name: "System Design & Architecture Patterns",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s6",
        name: "Database Design (SQL, NoSQL)",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s7",
        name: "Security & Compliance",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s8",
        name: "Cost Optimization",
        level: "Expert",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Enterprise Cloud Migration",
        description:
          "Led migration of 500+ applications from on-premise data centers to AWS cloud. Designed hybrid cloud architecture with Direct Connect. Completed in 18 months with zero downtime. Saved $10M+ annually in infrastructure costs.",
        visibility: "public",
      },
      {
        id: "p2",
        name: "Serverless Data Lake",
        description:
          "Architected serverless data lake on AWS processing 100TB+ daily data. Used S3, Glue, Athena, and Lambda. Enabled real-time analytics with sub-minute query latency. Reduced data processing costs by 70%.",
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  // 21. CEO (Tech Background)
  "21": {
    id: "demo-ceo",
    versionId: "v1",
    title: "Chief Executive Officer | Co-Founder",
    slug: "rajiv-kumar",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Rajiv Kumar",
      title: "CEO & Co-Founder",
      email: "rajiv.kumar@example.com",
      phone: "+91 79876 54321",
      location: "Bangalore, India",
      linkedin: "linkedin.com/in/rajiv-kumar-ceo",
      github: "github.com/rajiv-founder",
    },
    contact: {
      email: { value: "rajiv.kumar@example.com", visibility: "public" },
      phone: { value: "+91 79876 54321", visibility: "public" },
    },
    summary:
      "CEO and Co-Founder with 20+ years of experience building and scaling technology companies from startup to unicorn stage. Led company growth from 0 to $500M+ valuation with 200+ employees across 4 countries. Strong technical background as former CTO combined with business acumen and leadership experience. Raised $150M+ from top-tier VCs including Sequoia and Accel. Passionate about building products that transform industries and creating inclusive, high-performing teams. Seeking Board opportunities and angel investing in early-stage tech startups.",
    experience: [
      {
        id: "exp-1",
        company: "TechVentures Inc. (Acquired)",
        role: "CEO & Co-Founder",
        startDate: "2015-01",
        endDate: "Present",
        description:
          "Founded and scaled B2B SaaS company from idea to acquisition in 8 years ($500M+ valuation).\n• Grew company from 2 co-founders to 200+ employees with $100M+ ARR and path to profitability.\n• Raised $150M across Series A, B, and C from Sequoia Capital, Accel, and Tiger Global.\n• Built product serving 5000+ enterprise customers including Fortune 500 companies.\n• Expanded to 4 countries (India, US, Singapore, UK) establishing global presence.\n• Recruited world-class leadership team including CTO from Google and VP Sales from Salesforce.\n• Defined company vision, strategy, and culture fostering innovation and customer obsession.\n• Led successful exit through acquisition by public company in 2023.\n• Negotiated partnerships with Microsoft, AWS, and Salesforce creating new distribution channels.\n• Built diverse and inclusive team with 40% women in leadership roles.\n• Featured in Forbes 30 Under 30 and Economic Times Startup Awards.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "CloudScale Systems",
        role: "CTO & Co-Founder",
        startDate: "2010-06",
        endDate: "2014-12",
        description:
          "Co-founded cloud infrastructure startup (acquired by TechCorp for $50M).\n• Built technical team of 30 engineers and defined product architecture.\n• Developed cloud platform serving 1000+ customers with 99.99% uptime.\n• Led engineering through product-market fit and scale from 0 to $10M ARR.\n• Managed technology due diligence for acquisition process.",
        visibility: "public",
      },
      {
        id: "exp-3",
        company: "Microsoft India",
        role: "Principal Engineering Manager",
        startDate: "2006-07",
        endDate: "2010-05",
        description:
          "Led engineering teams building Azure cloud services.\n• Managed team of 25 engineers across 3 countries.\n• Shipped 5+ major Azure features serving millions of customers.\n• Promoted to Principal level within 3 years for exceptional delivery and leadership.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Indian Institute of Technology (IIT) Bombay",
        degree: "B.Tech in Computer Science & Engineering",
        startDate: "2002",
        endDate: "2006",
        description: "CGPA: 9.6/10 | Institute Gold Medal",
        visibility: "public",
      },
      {
        id: "edu-2",
        institution: "Stanford University",
        degree: "M.S. in Computer Science",
        startDate: "2004",
        endDate: "2006",
        description: "Full scholarship | Focus: AI and Distributed Systems",
        visibility: "public",
      },
      {
        id: "edu-3",
        institution: "Harvard Business School",
        degree: "OPM - Owner/President Management Program",
        startDate: "2019",
        endDate: "2022",
        description: "Executive education for CEOs and business leaders",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Executive Leadership & Strategy",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s2",
        name: "Company Building (0→200+)",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s3",
        name: "Fundraising & Investor Relations",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s4",
        name: "Product Vision & Strategy",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s5",
        name: "M&A & Strategic Partnerships",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s6",
        name: "Board & C-Suite Management",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s7",
        name: "Technology & Engineering Leadership",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s8",
        name: "Go-to-Market Strategy",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s9",
        name: "Culture Building",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s10",
        name: "Public Speaking & Thought Leadership",
        level: "Expert",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Built & Exited TechVentures ($500M)",
        description:
          "Founded and scaled B2B SaaS unicorn from 0 to $100M+ ARR in 8 years. Raised $150M from top VCs. Built team of 200+ across 4 countries. Successfully exited through acquisition by public company in 2023.",
        visibility: "public",
      },
      {
        id: "p2",
        name: "Angel Investor & Advisor",
        description:
          "Active angel investor in 15+ early-stage startups. Advisor to 5 high-growth companies. Focus areas: B2B SaaS, AI/ML, Developer Tools. 3 successful exits generating 10x+ returns.",
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

interface DemoResumePageProps {
  params: Promise<{ id: string }>;
}

export default async function DemoResumePage({
  params,
}: DemoResumePageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const resumeData = DEMO_RESUMES[id];

  if (!resumeData) {
    notFound();
  }

  // Assign different templates to different resumes for visual variety
  const templateMap: Record<string, string> = {
    "1": "masonry-v1", // Original Anil A. - portfolio
    "2": "modern-creative-v1", // Fresh grad - creative
    "3": "standard-v1", // SDE1 - professional
    "4": "masonry-v1", // SDE2 - portfolio style
    "5": "standard-v1", // SDE3 - professional
    "6": "executive-v1", // Staff - executive
    "7": "masonry-v1", // Principal - portfolio
    "8": "executive-v1", // Engineering Manager
    "9": "standard-v1", // Senior EM
    "10": "executive-v1", // Director
    "11": "executive-v1", // VP
    "12": "executive-v1", // CTO
    "13": "modern-creative-v1", // TPM - creative
    "14": "standard-v1", // Senior TPM
    "15": "modern-creative-v1", // PM - creative
    "16": "masonry-v1", // Senior PM - portfolio
    "17": "standard-v1", // DevOps
    "18": "standard-v1", // Security
    "19": "masonry-v1", // Data Scientist
    "20": "standard-v1", // Solutions Architect
    "21": "executive-v1", // CEO
  };

  const templateId = templateMap[id] || "standard-v1";
  const template =
    RESUME_TEMPLATES.find((t) => t.id === templateId) || RESUME_TEMPLATES[0];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Floating Demo Notice - Sleek Glass Style */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-black/80 backdrop-blur-xl text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4 text-sm">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-white/90">
            <span className="font-medium text-white">Demo Profile</span>
            <span className="mx-2 text-white/30">•</span>
            Real resumes require recruiter permission
          </span>
          <Link
            href="/dashboard"
            className="ml-2 px-4 py-1.5 bg-white text-black text-xs font-semibold rounded-full hover:bg-white/90 transition-all hover:scale-105"
          >
            Create Yours
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div>
        <TemplateRenderer
          template={template}
          data={resumeData}
          isAuthenticated={false}
          onRequestAccess={() => {}}
        />
      </div>
    </div>
  );
}
