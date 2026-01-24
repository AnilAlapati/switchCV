import { DashboardResume } from "@/types";

/**
 * Diverse Demo Resumes - Each showcases different AI agent formatting styles
 *
 * Variations include:
 * - Bullet points vs paragraphs
 * - Different skill categorizations
 * - Varying levels of detail
 * - Different summary styles
 * - Mixed project presentations
 * - Varied experience depths
 */

export const DIVERSE_DEMO_RESUMES: Record<string, DashboardResume> = {
  // 1. ORIGINAL - Concise bullet format with metrics
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

  // 2. Minimal Fresh Grad - Short & sweet with coursework focus
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

  // 3. Detailed SDE1 - Paragraph format with context
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

  // 4. Skills-categorized SDE2 - Organized by tech domains
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

  // 5. Achievement-focused SDE3 - Impact metrics highlighted
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

  // 6. Story-driven Staff Engineer - Narrative style
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

  // 7. Principal Engineer - Technical depth with architecture focus
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

  // 8. Engineering Manager - People + tech balance
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

  // Continue adding 9-21 with more variations...
  // For brevity, I'll add condensed versions showing the variety

  // 9. Senior EM - Org scaling focus
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

  // 10-21: Adding remaining with extreme variety...
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

  "11": {
    id: "demo-vp",
    versionId: "v1",
    title: "VP Engineering",
    slug: "suresh-iyer",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Suresh Iyer",
      title: "VP of Engineering",
      email: "suresh.iyer@example.com",
      location: "Bangalore",
    },
    contact: {
      email: { value: "suresh.iyer@example.com", visibility: "public" },
    },
    summary:
      "VP Engineering leading 120+ engineers. Scaled tech org through Series A to C. 15+ years experience.",
    experience: [
      {
        id: "exp-1",
        company: "B2B SaaS Company",
        role: "VP Engineering",
        startDate: "2018-01",
        endDate: "Present",
        description:
          "Built engineering from 30 to 120+ across 8 teams. Led tech through Series B ($40M) and C ($80M). Revenue scaled 0→$50M ARR.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Stanford University",
        degree: "MS Computer Science",
        startDate: "2006",
        endDate: "2008",
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
    ],
    projects: [],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  "12": {
    id: "demo-cto",
    versionId: "v1",
    title: "CTO & Co-Founder",
    slug: "deepak-sharma",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Deepak Sharma",
      title: "CTO & Co-Founder",
      email: "deepak@example.com",
      location: "Mumbai",
    },
    contact: {
      email: { value: "deepak@example.com", visibility: "public" },
    },
    summary:
      "CTO/Co-Founder. Built 0→1 product serving 10M users. Raised $50M Series A/B. 200+ team.",
    experience: [
      {
        id: "exp-1",
        company: "FinTech Startup (Co-Founder)",
        role: "CTO & Co-Founder",
        startDate: "2019-01",
        endDate: "Present",
        description:
          "Built entire tech org (0→200 people). Architected platform serving 10M users, $100M+ GMV. Raised $50M across Series A & B.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "IIT Delhi",
        degree: "B.Tech CS",
        startDate: "2010",
        endDate: "2014",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Technical Vision",
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

  "13": {
    id: "demo-tpm",
    versionId: "v1",
    title: "Technical Program Manager",
    slug: "priyanka-das",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Priyanka Das",
      title: "Technical Program Manager",
      email: "priyanka@example.com",
      location: "Pune",
    },
    contact: {
      email: { value: "priyanka@example.com", visibility: "public" },
    },
    summary:
      "TPM coordinating 5 engineering teams. Delivered 12 cross-team initiatives. Strong in stakeholder management.",
    experience: [
      {
        id: "exp-1",
        company: "Product Company",
        role: "Technical Program Manager",
        startDate: "2022-01",
        endDate: "Present",
        description:
          "Drive execution across 5 teams (30 engineers). Launched platform migration (12 months, $2M budget, 0 downtime).",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "BITS Pilani",
        degree: "B.E. CS",
        startDate: "2015",
        endDate: "2019",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Program Management",
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

  "14": {
    id: "demo-senior-tpm",
    versionId: "v1",
    title: "Senior TPM",
    slug: "amit-malhotra",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Amit Malhotra",
      title: "Senior Technical Program Manager",
      email: "amit@example.com",
      location: "Bangalore",
    },
    contact: {
      email: { value: "amit@example.com", visibility: "public" },
    },
    summary:
      "Senior TPM managing portfolio of programs across 10+ teams. $15M budget owner. Expert in complex system migrations.",
    experience: [
      {
        id: "exp-1",
        company: "Enterprise Tech",
        role: "Senior TPM",
        startDate: "2020-01",
        endDate: "Present",
        description:
          "Manage 5+ concurrent programs impacting 10 teams (80 engineers). Led cloud migration ($15M, 18 months, zero incidents).",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "IIM Bangalore",
        degree: "MBA",
        startDate: "2014",
        endDate: "2016",
        visibility: "public",
      },
    ],
    skills: [
      {
        id: "s1",
        name: "Strategic Program Delivery",
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

  // 22. PORTFOLIO-STYLE - Perfect for Masonry template (multiple projects)
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

  // 23. BENTO SHOWCASE - Product Manager with rich, visual content
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

  // 24. EDITORIAL SHOWCASE - Consultant/Executive with long-form content
  "24": {
    id: "demo-editorial-exec",
    versionId: "v1",
    title: "Managing Director & Senior Partner",
    slug: "victoria-chen",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Victoria Chen",
      title: "Managing Director & Senior Partner",
      email: "victoria.chen@example.com",
      phone: "+1 (212) 555-0198",
      location: "New York, NY",
      linkedin: "linkedin.com/in/victoriachen",
    },
    contact: {
      email: { value: "victoria.chen@example.com", visibility: "public" },
    },
    summary:
      "Transformational leader with two decades of experience advising Fortune 500 companies on digital transformation, organizational change, and strategic growth initiatives. Known for building high-performing teams and delivering measurable business impact in complex, ambiguous environments. Passionate about developing the next generation of leaders and driving sustainable value creation.",
    experience: [
      {
        id: "exp-1",
        company: "McKinsey & Company",
        role: "Managing Director & Senior Partner",
        startDate: "2018-01",
        endDate: "Present",
        description:
          "Lead the firm's Digital Transformation practice in North America, overseeing a portfolio of engagements valued at $150M+ annually. Personally sponsor 8 senior client relationships across financial services, healthcare, and technology sectors. Pioneered the firm's approach to AI-enabled operating models, resulting in $2B+ in documented client value creation. Serve on the firm's Partner Election Committee and mentor 12 associates and engagement managers.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "McKinsey & Company",
        role: "Partner",
        startDate: "2012-03",
        endDate: "2017-12",
        description:
          "Built and scaled the firm's Operations Excellence capability in the Northeast region from 5 to 40+ consultants. Led flagship transformation programs at three Fortune 100 clients, each achieving 20%+ cost reduction while improving service quality metrics. Published thought leadership on digital operations that has been cited 500+ times in academic literature.",
        visibility: "public",
      },
      {
        id: "exp-3",
        company: "Bain & Company",
        role: "Manager",
        startDate: "2007-06",
        endDate: "2012-02",
        description:
          "Managed due diligence and integration planning for private equity transactions totaling $8B in enterprise value. Developed proprietary frameworks for rapid value creation that became standard methodology across the firm's PE practice.",
        visibility: "public",
      },
      {
        id: "exp-4",
        company: "Goldman Sachs",
        role: "Associate",
        startDate: "2004-08",
        endDate: "2007-05",
        description:
          "Investment Banking Division focused on M&A advisory for technology and media clients. Executed 12 transactions with aggregate deal value exceeding $15B.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Harvard Business School",
        degree: "MBA, Baker Scholar",
        startDate: "2002",
        endDate: "2004",
        visibility: "public",
      },
      {
        id: "edu-2",
        institution: "Princeton University",
        degree: "A.B. Economics, summa cum laude",
        startDate: "1998",
        endDate: "2002",
        visibility: "public",
      },
    ],
    skills: [
      { id: "s1", name: "Digital Transformation", level: "Expert", visibility: "public" },
      { id: "s2", name: "Executive Leadership", level: "Expert", visibility: "public" },
      { id: "s3", name: "Strategic Planning", level: "Expert", visibility: "public" },
      { id: "s4", name: "Organizational Design", level: "Expert", visibility: "public" },
      { id: "s5", name: "M&A Integration", level: "Expert", visibility: "public" },
      { id: "s6", name: "Board Advisory", level: "Expert", visibility: "public" },
    ],
    projects: [
      {
        id: "p1",
        name: "Global Bank Digital Transformation",
        description:
          "Led 3-year enterprise-wide transformation for top-10 global bank. Modernized core banking platform, automated 60% of operations, achieved $400M annual run-rate savings.",
        technologies: ["Cloud Migration", "Process Automation", "Change Management"],
        visibility: "public",
      },
      {
        id: "p2",
        name: "Healthcare System Merger",
        description:
          "Advised on $12B merger of two major health systems. Designed integrated operating model, identified $800M in synergies, led cultural integration workstream.",
        technologies: ["Post-Merger Integration", "Synergy Capture", "Operating Model"],
        visibility: "public",
      },
    ],
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  },

  // 25. NOIR SHOWCASE - Founder/CEO with premium presence
  "25": {
    id: "demo-noir-founder",
    versionId: "v1",
    title: "Founder & CEO",
    slug: "marcus-rivera",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",
    personalInfo: {
      name: "Marcus Rivera",
      title: "Founder & CEO",
      email: "marcus@example.com",
      location: "San Francisco, CA",
      linkedin: "linkedin.com/in/marcusrivera",
    },
    contact: {
      email: { value: "marcus@example.com", visibility: "public" },
    },
    summary:
      "Serial entrepreneur and investor with three successful exits totaling $500M+. Building the future of enterprise AI. Forbes 30 Under 30. Passionate about empowering the next generation of founders.",
    experience: [
      {
        id: "exp-1",
        company: "NeuralForge AI",
        role: "Founder & CEO",
        startDate: "2022-01",
        endDate: "Present",
        description:
          "Building enterprise AI infrastructure. Raised $45M Series B at $300M valuation from Sequoia and Andreessen Horowitz. 50+ enterprise customers including 5 Fortune 500 companies. Grew team from 3 to 85 in 18 months.",
        visibility: "public",
      },
      {
        id: "exp-2",
        company: "DataMesh (Acquired by Snowflake)",
        role: "Co-Founder & CEO",
        startDate: "2017-06",
        endDate: "2021-12",
        description:
          "Built real-time data integration platform. Acquired by Snowflake for $180M. Scaled from idea to 200+ customers and $25M ARR. Led team of 65 across engineering, sales, and operations.",
        visibility: "public",
      },
      {
        id: "exp-3",
        company: "CloudScale (Acquired by VMware)",
        role: "Co-Founder & CTO",
        startDate: "2014-03",
        endDate: "2017-05",
        description:
          "Created container orchestration platform before Kubernetes existed. Acquired by VMware. 500+ deployments at enterprise scale.",
        visibility: "public",
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Stanford University",
        degree: "M.S. Computer Science",
        startDate: "2012",
        endDate: "2014",
        visibility: "public",
      },
      {
        id: "edu-2",
        institution: "MIT",
        degree: "B.S. Computer Science & Mathematics",
        startDate: "2008",
        endDate: "2012",
        visibility: "public",
      },
    ],
    skills: [
      { id: "s1", name: "Company Building", level: "Expert", visibility: "public" },
      { id: "s2", name: "Fundraising", level: "Expert", visibility: "public" },
      { id: "s3", name: "Product Strategy", level: "Expert", visibility: "public" },
      { id: "s4", name: "Enterprise Sales", level: "Expert", visibility: "public" },
      { id: "s5", name: "Technical Architecture", level: "Expert", visibility: "public" },
    ],
    projects: [
      {
        id: "p1",
        name: "Angel Portfolio",
        description:
          "30+ investments in AI/ML, developer tools, and fintech. 4 unicorns, 8 acquisitions. Notable: Figma (seed), Notion (A), Vercel (seed).",
        technologies: ["Investing", "AI/ML", "Developer Tools"],
        visibility: "public",
      },
      {
        id: "p2",
        name: "Founder Mentorship",
        description:
          "Mentor at Y Combinator and First Round Capital. Advised 100+ founders on product, fundraising, and scaling.",
        technologies: ["Mentorship", "Startups"],
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
