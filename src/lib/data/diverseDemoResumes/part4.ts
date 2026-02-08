import { DashboardResume } from "@/types";

export const diverseDemoResumes4: Record<string, DashboardResume> = {
  "5": {
    id: "demo-achievement-sde3",
    versionId: "v1",
    title: "Senior Software Engineer",
    slug: "arjun-krishnan",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Arjun Krishnan",
      title: "Senior Software Engineer",
      email: "arjun.k@example.com",
      phone: "+91 95432 10987",
      location: "Hyderabad, Telangana",
      linkedin: "linkedin.com/in/arjunkrishnan-sde",
      github: "github.com/arjun-builds",
    },
    contact: {
      email: { value: "arjun.k@example.com", visibility: "public" },
      phone: { value: "+91 95432 10987", visibility: "public" },
    },
    summary:
      "Senior engineer with 5 years experience scaling systems from 10K to 10M users. Delivered $2.5M ARR through platform performance improvements. Specialize in high-throughput distributed systems and database optimization.",
    experience: [
      {
        id: "exp-1",
        company: "ScaleUp Technologies",
        role: "Senior Software Engineer (L5)",
        startDate: "2022-01",
        endDate: "Present",
        description:
          "🎯 IMPACT: Scaled platform from 100K to 2M users while reducing infrastructure costs by $180K/year\n\n• Architected event-driven microservices processing 15M+ events/day with 99.95% uptime\n• Reduced database query latency by 85% (2.4s → 350ms) through indexing and query optimization\n• Saved $180K/year by optimizing AWS infrastructure and implementing efficient caching strategies\n• Built automated deployment pipeline reducing release time from 4 hours to 12 minutes\n• Led incident response for 15+ production issues, achieving average MTTR of 18 minutes",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "FinTech Innovations Pvt. Ltd.",
        role: "Software Engineer II",
        startDate: "2020-03",
        endDate: "2021-12",
        description:
          "🎯 IMPACT: Delivered features generating $850K additional ARR in first year\n\n• Designed and launched payment reconciliation system processing $50M+ monthly transactions\n• Reduced payment failure rate from 12% to 1.8% saving $25K/month in lost revenue\n• Built fraud detection pipeline catching 99.2% of fraudulent transactions (vs 87% baseline)\n• Implemented rate limiting and circuit breakers improving API reliability to 99.9%",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Indian Institute of Technology (IIT) Madras",
        degree: "B.Tech in Computer Science",
        startDate: "2016",
        endDate: "2020",
        description: "Honors Degree | GPA: 8.8/10",
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
        name: "System Design",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s3",
        name: "Python & Java",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s4",
        name: "PostgreSQL/MySQL",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s5",
        name: "Redis & Elasticsearch",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s6",
        name: "Kafka & RabbitMQ",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s7",
        name: "AWS (EC2, S3, Lambda, SQS, DynamoDB)",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s8",
        name: "Docker & Kubernetes",
        level: "Advanced",
        visibility: "public",
      },
      {
        id: "s9",
        name: "Performance Optimization",
        level: "Expert",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "High-Throughput Event Processing Platform",
        description:
          "Architected distributed system handling 15M events/day with <500ms p99 latency. Auto-scaling infrastructure processing spikes of 50K events/second. Tech: Python, Kafka, Redis, PostgreSQL, Kubernetes. **Result:** Enabled real-time features serving 2M users.",
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  "6": {
    id: "demo-narrative-staff",
    versionId: "v1",
    title: "Staff Software Engineer",
    slug: "meera-reddy",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Meera Reddy",
      title: "Staff Software Engineer",
      email: "meera.reddy@example.com",
      phone: "+91 94321 09876",
      location: "Bangalore, Karnataka",
      linkedin: "linkedin.com/in/meerareddy-staff",
      github: "github.com/meera-tech",
    },
    contact: {
      email: { value: "meera.reddy@example.com", visibility: "public" },
      phone: { value: "+91 94321 09876", visibility: "public" },
    },
    summary:
      "When I joined TechGiant as an SDE2 in 2018, our monolithic codebase was crumbling under the weight of 50+ engineers making conflicting changes daily. Over the past 7 years, I've grown from individual contributor to Staff Engineer, leading the complete re-architecture of our platform. Today, I'm responsible for technical strategy across 3 engineering teams (22 engineers total), and I've designed systems that serve 5 million users daily while maintaining 99.99% uptime. My superpower is taking complex technical debt and transforming it into elegant, scalable solutions that empower product teams to ship faster.",
    experience: [
      {
        id: "exp-1",
        company: "TechGiant India",
        role: "Staff Software Engineer",
        startDate: "2023-06",
        endDate: "Present",
        description:
          "I lead technical vision for our Platform Engineering group. My biggest win was designing and executing our migration from monolith to microservices - a 18-month journey that transformed how our entire engineering org ships code. I created the migration strategy, built consensus across 8 teams, and personally architected 5 of our core services. The result? Deployment frequency went from weekly to 30x/day, and we cut our incident rate in half. I also established our Technical Design Review process, which has improved system quality and reduced post-launch issues by 60%. Currently working on our next big bet: real-time data streaming platform serving ML models.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "TechGiant India",
        role: "Senior Software Engineer",
        startDate: "2020-04",
        endDate: "2023-05",
        description:
          "This is where I transitioned from 'writing code' to 'multiplying impact through others.' I owned the complete rebuild of our notification system which was buckling under 100M+ notifications/day. Instead of just fixing the old system, I designed an event-driven architecture using Kafka that could scale to billions. The architecture I created became the template for 6 other team migrations. I also started mentoring junior engineers - 4 of my mentees have been promoted to senior roles.",
        visibility: "public",
      },
      {
        id: "exp-3",
        company: "TechGiant India",
        role: "Software Engineer II",
        startDate: "2018-07",
        endDate: "2020-03",
        description:
          "My early years were all about depth - going deep on database performance and API design. I became the go-to person for complex PostgreSQL queries and performance tuning. One database optimization I did reduced query times from 8 seconds to 200ms, which directly enabled our recommendations feature to launch.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "BITS Pilani",
        degree: "B.E. (Hons.) Computer Science",
        startDate: "2014",
        endDate: "2018",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "System Architecture",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s2",
        name: "Microservices Design",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s3",
        name: "Technical Leadership",
        level: "Expert",
        visibility: "public",
      },
      {
        id: "s4",
        name: "Java & Spring Boot",
        level: "Expert",
        visibility: "public",
      },
      { id: "s5", name: "Python", level: "Advanced", visibility: "public" },
      { id: "s6", name: "PostgreSQL", level: "Expert", visibility: "public" },
      {
        id: "s7",
        name: "Kafka & Event Streaming",
        level: "Expert",
        visibility: "public",
      },
      { id: "s8", name: "AWS", level: "Expert", visibility: "public" },
      { id: "s9", name: "Kubernetes", level: "Advanced", visibility: "public" },
      {
        id: "s10",
        name: "Mentoring & Coaching",
        level: "Advanced",
        visibility: "public",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Monolith → Microservices Migration",
        description:
          "18-month initiative migrating 800K line monolith to 25+ microservices. Architected migration strategy, designed service boundaries, led cross-team coordination. **Impact:** 30x deployment frequency, 50% fewer incidents, 3x faster feature development.",
        visibility: "public",
      },
      {
        id: "p2",
        name: "Real-time Notification Platform",
        description:
          "Event-driven system processing 100M+ notifications daily with <2s delivery latency. Handles email, SMS, push notifications, in-app alerts. **Tech:** Kafka, Redis, PostgreSQL, gRPC. **Impact:** Enabled 12 new product features, saved $200K/year in third-party costs.",
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
