import { DashboardResume } from "@/types";

export const diverseDemoResumes5: Record<string, DashboardResume> = {
  "7": {
    id: "demo-principal",
    versionId: "v1",
    title: "Principal Engineer",
    slug: "vikram-singh",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Vikram Singh",
      title: "Principal Engineer - Platform Architecture",
      email: "vikram.singh@example.com",
      phone: "+91 93210 98765",
      location: "Gurgaon, Haryana",
      linkedin: "linkedin.com/in/vikramsingh-principal",
      github: "github.com/vikram-architect",
    },
    contact: {
      email: { value: "vikram.singh@example.com", visibility: "public" },
      phone: { value: "+91 93210 98765", visibility: "public" },
    },
    summary:
      "Principal Engineer specializing in large-scale distributed systems. 10+ years architecting platforms serving 50M+ users. Led technical strategy for 3 successful $100M+ products. Expert in system design, performance optimization, and cross-team technical leadership.",
    experience: [
      {
        id: "exp-1",
        company: "Global Tech Corp",
        role: "Principal Engineer",
        startDate: "2021-08",
        endDate: "Present",
        description:
          "**Technical Strategy & Architecture**\n• Define technical roadmap for platform serving 50M+ users across 15 countries\n• Architected multi-region deployment reducing latency by 70% (avg 850ms → 250ms)\n• Designed auto-scaling infrastructure handling 10x traffic spikes (Black Friday: 500K → 5M req/min)\n• Established engineering standards adopted across 12 teams (100+ engineers)\n\n**System Performance & Reliability**\n• Improved platform uptime from 99.5% to 99.95% (2.2 days → 4.4 hours downtime/year)\n• Reduced infrastructure costs by $1.2M/year through optimization and cloud resource management\n• Built chaos engineering program catching 80% of production issues in staging\n\n**Technical Leadership**\n• Mentor 8 senior engineers on system design and architecture\n• Lead architecture review board evaluating all major technical decisions\n• Established technical RFC process improving design quality and reducing rework by 40%",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "E-Commerce Giant India",
        role: "Staff Engineer",
        startDate: "2018-03",
        endDate: "2021-07",
        description:
          "• Architected catalog search system indexing 100M+ products with <100ms query latency\n• Led migration to Elasticsearch improving search relevance by 45% (measured by CTR)\n• Designed real-time inventory management system preventing $2M+ annual overselling losses\n• Built product recommendation engine driving 15% increase in cross-sell revenue ($18M ARR impact)",
        visibility: "public",
      },
      {
        id: "exp-3",
        company: "TechStar Solutions",
        role: "Senior Software Engineer",
        startDate: "2014-06",
        endDate: "2018-02",
        description:
          "• Led backend team of 6 engineers for core payment processing service ($50M annual volume)\n• Re-architected legacy monolith into microservices using Java Spring Boot and RabbitMQ\n• Reduced deployment errors by 90% by introducing automated testing and CI/CD pipelines\n• Performance tuned database queries reducing CPU utilization by 40% during peak load",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Indian Institute of Technology (IIT) Delhi",
        degree: "M.Tech in Computer Science",
        startDate: "2012",
        endDate: "2014",
        description:
          'Specialization: Distributed Systems | Thesis: "Consensus Algorithms in Large-Scale Data Centers"',
        visibility: "public",
      },
      {
        id: "edu-2",
        institution: "Delhi College of Engineering",
        degree: "B.Tech in Computer Engineering",
        startDate: "2008",
        endDate: "2012",
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
        name: "System Design at Scale",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s3",
        name: "Performance Engineering",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s4",
        name: "Java/Go/Python",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s5",
        name: "Kubernetes & Service Mesh",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s6",
        name: "AWS/GCP Multi-Cloud",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s7",
        name: "Elasticsearch & Search Systems",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s8",
        name: "Technical Strategy",
        level: "Expert",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Multi-Region Platform Architecture",
        description:
          "Designed globally distributed architecture serving 15 countries from 6 AWS regions. Implemented intelligent routing, data residency compliance, and active-active failover. Reduced cross-region latency by 70%. System handles 5M req/min peak with 99.95% uptime.",
        visibility: "public",
      },
      {
        id: "p2",
        name: "Cloud Cost Optimization Initiative",
        description:
          "Led organization-wide initiative to optimize cloud spend. Analyzed usage patterns, implemented auto-parking for dev environments, and migrated to spot instances for batch workloads. Resulted in $1.2M annual savings (35% bill reduction) without impacting performance.",
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
