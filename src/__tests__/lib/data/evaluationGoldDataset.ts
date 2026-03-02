/**
 * Gold evaluation dataset for the resume quality launch gate.
 *
 * DESIGN PRINCIPLE: Each case stores only INPUT text. The KPI test runs the
 * actual extractors at test time so any regression in extraction quality
 * immediately degrades the KPI scores and fails the gate.
 *
 * reviewerScore is a representative human quality judgment:
 *   5.0 = perfect output, ready to send
 *   4.7 = strong, minor formatting issues acceptable
 *   4.5 = good, some gaps but readable and accurate
 *   4.0 = acceptable, visible gaps but not fabricated
 *
 * Target distribution (200-case plan):
 *   80  chat-only
 *   60  paste-heavy
 *   60  PDF/DOCX simulated text
 *
 * Current: 60 cases (35 chat, 16 paste, 9 pdf-simulated).
 * To expand: add more entries following the same shape.
 */

export type InputChannel = "chat" | "paste" | "pdf";

export interface GoldCase {
  id: string;
  category: InputChannel;
  persona: string;
  /** Chat messages — used for chat and pdf categories */
  messages?: Array<{ content: string; isUser: boolean }>;
  /** Raw pasted text — used for paste category */
  pasteText?: string;
  /** Expected human reviewer score for output of this input */
  reviewerScore: number;
  notes?: string;
}

// ===========================================================================
// SECTION A: CHAT — New Grads (10 cases)
// ===========================================================================

const chatNewGrads: GoldCase[] = [
  {
    id: "chat-ng-001",
    category: "chat",
    persona: "New grad CS engineer — US, clean input",
    reviewerScore: 4.7,
    messages: [
      { content: "Hi, I want to create my resume", isUser: true },
      { content: "Sure! What's your name and email?", isUser: false },
      {
        content: "My name is Emily Carter, email is emily.carter@gmail.com",
        isUser: true,
      },
      { content: "What's your work experience?", isUser: false },
      {
        content:
          "I interned at Google as a Software Engineering Intern for 3 months in summer 2024. I built a feature for Google Search.",
        isUser: true,
      },
      { content: "What's your education?", isUser: false },
      {
        content:
          "I have a B.S. in Computer Science from MIT, graduating in May 2025",
        isUser: true,
      },
      { content: "Any skills to add?", isUser: false },
      {
        content: "Skills: Python, Java, React, SQL, Git, Linux, Docker",
        isUser: true,
      },
      { content: "Where are you based?", isUser: false },
      {
        content:
          "I am based in Cambridge, MA. LinkedIn: https://linkedin.com/in/emilycarter",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-ng-002",
    category: "chat",
    persona: "New grad data analyst — Indian name, first job",
    reviewerScore: 4.6,
    messages: [
      { content: "I'd like to make a resume please", isUser: true },
      { content: "What is your name?", isUser: false },
      { content: "Ananya Krishnan", isUser: true },
      { content: "And your email?", isUser: false },
      { content: "ananya.krishnan@outlook.com", isUser: true },
      { content: "Tell me about your experience.", isUser: false },
      {
        content:
          "I worked as a Data Analyst Intern at Flipkart in Bangalore for 6 months. I built dashboards in Tableau and wrote SQL queries.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content: "B.Tech in Information Technology from VIT University, 2024",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      { content: "Python, SQL, Tableau, Excel, Power BI", isUser: true },
    ],
  },
  {
    id: "chat-ng-003",
    category: "chat",
    persona: "Recent bootcamp grad — no degree, skills-heavy",
    reviewerScore: 4.4,
    messages: [
      {
        content: "My name is Marcus Webb, marcus.webb@protonmail.com",
        isUser: true,
      },
      { content: "Tell me about your experience.", isUser: false },
      {
        content:
          "I completed a 6-month full-stack bootcamp at General Assembly. I built 3 React apps during the program.",
        isUser: true,
      },
      { content: "Any work experience before the bootcamp?", isUser: false },
      {
        content:
          "I was a barista at Starbucks for 2 years before, not tech related",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content: "JavaScript, React, Node.js, Express, MongoDB, HTML, CSS, Git",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-ng-004",
    category: "chat",
    persona: "New grad mobile developer — iOS focus",
    reviewerScore: 4.5,
    messages: [
      {
        content:
          "Hi I want a resume. I'm James Park, email james.park@icloud.com",
        isUser: true,
      },
      { content: "What's your background?", isUser: false },
      {
        content:
          "I graduated from UC San Diego with a BS in Computer Engineering in 2024. I focused on mobile development.",
        isUser: true,
      },
      { content: "Experience?", isUser: false },
      {
        content:
          "Software Engineering Intern at Apple in 2023, I worked on the Maps app team for 12 weeks",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content: "Swift, SwiftUI, Objective-C, iOS SDK, Xcode, Git, Agile",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-ng-005",
    category: "chat",
    persona: "New grad — only internships, no full-time",
    reviewerScore: 4.4,
    messages: [
      {
        content: "Name: Sarah Okonkwo, Email: sarah.okonkwo@gmail.com",
        isUser: true,
      },
      { content: "Tell me about your experience.", isUser: false },
      {
        content:
          "I did two internships: one at IBM as a cloud intern and one at a startup called Luminary as a frontend intern",
        isUser: true,
      },
      { content: "Any education?", isUser: false },
      {
        content: "B.S. Computer Science from Howard University, May 2025",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Technologies: JavaScript, React, TypeScript, AWS, IBM Cloud, Python",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-ng-006",
    category: "chat",
    persona: "PhD transitioning to SWE — academic background",
    reviewerScore: 4.6,
    messages: [
      {
        content: "My name is Dr. Lin Wei, email linwei@cs.stanford.edu",
        isUser: true,
      },
      { content: "What's your experience?", isUser: false },
      {
        content:
          "I'm finishing my PhD in Computer Science at Stanford. I published 3 papers on distributed systems. I also did a research internship at Microsoft Research for 4 months in 2023.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "C++, Python, Go, distributed systems, Kubernetes, Kafka, LaTeX",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "PhD CS Stanford (expected 2025), B.S. CS Tsinghua University 2020",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-ng-007",
    category: "chat",
    persona: "New grad — question limit: only 3 questions",
    reviewerScore: 4.2,
    notes: "User asks to keep it brief — tests minimum viable extraction",
    messages: [
      {
        content: "I want a resume but please only ask me 3 questions",
        isUser: true,
      },
      { content: "Okay! What's your name and email?", isUser: false },
      { content: "Aiden Ross, aiden.ross@gmail.com", isUser: true },
      { content: "What do you do and where?", isUser: false },
      {
        content:
          "I'm a junior software developer at a startup called NexTech in Austin TX",
        isUser: true,
      },
      { content: "What are your top skills?", isUser: false },
      { content: "Python, React, PostgreSQL", isUser: true },
    ],
  },
  {
    id: "chat-ng-008",
    category: "chat",
    persona: "DevOps specialist — recent grad",
    reviewerScore: 4.5,
    messages: [
      {
        content:
          "I'm Ravi Shankar, ravi.shankar@gmail.com, based in Hyderabad India",
        isUser: true,
      },
      { content: "Tell me about your work.", isUser: false },
      {
        content:
          "I work at Wipro as a DevOps Engineer. I've been there 1 year. I manage CI/CD pipelines on Jenkins and deploy to AWS.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content: "B.Tech from JNTU Hyderabad, 2023, Computer Science",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Jenkins, AWS, Terraform, Docker, Kubernetes, Linux, Bash, Python",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-ng-009",
    category: "chat",
    persona: "New grad — non-US phone format",
    reviewerScore: 4.5,
    messages: [
      {
        content:
          "My name is Yuki Tanaka, email yuki.tanaka@gmail.com, phone +81 90-1234-5678",
        isUser: true,
      },
      { content: "What's your experience?", isUser: false },
      {
        content:
          "I worked as a frontend developer intern at Rakuten in Tokyo for 6 months",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "Bachelor of Engineering, Waseda University, 2024, Information Systems",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content: "JavaScript, Vue.js, TypeScript, HTML, CSS, Git, Figma",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-ng-010",
    category: "chat",
    persona: "New grad — minimal valid (just enough to create)",
    reviewerScore: 4.0,
    notes: "Minimum required fields only",
    messages: [
      { content: "Sam Lee, sam.lee@email.com", isUser: true },
      { content: "What's your experience?", isUser: false },
      { content: "I'm a software developer at TechCo", isUser: true },
      { content: "Skills?", isUser: false },
      { content: "Python, JavaScript", isUser: true },
    ],
  },
];

// ===========================================================================
// SECTION B: CHAT — Mid-Level & Senior Engineers (10 cases)
// ===========================================================================

const chatMidSenior: GoldCase[] = [
  {
    id: "chat-ms-001",
    category: "chat",
    persona: "Senior backend engineer — strong metrics",
    reviewerScore: 4.9,
    messages: [
      { content: "My name is David Kim, david.kim@example.com", isUser: true },
      { content: "Tell me about your experience.", isUser: false },
      {
        content:
          "I'm a Senior Software Engineer at Stripe. I've been there 4 years. I led the migration of our payments API to microservices which reduced P99 latency from 850ms to 120ms and cut infrastructure costs by $1.2M annually.",
        isUser: true,
      },
      { content: "Any previous experience?", isUser: false },
      {
        content:
          "Before Stripe I was a backend engineer at Airbnb for 3 years, worked on the search infrastructure.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content: "B.S. Computer Science, Carnegie Mellon University, 2016",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Go, Python, Java, gRPC, PostgreSQL, Redis, Kafka, AWS, Kubernetes, Terraform",
        isUser: true,
      },
      { content: "Links?", isUser: false },
      {
        content:
          "LinkedIn: https://linkedin.com/in/davidkim-eng, GitHub: https://github.com/dkim-eng",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-ms-002",
    category: "chat",
    persona: "Engineering manager — leadership focus",
    reviewerScore: 4.8,
    messages: [
      {
        content: "Hi, I'm Rachel Torres, rachel.torres@gmail.com, based in NYC",
        isUser: true,
      },
      { content: "Tell me about your role.", isUser: false },
      {
        content:
          "I'm an Engineering Manager at Spotify, managing a team of 8 engineers on the personalization platform. I drove the launch of 3 major features in 2024 that increased user retention by 12%.",
        isUser: true,
      },
      { content: "Previous experience?", isUser: false },
      {
        content:
          "Before Spotify I was a staff engineer at Twitter for 2 years, and a senior engineer at Netflix for 3 years before that.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "MS Computer Science, Columbia University 2015. BS from Penn State 2013.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Python, Scala, Spark, Kafka, AWS, people management, roadmap planning, Agile",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-ms-003",
    category: "chat",
    persona: "Fullstack engineer — UK based, 5 years exp",
    reviewerScore: 4.6,
    messages: [
      {
        content:
          "My name is Oliver Bennett, oliver.bennett@gmail.com, I'm in London",
        isUser: true,
      },
      { content: "What's your background?", isUser: false },
      {
        content:
          "I work at Monzo as a software engineer, been there 3 years. Before that I was at a fintech startup for 2 years.",
        isUser: true,
      },
      { content: "What do you work on?", isUser: false },
      {
        content:
          "I build the backend for the lending team using Go and PostgreSQL. I also do some React frontend work occasionally.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content: "MEng Computer Science, University of Edinburgh, 2019",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Go, TypeScript, React, PostgreSQL, Redis, Kubernetes, GCP, Terraform",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-ms-004",
    category: "chat",
    persona: "Data scientist with strong metrics — 6 years",
    reviewerScore: 4.8,
    messages: [
      {
        content:
          "I'm Preethi Nair, preethi.nair@gmail.com, based in San Francisco",
        isUser: true,
      },
      { content: "Tell me about your experience.", isUser: false },
      {
        content:
          "I'm a Senior Data Scientist at Uber. I built the demand forecasting model that improved forecast accuracy by 23% and saved $4M annually in driver incentive costs.",
        isUser: true,
      },
      { content: "Previous roles?", isUser: false },
      {
        content:
          "Before Uber I was a data scientist at LinkedIn for 3 years. I did my PhD in Statistics at Stanford.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Python, R, TensorFlow, PyTorch, SQL, Spark, Airflow, AWS, A/B testing, causal inference",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-ms-005",
    category: "chat",
    persona: "SRE/DevOps — AWS focused",
    reviewerScore: 4.6,
    messages: [
      { content: "Carlos Mendez, carlos.mendez@protonmail.com", isUser: true },
      { content: "What's your current role?", isUser: false },
      {
        content:
          "Senior SRE at Cloudflare, 3 years. I own reliability for their DDoS mitigation platform, maintaining 99.995% uptime across 200+ PoPs globally.",
        isUser: true,
      },
      { content: "Previous experience?", isUser: false },
      {
        content:
          "Before Cloudflare, I was a DevOps Engineer at AWS for 2 years.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content: "B.S. Computer Science, University of Texas at Austin, 2018",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Kubernetes, Terraform, AWS, GCP, Python, Go, Prometheus, Grafana, PagerDuty, CI/CD",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-ms-006",
    category: "chat",
    persona: "Security engineer — mid level",
    reviewerScore: 4.5,
    messages: [
      {
        content:
          "Hi, name is Fatima Al-Hassan, fatima.alhassan@gmail.com, Dubai UAE",
        isUser: true,
      },
      { content: "Tell me about your work.", isUser: false },
      {
        content:
          "I'm a Security Engineer at Noon.com for the past 2 years. I lead vulnerability assessment and have reduced our attack surface by 40% through systematic patching and firewall hardening.",
        isUser: true,
      },
      { content: "Previous experience?", isUser: false },
      {
        content:
          "I worked as junior security analyst at a consultancy for 2 years before Noon.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "B.Sc. Information Security, American University of Sharjah, 2020",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Penetration testing, SIEM, OWASP, Python, Bash, AWS Security, ISO 27001, CISSP",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-ms-007",
    category: "chat",
    persona: "Principal engineer — architect level",
    reviewerScore: 4.9,
    messages: [
      {
        content:
          "My name is Thomas Anderson, thomas.a@engineering.com, based in Seattle",
        isUser: true,
      },
      { content: "Tell me about your background.", isUser: false },
      {
        content:
          "I'm a Principal Engineer at Amazon, 6 years. I architected the core infrastructure for Amazon Pharmacy which processed 2M prescriptions in its first year. I own a system that processes 500K requests per second.",
        isUser: true,
      },
      { content: "Prior experience?", isUser: false },
      {
        content:
          "Before Amazon I was at Microsoft for 4 years as a senior engineer, and Google for 2 years as an engineer.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "MS Computer Science, University of Washington 2010. BS from Georgia Tech 2008.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Java, C++, distributed systems, system design, AWS, gRPC, DynamoDB, Kinesis, leadership",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-ms-008",
    category: "chat",
    persona: "ML engineer — LLM/AI focus",
    reviewerScore: 4.8,
    messages: [
      { content: "I'm Alex Zhao, alex.zhao@gmail.com", isUser: true },
      { content: "What are you working on?", isUser: false },
      {
        content:
          "I'm an ML Engineer at Anthropic for 2 years. I fine-tune and evaluate large language models and built the evaluation framework that's used across 5 research teams.",
        isUser: true,
      },
      { content: "Prior experience?", isUser: false },
      {
        content:
          "Before Anthropic I was at OpenAI as a research engineer for 1.5 years, and before that I was at DeepMind.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content: "PhD Machine Learning, UC Berkeley 2021, MS from CMU 2017",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Python, PyTorch, JAX, RLHF, transformers, evaluation harnesses, GPU clusters, Kubernetes",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-ms-009",
    category: "chat",
    persona: "Non-US engineer — Brazilian phone format",
    reviewerScore: 4.5,
    messages: [
      {
        content:
          "My name is Lucas Ferreira, lucas.ferreira@gmail.com, +55 11 98765-4321, based in São Paulo",
        isUser: true,
      },
      { content: "What's your experience?", isUser: false },
      {
        content:
          "I am a software engineer at Nubank for 3 years. I work on the credit card backend using Clojure and Kafka.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "BEng Computer Engineering, USP (University of São Paulo), 2020",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content: "Clojure, Kafka, PostgreSQL, AWS, Docker, Kubernetes, Git",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-ms-010",
    category: "chat",
    persona: "Frontend specialist — design system expert",
    reviewerScore: 4.6,
    messages: [
      {
        content:
          "Hi! I am Sophie Martin, sophie.martin@gmail.com, Paris France",
        isUser: true,
      },
      { content: "What do you do?", isUser: false },
      {
        content:
          "L'Oréal, I am a Senior Frontend Engineer there, 3 years. I built and maintain their global design system used by 50+ product teams across 30 countries.",
        isUser: true,
      },
      { content: "Previous experience?", isUser: false },
      {
        content: "2 years at Doctolib as a frontend developer before L'Oréal",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content: "MSc Software Engineering, École Polytechnique, 2019",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "TypeScript, React, Vue.js, Storybook, CSS-in-JS, Design Systems, Figma, Accessibility",
        isUser: true,
      },
    ],
  },
];

// ===========================================================================
// SECTION C: CHAT — Career Changers & Edge Cases (15 cases)
// ===========================================================================

const chatCareerEdge: GoldCase[] = [
  {
    id: "chat-cc-001",
    category: "chat",
    persona: "Career changer — teacher to product manager",
    reviewerScore: 4.4,
    messages: [
      {
        content:
          "Hi I want to change careers. I'm Jamie Brooks, jamie.brooks@gmail.com",
        isUser: true,
      },
      { content: "Tell me what you've done.", isUser: false },
      {
        content:
          "I was a high school computer science teacher for 5 years. I designed curriculum for 200+ students and led after-school coding clubs.",
        isUser: true,
      },
      { content: "Any product or tech experience?", isUser: false },
      {
        content:
          "I built a school scheduling app used by my whole department, and I did a product management certificate course.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "B.S. Computer Science, Ohio State, 2018. Google Project Management Certificate, 2024.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Product management, agile, roadmap planning, user research, Python, SQL",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-cc-002",
    category: "chat",
    persona: "Career changer — finance to data science",
    reviewerScore: 4.5,
    messages: [
      {
        content: "I'm Nathan Cole, nathan.cole@gmail.com, New York, NY",
        isUser: true,
      },
      { content: "What's your background?", isUser: false },
      {
        content:
          "I worked in investment banking at Goldman Sachs as an analyst for 3 years, then I completed a data science bootcamp",
        isUser: true,
      },
      { content: "Any data work?", isUser: false },
      {
        content:
          "I now freelance as a data analyst and built predictive models for 2 small clients.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "B.S. Economics, Yale University, 2020. DataCamp Data Science Certificate 2023.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Python, pandas, scikit-learn, SQL, Tableau, Excel, financial modeling",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-cc-003",
    category: "chat",
    persona: "Solo founder edge case — role phrase in first message",
    reviewerScore: 4.4,
    notes: "Tests that 'I am the solo founder' is NOT extracted as name",
    messages: [
      {
        content: "I am the solo founder of a digital marketing agency",
        isUser: true,
      },
      { content: "What's your name?", isUser: false },
      { content: "Maya Singh", isUser: true },
      { content: "Email?", isUser: false },
      { content: "maya.singh@digitalbloom.co", isUser: true },
      { content: "What skills do you have?", isUser: false },
      {
        content:
          "I know React, Next.js, Tailwind, and I'm proficient in TypeScript and Node.js",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-cc-004",
    category: "chat",
    persona: "Self-employed consultant — non-traditional job history",
    reviewerScore: 4.4,
    messages: [
      {
        content: "My name is Robert Osei, robert.osei@gmail.com, Accra Ghana",
        isUser: true,
      },
      { content: "What's your work experience?", isUser: false },
      {
        content:
          "I have been an independent software consultant for 5 years. My clients include banks and telcos across West Africa. I've delivered 12 projects.",
        isUser: true,
      },
      { content: "What kind of work?", isUser: false },
      {
        content:
          "Mostly fintech integrations, mobile money APIs, and backend systems in Java and Python",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content: "B.Sc. Computer Science, University of Ghana, 2018",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Java, Python, Spring Boot, REST APIs, MySQL, AWS, mobile money integrations",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-cc-005",
    category: "chat",
    persona: "Designer transitioning to frontend — cross-discipline",
    reviewerScore: 4.3,
    messages: [
      {
        content:
          "I'm Zara Ahmed, zara.ahmed@gmail.com, I'm a designer moving into engineering",
        isUser: true,
      },
      { content: "What's your experience?", isUser: false },
      {
        content:
          "I was a UX/UI designer at Canva for 3 years. I started learning to code and now build the frontend for my own projects.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Figma, React, CSS, HTML, JavaScript, Framer Motion, design systems, user research",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content: "Bachelor of Design, RMIT University Melbourne, 2020",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-cc-006",
    category: "chat",
    persona: "Military vet transitioning to cloud engineering",
    reviewerScore: 4.4,
    messages: [
      {
        content: "My name is Marcus Johnson, marcus.j.vet@gmail.com, Dallas TX",
        isUser: true,
      },
      { content: "What's your background?", isUser: false },
      {
        content:
          "I served 6 years in the US Army as a Signal Officer managing communications infrastructure for 2,000 personnel. I recently completed AWS Solutions Architect certification.",
        isUser: true,
      },
      { content: "Any cloud work?", isUser: false },
      {
        content:
          "I'm currently doing cloud projects through AWS re/Start program. I built a VPC with auto-scaling groups as my capstone.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "B.S. Information Technology, Excelsior University 2022. AWS Solutions Architect Associate 2024.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "AWS, Terraform, Linux, networking, Python, cybersecurity, leadership, project management",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-cc-007",
    category: "chat",
    persona: "Academic researcher pivoting to industry",
    reviewerScore: 4.5,
    messages: [
      {
        content:
          "Hi, I'm Dr. Elena Vasquez, elena.vasquez@gmail.com, based in Boston MA",
        isUser: true,
      },
      { content: "What's your experience?", isUser: false },
      {
        content:
          "I'm a postdoctoral researcher at Harvard Medical School. I developed computer vision algorithms for medical imaging and my work has been cited 80+ times. I'm looking to move to industry.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Python, PyTorch, OpenCV, R, MATLAB, statistical analysis, medical imaging, grant writing",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "PhD Biomedical Engineering, MIT 2022. BS from McGill University 2017.",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-cc-008",
    category: "chat",
    persona: "Non-US format — German CV style, European name",
    reviewerScore: 4.4,
    messages: [
      {
        content:
          "Hello, my name is Markus Böhm, markus.bohm@gmail.com, I am from Munich Germany",
        isUser: true,
      },
      { content: "Experience?", isUser: false },
      {
        content:
          "I have been a software developer at BMW Group for 4 years. I work on embedded systems for autonomous driving.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content: "Diplom-Informatiker, Technische Universität München, 2019",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "C++, Python, ROS, AUTOSAR, CAN bus, embedded systems, Linux, MATLAB",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-cc-009",
    category: "chat",
    persona: "Returning to workforce after gap year",
    reviewerScore: 4.3,
    messages: [
      {
        content:
          "I'm Elena Park, elena.park@gmail.com, I'm returning to tech after a 2-year career break",
        isUser: true,
      },
      { content: "What was your experience before the break?", isUser: false },
      {
        content:
          "I was a software engineer at Oracle for 5 years before taking time off. I worked on the database engine team.",
        isUser: true,
      },
      { content: "Any recent projects?", isUser: false },
      {
        content:
          "During my break I built a few open source tools in Rust and contributed to the tokio async runtime",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      { content: "BS Computer Science, UT Austin, 2015", isUser: true },
      { content: "Skills?", isUser: false },
      {
        content:
          "Java, C++, Rust, SQL, distributed systems, Oracle, Linux, Git",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-cc-010",
    category: "chat",
    persona: "Junior dev with only internships — entry level",
    reviewerScore: 4.1,
    messages: [
      {
        content: "Hi I'm Chris Wang, chris.wang@gmail.com, Harvard CS senior",
        isUser: true,
      },
      { content: "Any experience?", isUser: false },
      {
        content:
          "I have done two SWE internships: one at Palantir last summer and one at Bloomberg the summer before",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content: "Python, Java, C++, algorithms, data structures, SQL, Git",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-cc-011",
    category: "chat",
    persona: "Product manager — non-technical",
    reviewerScore: 4.5,
    messages: [
      {
        content: "I'm Neha Gupta, neha.gupta@gmail.com, Mumbai India",
        isUser: true,
      },
      { content: "What's your experience?", isUser: false },
      {
        content:
          "I'm a Senior Product Manager at Razorpay for 3 years. I launched the UPI Autopay product which acquired 2M users in 6 months.",
        isUser: true,
      },
      { content: "Previous experience?", isUser: false },
      {
        content:
          "2 years as PM at Ola and 1 year as a business analyst at Deloitte before that",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content: "MBA, IIM Ahmedabad, 2019. B.Tech from IIT Bombay 2017.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Product strategy, roadmapping, user research, SQL, A/B testing, Jira, Figma, payments",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-cc-012",
    category: "chat",
    persona: "Tech lead — staff level transition",
    reviewerScore: 4.7,
    messages: [
      {
        content:
          "Name: Anika Reddy. Email: anika.reddy@outlook.com. Location: Sydney, Australia",
        isUser: true,
      },
      { content: "Tell me about your role.", isUser: false },
      {
        content:
          "I'm a Tech Lead at Atlassian. I lead a team of 6 engineers on the Jira cloud platform. I've been there 4.5 years.",
        isUser: true,
      },
      { content: "Previous experience?", isUser: false },
      {
        content:
          "Before Atlassian I was a senior engineer at REA Group for 3 years.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content: "B.Eng Software Engineering, UNSW Sydney, 2016",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Java, Kotlin, Kotlin/JVM, AWS, DynamoDB, Kafka, React, team leadership, system design",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-cc-013",
    category: "chat",
    persona: "Freelancer building agency",
    reviewerScore: 4.4,
    messages: [
      {
        content:
          "I'm Jordan Blake, jordan.blake@me.com, I run my own development agency in Austin TX",
        isUser: true,
      },
      { content: "What kind of work do you do?", isUser: false },
      {
        content:
          "I do full-stack web development for small businesses. In the last 2 years I've delivered 15 client projects. My biggest was a $120K e-commerce platform for a retail chain.",
        isUser: true,
      },
      { content: "Any prior employment?", isUser: false },
      {
        content:
          "I worked at Shopify as a software engineer for 2 years before going independent",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "React, Next.js, Node.js, PostgreSQL, Stripe, AWS, Shopify API",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-cc-014",
    category: "chat",
    persona: "Platform engineer — infrastructure heavy",
    reviewerScore: 4.6,
    messages: [
      { content: "I'm Diego Varela, diego.varela@gmail.com", isUser: true },
      { content: "What's your role?", isUser: false },
      {
        content:
          "Staff Platform Engineer at Datadog, 3 years. I own the agent infrastructure that runs on 500K+ customer hosts. I led the rewrite that reduced agent CPU usage by 35%.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content: "B.S. Computer Engineering, Georgia Tech, 2018",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Go, Python, eBPF, Linux kernel, Kubernetes, Helm, CI/CD, observability, DogStatsD",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-cc-015",
    category: "chat",
    persona: "Zero experience — student applying to internships",
    reviewerScore: 3.9,
    notes: "Minimum viable — no prior employment",
    messages: [
      {
        content:
          "I'm a sophomore at Cornell, looking for internships. My name is Priya Patel, priya.patel@cornell.edu",
        isUser: true,
      },
      { content: "Any experience?", isUser: false },
      {
        content:
          "No work experience yet but I've done 3 personal projects including a web app and a mobile app",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content: "Python, Java, C, HTML/CSS, JavaScript, React basics",
        isUser: true,
      },
    ],
  },
];

// ===========================================================================
// SECTION D: PASTE — Formatted resume text (16 cases)
// ===========================================================================

const pasteCases: GoldCase[] = [
  {
    id: "paste-001",
    category: "paste",
    persona: "Senior engineer — clean 1-page paste",
    reviewerScore: 4.8,
    pasteText: `
John Smith
john.smith@techcorp.com | (415) 555-1234 | San Francisco, CA
https://linkedin.com/in/jsmith | https://github.com/jsmith

Professional Summary
Experienced full-stack software engineer with 8 years building scalable web applications. Led a team of 5 engineers to deliver a payment platform processing $2M in daily transactions.

Experience
Senior Software Engineer, TechCorp — San Francisco, CA (2020 - Present)
- Architected microservices platform handling 10,000 requests/second
- Reduced deployment time by 60% through CI/CD pipeline optimization
- Mentored 3 junior engineers who were promoted within 18 months

Software Engineer, StartupXYZ — Remote (2017 - 2020)
- Built React-based dashboard used by 500+ enterprise customers
- Implemented real-time notification system using WebSockets

Education
B.S. Computer Science, Stanford University — 2017

Skills
JavaScript, TypeScript, React, Node.js, Python, AWS, Docker, Kubernetes, PostgreSQL, Redis
    `,
  },
  {
    id: "paste-002",
    category: "paste",
    persona: "Data scientist — strong metrics",
    reviewerScore: 4.8,
    pasteText: `
Priya Nambiar
priya.nambiar@gmail.com | +1 (650) 555-9876
https://linkedin.com/in/priyanambiar | https://github.com/pnambiar

Summary
Senior Data Scientist with 6 years of experience building ML models in production. Led projects that generated $8M in incremental revenue through recommendation systems.

Experience
Senior Data Scientist at Netflix (2020–Present)
Built the next-watch recommendation engine that increased content completion rate by 18%.
Managed a team of 4 data scientists and 2 ML engineers.

Data Scientist at Airbnb (2018–2020)
Developed dynamic pricing models that improved host revenue by 14% on average.

Education
PhD Statistics – UCLA, 2018
B.Tech Mathematics and Computing – IIT Delhi, 2015

Skills
Python, R, SQL, Spark, TensorFlow, PyTorch, Airflow, AWS SageMaker, A/B testing, causal inference
    `,
  },
  {
    id: "paste-003",
    category: "paste",
    persona: "Executive resume — VP Engineering",
    reviewerScore: 4.7,
    pasteText: `
Michael Zhang
m.zhang@gmail.com | (212) 555-3333 | New York, NY

VP of Engineering – FinTech Focus | 15+ years in software leadership

Experience
VP Engineering, Carta (2019–Present)
- Scaled engineering org from 20 to 85 engineers across 6 product teams
- Delivered IPO readiness infrastructure with 99.99% uptime
- Reduced AWS spend by $3.2M/year through architectural optimization

Director of Engineering, Bloomberg LP (2015–2019)
- Led 40-engineer division delivering real-time financial data pipelines
- Shipped 4 major platform releases with zero downtime migrations

Senior Engineering Manager, Goldman Sachs (2010–2015)

Education
MBA, Columbia Business School – 2012
B.S. Computer Science, Cornell University – 2007

Skills
Engineering leadership, org scaling, system architecture, AWS, Java, Python, FinTech regulations, M&A integration
    `,
  },
  {
    id: "paste-004",
    category: "paste",
    persona: "Non-US format — German CV style",
    reviewerScore: 4.4,
    pasteText: `
Tobias Müller
tobias.mueller@gmail.com | +49 176 12345678
Karlsruhe, Germany

Berufserfahrung (Professional Experience)
Softwareentwickler, SAP SE – Walldorf (March 2021 – Present)
Design and implementation of enterprise cloud solutions in Java and Spring Boot.

Werkstudent (Working Student), Bosch – Stuttgart (2019 – 2021)
Backend development for IoT device management platform.

Ausbildung (Education)
M.Sc. Informatik (Computer Science) – Karlsruher Institut für Technologie (KIT) – 2021
B.Sc. Informatik – Universität Stuttgart – 2019

Kenntnisse (Skills)
Java, Spring Boot, Python, SQL, AWS, Docker, Kubernetes, REST APIs, Git, Agile
    `,
  },
  {
    id: "paste-005",
    category: "paste",
    persona: "Messy OCR artifacts — broken lines and whitespace noise",
    reviewerScore: 4.2,
    notes: "Tests cleanup of OCR-style artifacts in paste input",
    pasteText: `
A l e x a n d e r  W i l l i s
a.willis@email.com

Senior Back end  Engineer  |  7  Years

E x p e r i e n c e

Seni or  Eng ineer  at  T w i l i o  (2021 - Pres ent)
Built  voice  and  messaging  A P I s  process ing  1 bill ion  events  per  day .
R ed u c e d  A P I  latency by  45%  through  cache  opti mization .

Softw are  Engineer  at  S e n d G r i d  (2018 - 2021)
Email  delivery  infrastructure  serving  40K  requests  per  second.

E d u c a t i o n
B.S.  Comp uter  Science  –  U C  D a v i s  2018

S k i l l s
Python, Node.js, Twilio API, Kafka, Redis, PostgreSQL, AWS
    `,
  },
  {
    id: "paste-006",
    category: "paste",
    persona: "Academic/research resume",
    reviewerScore: 4.5,
    pasteText: `
Dr. Amara Singh
amara.singh@mit.edu | Cambridge, MA
https://scholar.google.com/citations?user=amara_singh

Research Scientist, MIT Computer Science and Artificial Intelligence Lab (2022–Present)
Lead researcher on federated learning systems for healthcare data. Published 8 peer-reviewed papers. H-index: 12.

Postdoctoral Researcher, CMU (2020–2022)
Distributed machine learning systems, NSF-funded project.

Education
PhD Computer Science – MIT, 2020 (Advisor: Prof. Dina Katabi)
B.Tech Computer Science – IIT Madras, 2015

Skills & Tools
Python, PyTorch, TensorFlow, Flower (federated learning), CUDA, distributed systems, LaTeX, R, AWS, Linux
    `,
  },
  {
    id: "paste-007",
    category: "paste",
    persona: "Short entry-level resume — minimal but valid",
    reviewerScore: 4.0,
    pasteText: `
Jasmine Taylor
jasmine.taylor@gmail.com
Atlanta, GA

Experience
Junior Frontend Developer, AgencyX (June 2024 – Present)
Building landing pages and web components using React and Tailwind.

Education
B.S. Computer Science, Spelman College, 2024

Skills
HTML, CSS, JavaScript, React, Tailwind CSS, Git, Figma
    `,
  },
  {
    id: "paste-008",
    category: "paste",
    persona: "Mixed bullet formats — inconsistent section styling",
    reviewerScore: 4.3,
    pasteText: `
Ryan Kovacs | ryan.kovacs@gmail.com | Denver, CO | https://github.com/rkovacs

WORK EXPERIENCE
Full Stack Developer • DevHouse Agency (2022–Present)
* Delivered 20+ client web projects using React and Node.js
* Integrated Stripe payment APIs for e-commerce clients

Backend Developer | CloudNine Inc (2020–2022)
- Wrote REST APIs in Go serving 200K users
- Maintained PostgreSQL databases with 99.9% uptime

EDUCATION
B.S. Software Engineering | University of Denver | 2020

TECHNICAL SKILLS
Go, Node.js, JavaScript, React, PostgreSQL, Redis, Docker, AWS
    `,
  },
  {
    id: "paste-009",
    category: "paste",
    persona: "QA / SDET engineer — testing focus",
    reviewerScore: 4.4,
    pasteText: `
Deepa Krishnamurthy
deepa.k@gmail.com | Bangalore, India
LinkedIn: https://linkedin.com/in/deepakrishnamurthy

Senior SDET, Infosys (2019–Present)
Designed and automated 2,000+ test cases for banking applications.
Reduced regression cycle time by 70% through parallel test execution.
Tools: Selenium, Python, pytest, Jenkins, JIRA.

QA Engineer, Wipro (2016–2019)
Manual and automated testing for ERP systems.

B.E. Computer Science, Visvesvaraya Technological University, 2016

Skills: Python, Selenium, Cypress, pytest, REST Assured, JIRA, Jenkins, Postman, SQL
    `,
  },
  {
    id: "paste-010",
    category: "paste",
    persona: "Marketing analytics — cross-functional",
    reviewerScore: 4.4,
    pasteText: `
Chloe Bennett
chloe.bennett@gmail.com | (323) 555-8888 | Los Angeles, CA

Marketing Analytics Manager, Warner Bros. (2021–Present)
- Built attribution models that improved ad ROAS by 30%
- Managed $5M paid media budget with 15% YoY efficiency improvement
- Led team of 3 analysts

Digital Marketing Analyst, Hulu (2019–2021)
- SQL-based audience segmentation for streaming campaigns

Education
M.S. Data Science, USC Marshall School of Business – 2019
B.S. Marketing, UCLA – 2017

Skills
SQL, Python, Tableau, Looker, Google Analytics, Media Mix Modeling, A/B testing, paid social
    `,
  },
  {
    id: "paste-011",
    category: "paste",
    persona: "Backend engineer — minimal contact info (no phone)",
    reviewerScore: 4.5,
    pasteText: `
Kenji Nakamura
kenji.nakamura@gmail.com | Tokyo, Japan

Backend Engineer, LINE Corporation (2020–Present)
Designed and maintained microservices for LINE Pay processing 5M transactions/day.
Tech: Java, Spring Boot, MySQL, Redis, Kafka.

Software Engineer, Rakuten (2018–2020)
API development for Rakuten Ichiba marketplace.

Education
B.Eng. Information Engineering, Tokyo Institute of Technology – 2018

Skills
Java, Spring Boot, Python, MySQL, Redis, Kafka, Docker, Kubernetes, AWS
    `,
  },
  {
    id: "paste-012",
    category: "paste",
    persona: "Cloud architect — AWS heavy",
    reviewerScore: 4.7,
    pasteText: `
Ahmad Hassan
ahmad.hassan@gmail.com | Dubai, UAE | +971 50 123 4567

AWS Solutions Architect | 10 years cloud infrastructure

Work History
Senior Cloud Architect, Emirates NBD (2020–Present)
Designed multi-region AWS architecture for core banking serving 8M customers.
Achieved 99.99% availability across 3 regions. Reduced cloud costs by $2M annually.

Cloud Engineer, Careem (2017–2020)
Infrastructure for ride-hailing platform at scale.

Junior DevOps, STC Pay Saudi Arabia (2015–2017)

Education
BSc Computer Science, American University of Beirut – 2014
AWS Certified Solutions Architect – Professional (2022)
AWS Certified DevOps Engineer – Professional (2021)

Skills
AWS (EC2, EKS, RDS, Lambda, CloudFront), Terraform, Kubernetes, Python, Go, CI/CD, FinOps
    `,
  },
  {
    id: "paste-013",
    category: "paste",
    persona: "iOS engineer — Apple ecosystem",
    reviewerScore: 4.5,
    pasteText: `
Noah Williams
noah.williams@gmail.com | Austin, TX | https://github.com/noahwilliams

iOS Engineer, Dell Technologies (2021–Present)
Building enterprise mobile apps for internal workforce tools.
SwiftUI migration reduced UI code volume by 40%.

iOS Developer, HomeAway / Vrbo (2018–2021)
Consumer-facing iOS app with 4.8 App Store rating and 10M+ downloads.

Education
B.S. Computer Science, UT Austin – 2018

Skills
Swift, SwiftUI, Objective-C, UIKit, Xcode, CocoaPods, SPM, CoreData, REST APIs, Git
    `,
  },
  {
    id: "paste-014",
    category: "paste",
    persona: "Resume missing summary section — tests section detection",
    reviewerScore: 4.2,
    pasteText: `
Laura Chen | laura.chen@gmail.com | Seattle, WA | https://linkedin.com/in/laurachen

Experience
Software Engineer II, Microsoft (2022–Present)
Working on Azure DevOps platform features using C# and .NET.
Shipped 3 major features serving 2M+ users.

Software Engineer I, Amazon (2020–2022)
Full-stack development for Amazon Fresh using Java and React.

Education
B.S. Computer Science, University of Washington, 2020

Skills
C#, .NET, Java, React, TypeScript, Azure, AWS, SQL, Git
    `,
  },
  {
    id: "paste-015",
    category: "paste",
    persona: "Non-English name — Korean name in paste",
    reviewerScore: 4.5,
    pasteText: `
Ji-Young Kim
jiyoung.kim@gmail.com | Seoul, South Korea
https://linkedin.com/in/jiyoungkim

Senior Software Engineer, Kakao Corp (2020–Present)
Backend services for KakaoTalk handling 50M daily active users.
Improved database query performance by 55% through indexing strategy.

Software Engineer, Samsung SDS (2017–2020)
Enterprise software development in Java.

Education
B.S. Computer Science, Yonsei University, 2017

Skills
Java, Spring Boot, MySQL, Redis, Kafka, AWS, Kubernetes, Python
    `,
  },
  {
    id: "paste-016",
    category: "paste",
    persona: "Consultant — no fixed employer",
    reviewerScore: 4.3,
    pasteText: `
Patricia Okafor
patricia.okafor@gmail.com | +44 7700 900123 | London, UK

Independent Technology Consultant (2018–Present)
Delivered 20+ consulting engagements for FTSE 100 clients in financial services.
Specialties: digital transformation, cloud migration, data strategy.
Notable clients include HSBC, Barclays, and GSK.

Associate Consultant, McKinsey & Company (2015–2018)

Education
MBA, London Business School – 2015
B.Sc. Computer Science, University of Lagos – 2012

Skills
Digital transformation, cloud strategy, AWS, Python, SQL, Tableau, stakeholder management, project delivery
    `,
  },
];

// ===========================================================================
// SECTION I: PASTE — Expanded (44 cases) [D2 expansion]
// Varied separators, multi-page, creative layouts, non-English names
// ===========================================================================

const pasteExpanded: GoldCase[] = [
  {
    id: "paste-017",
    category: "paste",
    persona: "Paste — pipe-separated header, creative layout",
    reviewerScore: 4.4,
    pasteText: `
ARJUN SHARMA | arjun.sharma@gmail.com | +1 (408) 555-7654
Software Engineer | Mountain View, CA | linkedin.com/in/arjunsharma | github.com/asharm

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROFESSIONAL EXPERIENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Senior Software Engineer | Google LLC | Jan 2021 – Present | Mountain View, CA
  → Led development of Google Photos ML inference pipeline (1B+ users)
  → Reduced model serving latency by 42% through quantization
  → Mentored 4 engineers, 2 promoted to senior in 18 months

Software Engineer II | Dropbox | Aug 2018 – Dec 2020 | San Francisco, CA
  → Built file sync conflict resolution system handling 10M daily sync events
  → Reduced sync failures by 35%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EDUCATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
B.Tech Computer Science | IIT Bombay | 2018

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SKILLS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Python, C++, TensorFlow, Kubernetes, GCP, BigQuery, Golang, distributed systems
    `,
  },
  {
    id: "paste-018",
    category: "paste",
    persona: "Paste — resume with all-caps section headers",
    reviewerScore: 4.5,
    pasteText: `
Michelle Okonkwo
michelle.okonkwo@gmail.com
(214) 555-3456 • Dallas, TX

PROFESSIONAL SUMMARY
Product Manager with 7 years of experience in SaaS B2B products. Track record of launching features that drive measurable ARR growth.

WORK EXPERIENCE

PRODUCT MANAGER, SENIOR — Zendesk, Dallas TX (2020–Present)
Owned the Support Analytics product (75K enterprise customers). Launched 4 major features contributing $8M ARR.
Ran 20+ customer discovery interviews to prioritize roadmap.

PRODUCT MANAGER — HubSpot, Remote (2018–2020)
Managed email deliverability features for 50K users. NPS improved from 42 to 61 during tenure.

ASSOCIATE PM — Intercom, San Francisco (2016–2018)
Rotational program covering growth, retention, and monetization.

EDUCATION
MBA, SMU Cox School of Business — 2016
B.S. Computer Science, UT Dallas — 2014

SKILLS
Product management, roadmap planning, customer discovery, OKRs, SQL, Amplitude, Figma, JIRA
    `,
  },
  {
    id: "paste-019",
    category: "paste",
    persona: "Paste — resume with dates in brackets [2020-2023]",
    reviewerScore: 4.3,
    pasteText: `
Nikolai Petrov
nikolai.petrov@gmail.com | St. Petersburg, Russia → now Berlin, Germany

Backend Engineer [7 years experience]

Experience:

Lead Backend Engineer — N26 (Berlin) [2023–Present]
Designed core microservices for N26's premium subscription platform serving 8M customers.
Reduced API error rate from 0.8% to 0.02%.

Senior Backend Engineer — Revolut (London/Remote) [2020–2023]
Built transaction processing services handling 300M monthly transactions.
Led team of 5 backend engineers.

Software Engineer — Yandex (Moscow) [2018–2020]
Search backend services in C++ for Yandex.Taxi.

Education:
M.Sc. Computer Science — Saint Petersburg State University [2018]
B.Sc. Applied Mathematics — SPBU [2016]

Skills: Go, Python, Java, PostgreSQL, Kafka, Redis, Kubernetes, AWS, distributed systems
    `,
  },
  {
    id: "paste-020",
    category: "paste",
    persona: "Paste — table-formatted skills section",
    reviewerScore: 4.3,
    pasteText: `
Priya Subramaniam
priya.subramaniam@gmail.com | (650) 555-1111 | Palo Alto, CA

Data Engineer with 6 years experience building scalable data infrastructure.

EXPERIENCE

Senior Data Engineer, LinkedIn (2021–Present)
Architected data lake processing 5PB of member data daily.
Built real-time personalization pipelines for LinkedIn's feed (850M users).

Data Engineer, Palantir (2019–2021)
Developed data pipelines for US Department of Defense clients.

Junior Data Engineer, Oracle (2018–2019)
ETL development for Oracle Analytics Cloud.

EDUCATION
M.S. Computer Science, Stanford University – 2018

TECHNICAL SKILLS
Languages  | Python, Scala, Java, SQL
Frameworks | Spark, Flink, Airflow, dbt
Databases  | PostgreSQL, Snowflake, BigQuery, Cassandra
Cloud      | AWS (S3, EMR, Glue), GCP, Azure
    `,
  },
  {
    id: "paste-021",
    category: "paste",
    persona: "Paste — two-column-style layout with separators",
    reviewerScore: 4.1,
    notes: "Multi-column layout can confuse section parsers",
    pasteText: `
James Wilson                                     CONTACT
james.wilson@gmail.com                           Mobile: (303) 555-9876
Senior DevOps Engineer                           Location: Denver, CO
10 years experience                              LinkedIn: /in/jameswilsondevops

EXPERIENCE                                       SKILLS
                                                 AWS, Azure, GCP
Senior DevOps Engineer                           Terraform, Ansible
Databricks (2022–Present)                        Kubernetes, Docker
- Managed 500-node Kubernetes cluster            Python, Bash, Go
- Reduced cloud spend by $1.2M/yr               Jenkins, GitLab CI
                                                 Prometheus, Grafana
DevOps Engineer
Epic Systems (2016–2022)
- Built CI/CD for 200+ healthcare software       EDUCATION
  teams
- Maintained HIPAA-compliant infrastructure      B.S. Computer Engineering
                                                 Purdue University, 2014
    `,
  },
  {
    id: "paste-022",
    category: "paste",
    persona: "Paste — no section labels, text only",
    reviewerScore: 4.0,
    notes: "Tests section auto-detection without headers",
    pasteText: `
Florence Adichie
florence.adichie@gmail.com, +44 20 7946 0123, London UK

I have been a software engineer at Monzo Bank for 4 years building backend services for the business banking platform. My work on the invoicing system reduced manual errors by 90% and saved 6,000 support hours per year.

Before Monzo I worked at Funding Circle for 2 years building loan origination APIs in Ruby on Rails.

BSc Computer Science from University College London, 2018.

I work with Ruby, Go, PostgreSQL, Redis, Kafka, Kubernetes, AWS, and React.
    `,
  },
  {
    id: "paste-023",
    category: "paste",
    persona: "Paste — Chinese name, Taiwan-based engineer",
    reviewerScore: 4.4,
    pasteText: `
Wei-Chen Lin (林威辰)
wei.chen.lin@gmail.com | +886 912 345 678 | Taipei, Taiwan

Full-Stack Engineer | 6 years experience

Experience

Senior Engineer, TSMC (Taiwan Semiconductor Manufacturing Co.) — Hsinchu (2021–Present)
Built internal process monitoring dashboards tracking 500+ fab production metrics.
Reduced yield analysis report generation time by 70%.

Engineer, KKCompany — Taipei (2019–2021)
Backend services for KKBox streaming platform (11M subscribers).

Junior Engineer, Garena — Taipei (2018–2019)
Game backend services for Southeast Asia region.

Education
M.S. Computer Science, National Taiwan University, 2018
B.S. Electrical Engineering, NCTU, 2016

Skills
TypeScript, React, Node.js, Python, Go, PostgreSQL, Redis, AWS, Docker, Kubernetes
    `,
  },
  {
    id: "paste-024",
    category: "paste",
    persona: "Paste — Korean name, English resume",
    reviewerScore: 4.5,
    pasteText: `
Hyun-jun Park (박현준)
hyunjun.park@gmail.com | Seoul, South Korea
https://github.com/hjpark

Machine Learning Engineer | 5 years

Professional Experience:

MLE, Naver Corp. (2021–Present) — Seongnam, South Korea
Built neural ranking model for Naver Search, improving click-through rate by 18% for 44M daily users.
Reduced inference latency from 120ms to 35ms via model distillation.

AI Researcher, Samsung SDS (2019–2021) — Seoul
NLP research for Samsung Bixby assistant localization.

Education:
M.S. AI, KAIST (Korea Advanced Institute of Science and Technology) — 2019
B.S. Computer Science, Seoul National University — 2017

Technical Skills:
Python, PyTorch, TensorFlow, NLP, transformer models, Kubernetes, GCP, data pipelines
    `,
  },
  {
    id: "paste-025",
    category: "paste",
    persona: "Paste — Arabic name, UAE-based senior engineer",
    reviewerScore: 4.3,
    pasteText: `
Mohammed Al-Rashidi
mohammed.alrashidi@gmail.com | Abu Dhabi, UAE | +971 52 456 7890

Technology Lead | 12 years in enterprise software

Career History:

Technology Lead, ADNOC (Abu Dhabi National Oil Company) [2019 – Present]
Architected digital transformation platform connecting 70+ business units.
Led 30-person engineering team. Delivered $40M enterprise data platform on time.

Senior Engineer, Etisalat (2015 – 2019)
Telecom billing and CRM systems for 12M subscribers.

Software Engineer, PricewaterhouseCoopers (2013 – 2015)

Education:
M.Sc. Information Systems, Khalifa University of Science and Technology — 2013
B.Sc. Computer Engineering, UAE University — 2011

Technical Expertise:
Java, Spring Boot, Python, Oracle, PostgreSQL, Microsoft Azure, Kubernetes, SAP, enterprise integration
    `,
  },
  {
    id: "paste-026",
    category: "paste",
    persona: "Paste — Indian name, US resume, senior SWE at FAANG",
    reviewerScore: 4.7,
    pasteText: `
Vivek Krishnamurthy
vivek.k@gmail.com | (669) 555-2020 | Sunnyvale, CA
https://www.linkedin.com/in/vivekkrishnamurthy | https://github.com/vivekkris

Staff Software Engineer — Distributed Systems | 10+ years

EXPERIENCE

Staff Software Engineer, Apple  (2020 – Present)
Led redesign of Apple Pay's reconciliation service handling $500B in annual transaction volume.
Reduced settlement discrepancy rate from 0.04% to <0.001%. Patent pending on reconciliation algorithm.
Managed 6-engineer team across Sunnyvale and London.

Senior Software Engineer, Lyft  (2017 – 2020)
Built real-time pricing engine for Lyft Shared serving 15M weekly rides.
Reduced infrastructure costs by $3M/yr via algorithmic optimization.

Software Engineer, Microsoft  (2014 – 2017)
Azure CosmosDB team — multi-region replication protocol.

EDUCATION
B.E. Computer Science, BITS Pilani — 2014

SKILLS
Java, C++, Python, distributed systems, consensus protocols, Apache Flink, Kafka, AWS, Azure, system design
    `,
  },
  {
    id: "paste-027",
    category: "paste",
    persona: "Paste — French name, Paris-based ML engineer",
    reviewerScore: 4.5,
    pasteText: `
Baptiste Lefebvre
baptiste.lefebvre@gmail.com | Paris, France | +33 6 12 34 56 78
https://huggingface.co/baptiste-lefebvre

Machine Learning Engineer | NLP & LLMs | 7 years

Expérience Professionnelle

Lead ML Engineer – BNP Paribas AI Lab, Paris (2022–Present)
Building RAG-based document intelligence for 200,000 corporate banking documents.
Fine-tuned domain-specific LLMs for financial entity extraction (F1: 0.94).

Research Engineer – Inria / Facebook AI Research Joint Lab, Paris (2019–2022)
Co-authored 3 papers on multilingual NLP (ACL 2021, EMNLP 2021, ACL 2022).

Data Scientist – Criteo, Paris (2018–2019)
Ad recommendation models serving 5B daily ad impressions.

Formation (Education)
Diplôme d'Ingénieur, École Polytechnique – 2018
M.Sc. Machine Learning, ENS Paris-Saclay – 2018

Compétences (Skills)
Python, PyTorch, HuggingFace, LLMs, RAG, NLP, distributed training, CUDA, AWS
    `,
  },
  {
    id: "paste-028",
    category: "paste",
    persona: "Paste — Brazilian name, Portuguese-English mixed headers",
    reviewerScore: 4.3,
    pasteText: `
Fernanda Costa
fernanda.costa@gmail.com | São Paulo, Brasil | +55 11 9 8765-4321

Product Designer | UX/UI | 6 anos de experiência

Experiência Profissional (Work Experience)

Lead Product Designer – iFood (2021–Presente)
Redesigned driver app onboarding flow: 40% reduction in driver dropoff.
Led design for iFood Pro subscription ($3M ARR launch).
Design team of 5 people.

Senior UX Designer – Nubank (2019–2021)
Designed the credit limit increase flow — improved conversion by 28%.

UX Designer – Resultados Digitais (2018–2019)

Formação (Education)
Bacharelado em Design, Universidade de São Paulo (USP) – 2018

Habilidades (Skills)
Figma, Prototyping, User Research, Design Systems, Accessibility, Data-Driven Design, HTML/CSS basics
    `,
  },
  {
    id: "paste-029",
    category: "paste",
    persona: "Paste — multi-page resume with page 2 header artifact",
    reviewerScore: 4.3,
    notes: "Tests removal of page break artifacts",
    pasteText: `
Richard Thompson
richard.thompson@gmail.com | (617) 555-4444 | Boston, MA

EXPERIENCE

Chief Technology Officer, HealthBridge Inc. (2019–Present)
Scaled engineering from 5 to 60 engineers. Built HIPAA-compliant telemedicine platform with 500K patients.
Raised $40M Series B in 2022 with engineering infrastructure as key differentiator.

— Page 2 —

VP Engineering, PatientFirst (2016–2019)
Led development of population health management platform for 2M patients across 20 hospital systems.

Director of Engineering, Medidata Solutions (2013–2016)
Clinical trial data platform serving 250 pharmaceutical clients.

Senior Engineer, IBM Watson Health (2010–2013)

EDUCATION
M.S. Biomedical Informatics, Harvard Medical School — 2010
B.S. Computer Science, MIT — 2008

SKILLS
Engineering leadership, HIPAA compliance, AWS, PostgreSQL, microservices, Kubernetes, Python, Java, HL7, FHIR
    `,
  },
  {
    id: "paste-030",
    category: "paste",
    persona: "Paste — creative/designer resume with dense formatting",
    reviewerScore: 4.3,
    pasteText: `
★ LUNA RODRIGUEZ ★
luna@lunacreative.io | (213) 555-7777 | Los Angeles, CA
lunacreative.io | @lunadesigns (Dribbble, Behance)

✦ EXPERIENCE ✦

Creative Director // Riot Games (2021–Now)
Visual identity for 5 game titles (Valorant, LoL, TFT). Led team of 12 designers.
Won 2 Clio Awards for gaming advertising.

Senior Designer // Snap Inc. (2018–2021)
Designed Snapchat AR lens templates used by 50M+ users daily.
Led visual system for Spotlight feature launch.

Designer // Apple (2016–2018)
App Store visual design and editorial content.

✦ EDUCATION ✦
BFA Graphic Design // CalArts // 2016

✦ SKILLS ✦
Brand identity, motion design, Figma, After Effects, Illustrator, Photoshop, 3D (Blender), team leadership
    `,
  },
  {
    id: "paste-031",
    category: "paste",
    persona: "Paste — Hebrew name, Israeli engineer",
    reviewerScore: 4.4,
    pasteText: `
Noa Shapiro
noa.shapiro@gmail.com | Tel Aviv, Israel | +972 52 123 4567

Cybersecurity Engineer | 5 years

Work History:
Security Engineer, CyberArk (2021–Present), Beer Sheva, Israel
Developed PAM (Privileged Access Management) features protecting 7,000+ enterprise clients.
Found and patched 3 critical CVEs in competitive analysis work.

Security Researcher, Check Point Software (2019–2021), Tel Aviv
Threat intelligence research on APT groups. Presented research at Black Hat 2021.

IDF Intelligence Corps (2015–2018), mandatory service

Education:
B.Sc. Computer Science (summa cum laude), Ben-Gurion University of the Negev — 2019

Skills:
Penetration testing, Python, C/C++, malware analysis, reverse engineering, IDA Pro, SIEMs, AWS Security
    `,
  },
  {
    id: "paste-032",
    category: "paste",
    persona: "Paste — Dutch name, Amsterdam engineer",
    reviewerScore: 4.5,
    pasteText: `
Sander van der Berg
sander.vdberg@gmail.com | Amsterdam, Netherlands

Site Reliability Engineer | 8 years

Experience:

Principal SRE — Booking.com (2020–present)
Own reliability for hotel search backend (1.5M properties, 25M daily searches).
Drove SLI/SLO program across 80 engineering teams.
Reduced P99 latency by 55% across critical booking paths.

Senior SRE — TomTom (2018–2020)
Navigation platform reliability for 50M connected vehicles.

SRE — Wehkamp (2016–2018)
E-commerce platform with 1.5M customers.

Education:
MSc Computer Science, TU Delft — 2016
BSc Electrical Engineering, TU Eindhoven — 2014

Skills:
Kubernetes, AWS, Python, Go, Prometheus/Grafana, SLOs, chaos engineering, Terraform, PostgreSQL, distributed systems
    `,
  },
  {
    id: "paste-033",
    category: "paste",
    persona: "Paste — no phone number provided",
    reviewerScore: 4.4,
    pasteText: `
Claudia Ferretti
claudia.ferretti@gmail.com | Milan, Italy
https://linkedin.com/in/claudia-ferretti-data

Data Architect | 9 years

Professional History:

Data Architect Senior, Sky Italia (2021–Present)
Designed lakehouse architecture handling 2B daily streaming events (sports viewership, content analytics).
Led migration from Hadoop to Spark/Delta Lake — 60% cost reduction.

Data Architect, UniCredit (2017–2021)
Enterprise data warehouse for 27M retail banking customers across 17 countries.

Data Engineer, Accenture Italy  (2015–2017)

Education:
Laurea Magistrale in Ingegneria Informatica, Politecnico di Milano – 2015

Technical Skills:
Azure Databricks, Delta Lake, Apache Spark, Python, SQL, Kafka, dbt, Power BI, Hadoop, enterprise architecture
    `,
  },
  {
    id: "paste-034",
    category: "paste",
    persona: "Paste — Romanian name, EU-based software engineer",
    reviewerScore: 4.3,
    pasteText: `
Andrei Popescu
andrei.popescu@gmail.com | +40 722 123 456 | Bucharest, Romania (open to relocation)

Software Engineer | Backend Systems | 6 years

EXPERIENCE:

Senior Backend Engineer, UiPath (2021 – present)
UiPath is the world's largest RPA company (NYSE: PATH). I own the process mining data pipeline ingesting 500M events/day.
Reduced event processing latency by 65%.

Backend Engineer, ING Tech (2019 – 2021)
Banking APIs for ING's Romanian and Dutch markets (3M customers).

Junior Developer, Endava (2018 – 2019)
Outsourced development for UK financial services clients.

EDUCATION:
Bachelor of Engineering, "Politehnica" University of Bucharest – Computer Science – 2018

SKILLS:
Java, Kotlin, Scala, Spring Boot, Kafka, PostgreSQL, ClickHouse, AWS, Kubernetes, Terraform
    `,
  },
  {
    id: "paste-035",
    category: "paste",
    persona: "Paste — minimal formatting, dense text block",
    reviewerScore: 4.1,
    notes: "Wall of text with minimal structure",
    pasteText: `
Rebecca Moss | rebecca.moss@gmail.com | (312) 555-0001 | Chicago IL
I have 8 years of experience in product design and UX. Currently Principal Designer at Motorola Solutions (2020-present) where I lead design for their command center software used by 5,000 police and fire departments. Before that I was a senior UX designer at Orbitz/Expedia for 3 years (2017-2020) where I owned hotel search and booking flows. Before Orbitz I was a UX designer at a digital agency for 2 years. I have a BFA in Interactive Design from the School of the Art Institute of Chicago, class of 2015. My tools include Figma, Sketch, InVision, Zeplin, UserTesting, FullStory, and I'm proficient in accessibility/WCAG standards.
    `,
  },
  {
    id: "paste-036",
    category: "paste",
    persona: "Paste — three employers, no dates anywhere",
    reviewerScore: 3.9,
    notes: "Tests extraction when dates are completely absent",
    pasteText: `
Oscar Nguyen
oscar.nguyen@gmail.com | San Jose, CA

Work Experience

Senior Software Engineer at Adobe
Built Creative Cloud file sync service with 30M daily active users. Reduced sync errors by 22%.

Software Engineer at Box
File collaboration backend features using Java and MySQL.

Associate Engineer at SAP Concur
Expense management application features.

Education
B.S. Computer Science, UC Santa Cruz

Skills
Java, Python, MySQL, PostgreSQL, Redis, AWS, Kubernetes, REST APIs, microservices
    `,
  },
  {
    id: "paste-037",
    category: "paste",
    persona: "Paste — hyphenated last name, Canadian engineer",
    reviewerScore: 4.5,
    pasteText: `
Sarah Chen-Williams
sarah.chen-williams@gmail.com | (416) 555-3210 | Toronto, Ontario, Canada

Senior Fullstack Engineer | 7 years

Experience:

Senior Fullstack Engineer — Shopify (2021–Present)
Built seller analytics dashboard used by 2M+ merchants. Features contributed to 15% increase in merchant retention.
Performance optimization reduced dashboard load time from 8s to 1.2s.

Fullstack Engineer — Wealthsimple (2019–2021)
Investment portfolio management features using React and GraphQL.

Frontend Developer — Hootsuite (2017–2019)
Social media analytics displays for 200K business users.

Education:
B.Sc. Honours Computer Science, University of Toronto — 2017

Skills:
TypeScript, React, Next.js, Ruby on Rails, GraphQL, PostgreSQL, Redis, AWS, Tailwind CSS
    `,
  },
  {
    id: "paste-038",
    category: "paste",
    persona: "Paste — Swedish name, Stockholm tech scene",
    reviewerScore: 4.4,
    pasteText: `
Erik Lindström
erik.lindstrom@gmail.com | Stockholm, Sweden | +46 70 123 45 67

Software Engineer (Backend) | 6 years

Erfarenhet (Experience):

Backend Engineer, Spotify (2021–present)
Podcast recommendation engine (500M users). Improved podcast discovery click rate by 22%.

Backend Engineer, Klarna (2019–2021)
Buy-now-pay-later checkout API handling €50B annual transactions.

Junior Engineer, King (Candy Crush) (2018–2019)
Game analytics backend.

Utbildning (Education):
M.Sc. Computer Science, KTH Royal Institute of Technology – 2018

Tekniska färdigheter (Technical Skills):
Java, Python, Scala, Kafka, Cassandra, GCP, Kubernetes, gRPC, distributed systems
    `,
  },
  {
    id: "paste-039",
    category: "paste",
    persona: "Paste — Indian-American dual experience, strong metrics",
    reviewerScore: 4.8,
    pasteText: `
Rakesh Anand
rakesh.anand@gmail.com | (512) 555-6789 | Austin, TX

Distinguished Engineer | Platform & Infrastructure | 15 years

PROFESSIONAL EXPERIENCE

Distinguished Engineer, Dell Technologies (2018–Present)
Architect for Dell's cloud infrastructure serving 90,000 enterprise customers.
Led multi-year transformation migrating 200 data centers to cloud-native architecture — $150M infrastructure cost savings.
Holds 7 patents in storage optimization and cloud orchestration.

Principal Engineer, Rackspace (2013–2018)
OpenStack architecture for managed cloud platform (30,000 customers).
Core contributor to OpenStack Swift/Cinder components (10M+ downloads).

Senior Engineer, TCS (India + US) (2009–2013)
Enterprise software for US banking clients. Transferred from Hyderabad to Austin in 2011.

EDUCATION
B.Tech Computer Science, IIT Madras — 2009
Executive Education, Cloud Architecture — MIT Sloan, 2019

CORE SKILLS
C, C++, Python, Go, OpenStack, Ceph, Kubernetes, Terraform, storage systems, system design, patents
    `,
  },
  {
    id: "paste-040",
    category: "paste",
    persona: "Paste — South African engineer, Cape Town",
    reviewerScore: 4.3,
    pasteText: `
Sipho Dlamini
sipho.dlamini@gmail.com | Cape Town, South Africa | +27 72 345 6789

Software Engineer | Fintech & Insurance | 5 years

Work Experience:

Senior Software Engineer, OUTsurance (2021–Present)
Microservices for South Africa's largest direct insurer (2M+ policies).
Built real-time premium calculation engine processing 500K quotes daily.

Software Engineer, Capitec Bank (2019–2021)
Digital banking backend — mobile payments and account management APIs.

Graduate Developer, BCX (2018–2019)
Enterprise integration development for South African corporates.

Education:
B.Sc. Computer Science, University of Cape Town — 2018

Skills:
Java, Spring Boot, Python, PostgreSQL, Kafka, Docker, Kubernetes, AWS, financial systems
    `,
  },
  {
    id: "paste-041",
    category: "paste",
    persona: "Paste — Vietnamese name, US-based engineer",
    reviewerScore: 4.4,
    pasteText: `
Nguyen Thi Lan (Lan Nguyen)
lannguyen@gmail.com | (408) 555-2020 | San Jose, CA

Frontend Engineer | 5 years

Experience

Senior Frontend Engineer, PayPal (2021–Present)
Built accessible checkout flow used by 200M active users globally.
Led migration to React 18 and concurrent mode — 30% Core Web Vitals improvement.

Frontend Engineer, Intuit (2019–2021)
TurboTax web application — tax filing flow used by 30M US customers.

Junior Frontend Engineer, Synopsys (2018–2019)
Internal tooling for EDA software teams.

Education
B.S. Computer Science, San Jose State University — 2018

Skills
React, TypeScript, Next.js, Accessibility (WCAG), CSS, Jest, Playwright, Webpack, performance optimization
    `,
  },
  {
    id: "paste-042",
    category: "paste",
    persona: "Paste — long career (20+ years), senior architect",
    reviewerScore: 4.5,
    pasteText: `
William Foster
william.foster@gmail.com | (408) 555-0987 | Cupertino, CA
linkedin.com/in/wfoster-architect

Distinguished Architect | Cloud & Enterprise Systems | 22 years

Professional Experience:

Distinguished Architect, Cisco Systems (2015–Present)
Chief architect for Cisco's SD-WAN product line ($2B annual revenue).
Led 200-engineer distributed team across 4 countries.
Delivered Cisco+ cloud platform, company's first multi-cloud architecture.

Principal Architect, Sun Microsystems → Oracle (2005–2015)
Java EE application server architecture (GlassFish). Co-authored 2 Java JSRs.

Senior Engineer, BEA Systems (2002–2005)

Education:
M.S. Computer Science, University of Illinois Urbana-Champaign — 2002
B.S. Computer Science, Purdue University — 1999

Skills:
Enterprise architecture, distributed systems, Java, Python, Kubernetes, AWS, Azure, SD-WAN, network protocols
    `,
  },
  {
    id: "paste-043",
    category: "paste",
    persona: "Paste — non-traditional education, bootcamp grad, strong IC",
    reviewerScore: 4.2,
    pasteText: `
Jordan Blake
jordan.blake@gmail.com | (503) 555-4567 | Portland, OR | github.com/jblake-dev

Full Stack Developer | 4 years

Career History:

Senior Developer, Vacasa (2022–Present)
Vacation rental platform serving 35,000 properties. Built dynamic pricing engine increasing average nightly rate by 12%.

Software Developer, LeaflyMedia (2020–2022)
E-commerce features for cannabis-focused media site (10M monthly users).

Education:
App Academy (Software Engineering Intensive) — 2020
B.A. Psychology, Reed College — 2017 (no CS degree)

Technical Stack:
JavaScript, TypeScript, React, Node.js, Express, Rails, PostgreSQL, Redis, AWS, Docker
    `,
  },
  {
    id: "paste-044",
    category: "paste",
    persona: "Paste — government/public sector engineer, compliance-heavy",
    reviewerScore: 4.3,
    pasteText: `
Christopher Hall
christopher.hall@gmail.com | (571) 555-8888 | Arlington, VA
Security Clearance: TS/SCI (Active)

Software Engineer — Federal & Defense | 9 years

PROFESSIONAL EXPERIENCE

Senior Software Engineer, Booz Allen Hamilton (2019–Present)
Lead engineer on National Geospatial-Intelligence Agency (NGA) data platform.
Built geospatial processing pipeline handling classified satellite imagery at petabyte scale.

Software Engineer, MITRE Corporation (2015–2019)
Cybersecurity tool development for DoD sponsor programs.

EDUCATION
B.S. Computer Science, George Mason University — 2015
Certified Information Systems Security Professional (CISSP), 2020

SKILLS
Python, Java, C++, AWS GovCloud, geospatial (GDAL, QGIS), security clearance, classified data handling, Docker
    `,
  },
  {
    id: "paste-045",
    category: "paste",
    persona: "Paste — product manager, strong business metrics",
    reviewerScore: 4.6,
    pasteText: `
Aisha Thompson
aisha.thompson@gmail.com | (415) 555-1234 | San Francisco, CA

Senior Product Manager | Consumer & Mobile | 8 years

EXPERIENCE

Senior PM, Airbnb (2021–Present)
Owns Airbnb's Wish Lists and Saved Searches (60M users). Launched "Similar Listings" feature — drove 8% increase in booking conversion.
Defined 3-year strategy for discovery personalization.

Product Manager, iOS, Instagram (2018–2021)
Owned the Explore tab (500M daily users). Shipped Stories enhancements, Reels v1.
Drove 20% increase in daily active creators.

Associate PM, YouTube (2016–2018)
YouTube home feed ranking signals and experimentation.

EDUCATION
MBA, Stanford Graduate School of Business — 2016
B.S. Industrial Engineering, Stanford — 2014

SKILLS
Product strategy, A/B experimentation, SQL, Amplitude, JIRA, Figma, consumer mobile, marketplace dynamics
    `,
  },
  {
    id: "paste-046",
    category: "paste",
    persona: "Paste — entry-level developer, minimal experience",
    reviewerScore: 3.9,
    pasteText: `
Alex Park
alex.park@gmail.com | (678) 555-0000 | Atlanta, GA

Software Developer | 1 year experience

Experience
Junior Developer, Ionic Health, Atlanta GA (March 2024–Present)
Building features for patient intake forms using React and Django. Fixed 40+ bugs during first 6 months.

Internship, NCR Corporation, Atlanta GA (Summer 2023)
Worked on ATM software UI features in Java.

Education
B.S. Information Technology, Georgia Tech, 2024

Skills
Java, Python, React, SQL, Git, Django, REST APIs, Agile
    `,
  },
  {
    id: "paste-047",
    category: "paste",
    persona: "Paste — VP-level with board/advisory roles",
    reviewerScore: 4.6,
    pasteText: `
Elaine Morrison
elaine.morrison@gmail.com | (617) 555-9999 | Newton, MA
linkedin.com/in/elainemorrison

VP Engineering | EdTech | 12 years

Board & Advisory
• Board Observer, OpenStax (Rice University), 2023–Present
• Technical Advisor, Noodle (edtech startup), 2022–Present

Professional Experience

VP Engineering, Chegg (2020–Present)
Led engineering for Chegg's tutoring and Study products (8M student subscribers).
Scaled org from 50 to 120 engineers. Delivered iOS/Android app redesign boosting ratings from 3.8 to 4.6.

Director of Engineering, Pearson Digital (2015–2020)
Pearson Realize LMS platform (6M K-12 students). Led 3 major platform migrations.

Senior Engineer, Blackboard (2012–2015)

Education
M.S. Computer Science, Northeastern University — 2012
B.S. Math and CS, UMass Amherst — 2010

Skills
Engineering leadership, Agile at scale, AWS, Python, React, PostgreSQL, EdTech platforms, roadmap
    `,
  },
  {
    id: "paste-048",
    category: "paste",
    persona: "Paste — transition from hardware to software, dual background",
    reviewerScore: 4.3,
    pasteText: `
Reza Ahmadi
reza.ahmadi@gmail.com | (408) 555-1234 | San Jose, CA

Embedded Software Engineer | Hardware-Software Co-Design | 7 years

Career History

Senior Embedded Engineer, Qualcomm (2020–Present)
Modem firmware development for 5G chips (Snapdragon X65). Implemented dynamic spectrum sharing algorithm — 5% throughput increase deployed to 200M devices.

Embedded Software Engineer, Texas Instruments (2017–2020)
Real-time firmware for industrial motor control systems.

Hardware Design Intern, Intel (Summer 2016)

Education
M.S. Electrical and Computer Engineering, UC San Diego — 2017
B.S. Electrical Engineering, UT Austin — 2015

Skills
C, C++, Python, FreeRTOS, ARM Cortex-A/M, 5G NR, RF protocols, JTAG debugging, Yocto, Linux kernel
    `,
  },
  {
    id: "paste-049",
    category: "paste",
    persona: "Paste — platform engineer with strong open source credentials",
    reviewerScore: 4.5,
    pasteText: `
Felix Bauer
felix.bauer@gmail.com | Zurich, Switzerland
https://github.com/fbauerdev | https://linkedin.com/in/felixbauer-infra

Platform Engineer | Open Source Maintainer | 8 years

Open Source:
• Maintainer: popular Terraform AWS provider (~5M monthly downloads)  
• Core contributor: Helm (3,000+ commits)
• GitHub: 2,800+ stars across projects

Experience:

Staff Platform Engineer, Credit Suisse (2021–Present)
Platform engineering lead for CS's private cloud (50,000+ workloads).

Senior Platform Engineer, Google Switzerland (2018–2021)
Internal developer platform (IDP) serving 25,000 Google engineers.

SRE, Doodle / Meekan (2016–2018)
Scheduling SaaS infrastructure (20M users).

Education:
M.Sc. Computer Science, ETH Zurich — 2016

Skills:
Kubernetes, Terraform, Go, Helm, Python, AWS, GCP, platform engineering, developer experience
    `,
  },
  {
    id: "paste-050",
    category: "paste",
    persona: "Paste — resume with certifications section",
    reviewerScore: 4.4,
    pasteText: `
Juan Carlos Vargas
jcvargas@gmail.com | (305) 555-7777 | Miami, FL

Cloud Solutions Architect | 8 years

Work Experience:

Principal Cloud Architect, Carnival Corporation (2021–Present)
Designed Azure-based ship IT infrastructure for 90+ cruise ships globally.
Built real-time passenger experience platform handling 6,000 concurrent users per ship.

Cloud Architect, Royal Caribbean (2018–2021)
AWS migration strategy for core reservations system (10M annual bookings).

Cloud Engineer, Ryder Systems (2016–2018)
Azure IaaS infrastructure for logistics fleet management.

Education:
B.S. MIS, Florida International University — 2016

Certifications:
• Microsoft Azure Solutions Architect Expert (2022)
• AWS Certified Solutions Architect – Professional (2021)
• HashiCorp Certified Terraform Associate (2020)
• TOGAF 9.2 Certified (2023)

Skills:
Azure, AWS, GCP, Terraform, Kubernetes, microservices, enterprise architecture, Python, infrastructure
    `,
  },
  {
    id: "paste-051",
    category: "paste",
    persona: "Paste — design engineer, unusual specialty",
    reviewerScore: 4.2,
    pasteText: `
Amara Osei
amara.osei@gmail.com | (347) 555-2222 | Brooklyn, NY

Design Engineer | 5 years | at the intersection of code and design

Experience:

Design Engineer, Figma (2022–Present)
Building Figma's design system component library (React). Used by Figma's 4M users.
Shipped Figma's dark mode — 35% adoption in first week.

Frontend Developer + Designer, Kickstarter (2019–2022)
Full-stack contributions + design work for Kickstarter's creator tools.

UI Developer, The New York Times (2018–2019)
Interactive journalism components (D3.js, SVG animations).

Education:
B.F.A. Design & Technology, Parsons School of Design — 2018

Skills:
React, TypeScript, CSS-in-JS, Figma (API), D3.js, design systems, accessibility, SVG animation, Storybook
    `,
  },
  {
    id: "paste-052",
    category: "paste",
    persona: "Paste — recent MS grad, multiple research internships",
    reviewerScore: 4.4,
    pasteText: `
Yuna Kimura
yuna.kimura@gmail.com | (617) 555-1212 | Cambridge, MA
https://yunakimura.github.io | https://scholar.google.com/yuna-kimura

PhD Graduate → Research Scientist / MLE | ML Systems

Education:
Doctor of Philosophy, Computer Science, MIT — 2024 (advisor: Prof. S. Srinivas)
Thesis: "Efficient On-Device Inference at Scale" — 3 ICML papers, 280 citations
B.Eng. Computer Engineering, Keio University, Tokyo — 2019

Research Internships:
Google Brain, Mountain View: Federated learning systems (Summer 2023)
DeepMind, London: Model compression (Summer 2022)
Microsoft Research, Redmond: Quantization methods (Summer 2021)

Skills:
Python, PyTorch, JAX, C++, CUDA, MLIR, on-device ML, federated learning, model compression, academic research
    `,
  },
  {
    id: "paste-053",
    category: "paste",
    persona: "Paste — Nigerian name, UK-based senior engineer",
    reviewerScore: 4.4,
    pasteText: `
Oluwaseun Adebayo
o.adebayo@gmail.com | London, UK | +44 7912 345678

Senior Backend Engineer | 7 years

Career:

Senior Backend Engineer, Starling Bank (2021–Present)
Core banking APIs for Starling's 3.5M UK customers. Built instant notifications infrastructure with <100ms delivery.
Reduced customer support tickets by 25% through real-time transaction alerts.

Backend Engineer, Funding Circle (2018–2021)
Small business lending platform — loan origination and underwriting APIs.

Graduate Engineer, Capgemini UK (2016–2018)
Enterprise Java development for HMRC (UK tax authority).

Education:
BEng Computer Systems Engineering, University of Warwick — 2016

Skills:
Java, Kotlin, Spring Boot, PostgreSQL, Kafka, Redis, Docker, Kubernetes, AWS, financial APIs
    `,
  },
  {
    id: "paste-054",
    category: "paste",
    persona: "Paste — comma-separated skill lists (unusual format)",
    reviewerScore: 4.2,
    pasteText: `
Henry Zhang
henry.zhang@gmail.com, (206) 555-3456, Seattle WA

Software Engineer, 8 years, primary focus: infrastructure and reliability

Experience:

Staff Engineer at Amazon Web Services (2021 - present)
Core contributor to EC2 networking. Built VPC flow logs ingest pipeline processing 15TB/day.
Authored 4 RFCs adopted across EC2 org.

Senior Engineer at Twitch (Amazon, 2018 - 2021)
Video ingest and transcoding pipeline for 9M concurrent streamers peak load.

Engineer at RealNetworks (2016-2018)
Media streaming protocols, C++ and Python.

Education: B.S. CS, University of Washington, 2016. M.S. CE, UW, 2017.

Skills: C, C++, Python, Go, Rust, networking, Linux kernel, AWS (EC2, VPC, EBS), Kafka, distributed systems, reliability engineering
    `,
  },
  {
    id: "paste-055",
    category: "paste",
    persona: "Paste — quantum computing engineer, niche role",
    reviewerScore: 4.4,
    pasteText: `
Dr. Kaveh Zare
kaveh.zare@gmail.com | Boston, MA
https://github.com/kavehzare-quantum

Quantum Software Engineer | Quantum Computing Research | 5 years post-PhD

Experience:

Quantum Software Engineer, IBM Quantum (2022–Present)
Core contributor to Qiskit open-source quantum computing framework (750K monthly downloads).
Implemented error mitigation algorithms improving circuit fidelity by 30%.

Research Scientist, MIT Center for Quantum Engineering (2019–2022)
Postdoctoral researcher on quantum error correction codes. 6 peer-reviewed publications.

Education:
PhD Electrical Engineering (Quantum Computing), MIT — 2019
M.Sc. Physics, University of Tehran — 2013
B.Sc. Electrical Engineering, Sharif University of Technology — 2011

Skills:
Python, Qiskit, quantum gates, error correction, linear algebra, C++, Julia, quantum algorithms, FPGA control systems
    `,
  },
  {
    id: "paste-056",
    category: "paste",
    persona: "Paste — recruiter LinkedIn message sounding paste",
    reviewerScore: 3.8,
    notes:
      "Informal, conversational tone — tests robustness to atypical structure",
    pasteText: `
Hey! I thought I'd help you with my resume. My name is Brenda Martinez, my email is brenda.martinez@gmail.com and my phone is (773) 555-4444. I'm based in Chicago, IL.

So, my current job is Software Engineer at Groupon. I've been there about 3 years (since 2022). I work on the deals backend, mostly Python and Django. Before this I worked at GrubHub for 2 years (2019-2021) as a backend developer.

I went to DePaul University and got a BS in Computer Science in 2019.

My skills include: Python, Django, PostgreSQL, Redis, Celery, AWS, Docker, REST APIs.
    `,
  },
  {
    id: "paste-057",
    category: "paste",
    persona: "Paste — game studio engineer, creative tech",
    reviewerScore: 4.3,
    pasteText: `
Ethan Park
ethan.park@gmail.com | (310) 555-8765 | Los Angeles, CA

Game Engineer — Graphics & Real-Time Systems | 7 years

Industry Experience:

Senior Graphics Engineer, Activision Blizzard (2020–Present)
Lead graphics engineer on Call of Duty: Warzone Pacific. Implemented weather/volumetric rendering system.
Shipped ray-traced reflections reducing aliasing complaints by 40%.

Graphics Engineer, Insomniac Games (2017–2020)
Rendering work on Spider-Man PS4 (4M copies sold in 3 days). Implemented screen-space SSR.

Junior Engineer, EA Sports (2016–2017)
FIFA 17 stadium rendering pipeline.

Education:
B.S. Computer Science (Graphics Track), UC San Diego — 2016

Skills:
C++, Unreal Engine, DirectX 12, Vulkan, HLSL, GLSL, GPU optimization, renderdoc, console development (PS5, Xbox), realtime rendering
    `,
  },
  {
    id: "paste-058",
    category: "paste",
    persona: "Paste — multiple languages resume (Spanish/English mix)",
    reviewerScore: 4.2,
    notes: "Bilingual section headers (English/Spanish)",
    pasteText: `
Carlos Alberto Mendoza Reyes
c.mendoza@gmail.com | +52 55 1234 5678 | Ciudad de México, México / Mexico City
Disponible para trabajo remoto | Available for remote work

Ingeniero de Software / Software Engineer | 8 años / 8 years

Experiencia Laboral / Work Experience:

Arquitecto de Software (Software Architect), Mercado Libre — CDMX (2021–Presente)
Diseño de microservicios para la plataforma de pagos (MercadoPago) con 40M usuarios activos.
Design of microservices for the payments platform (MercadoPago) with 40M active users.

Ingeniero Senior / Senior Engineer, Wizeline — CDMX (2018–2021)
Desarrollo de soluciones de software para clientes en EE.UU. / Software solutions for US clients.

Formación / Education:
Ingeniería en Computación — UNAM (Universidad Nacional Autónoma de México) — 2018

Habilidades / Skills:
Java, Python, Node.js, React, PostgreSQL, MongoDB, AWS, Docker, Kubernetes, microservices
    `,
  },
  {
    id: "paste-059",
    category: "paste",
    persona: "Paste — executive summary heavy, little detail in experience",
    reviewerScore: 4.1,
    pasteText: `
Margot Sullivan
margot.sullivan@gmail.com | (617) 555-2345 | Cambridge, MA
https://linkedin.com/in/margotsullivan

Transformational Technology Leader | Former MIT Researcher | 20+ years

Executive Profile:
Award-winning technology executive with a track record of building high-performing engineering organizations and delivering transformational digital products. Recognized by Forbes as a "Top 50 Women in Tech" (2022). Board member of 2 Boston-area tech non-profits.

Experience:

CTO, Carbyne (2020–Present)
Leading 911 emergency communications modernization across 2,000+ public safety agencies in 15 countries.

VP Engineering, Akamai Technologies (2015–2020)
Led 300-person global engineering organization.

Senior Director, Oracle Cloud (2010–2015)

Senior Researcher, MIT CSAIL (2006–2010)

Education:
PhD Computer Science, MIT — 2006
B.S. CS, Yale — 2001

Skills:
Technology leadership, cloud architecture, emergency communications, engineering management, Python, distributed systems
    `,
  },
  {
    id: "paste-060",
    category: "paste",
    persona:
      "Paste — career re-entry after 5-year gap, comprehensive explanation",
    reviewerScore: 4.0,
    notes: "Gap period with skills maintenance, returning to workforce",
    pasteText: `
Angela Davis
angela.davis@gmail.com | (415) 555-9001 | Oakland, CA

Full Stack Developer (returning after family leave)

About My Gap (2019–2024):
I took 5 years away from full-time tech employment to raise my children. During this time I maintained my technical skills through freelance web projects (3 small business sites), completing AWS certification, and contributing to 2 open source projects.

Before My Gap:

Senior Frontend Engineer, Salesforce (2016–2019)
Lightning component framework development. My components are used by 100K+ Salesforce customers.

Frontend Engineer, Box (2014–2016)
File sharing and collaboration UI features.

Software Engineer, Intuit (2012–2014)
TurboTax web application.

Education:
B.S. Computer Science, UC Davis — 2013

Current Skills:
React, TypeScript, Vue.js, Node.js, Python, AWS (Solutions Architect Associate, 2023), PostgreSQL, GraphQL
    `,
  },
];

// ===========================================================================
// SECTION E: PDF — Simulated parsed text with artifacts (9 cases)
// ===========================================================================

const pdfCases: GoldCase[] = [
  {
    id: "pdf-001",
    category: "pdf",
    persona: "Standard PDF — header/footer artifacts",
    reviewerScore: 4.5,
    notes: "Tests header/footer removal in IntakeNormalizer",
    messages: [
      {
        content: `John Doe                                                                 Page 1 of 2
johndoe@gmail.com | (555) 123-4567 | San Jose, CA                        John Doe

EXPERIENCE
Software Engineer at Meta (2021-Present)                                 Page 1 of 2
Worked on the News Feed ranking algorithm. Improved relevance scores by 12%.

Software Engineer at Pinterest (2018-2021)
Developed recommendation systems in Python.

EDUCATION
B.S. Computer Science, UC San Diego – 2018                               John Doe

SKILLS
Python, C++, machine learning, TensorFlow, Spark, Hive, SQL, Hadoop`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-002",
    category: "pdf",
    persona: "Two-column PDF — merged columns",
    reviewerScore: 4.2,
    notes: "Test resilience to multi-column merge artifacts",
    messages: [
      {
        content: `Sarah Johnson                                            SKILLS
sarah@gmail.com                                          JavaScript
Austin, TX                                               React
                                                         Node.js
EXPERIENCE                                               TypeScript
Senior Developer, Accenture (2020–Present)              AWS
Led digital transformation projects                      Docker
for Fortune 500 clients.
                                                         EDUCATION
Junior Developer, Deloitte (2017–2020)                  B.S. Information Systems
Built enterprise web applications.                       UT Austin, 2017`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-003",
    category: "pdf",
    persona: "PDF with broken hyphenated words",
    reviewerScore: 4.3,
    messages: [
      {
        content: `Marcus Robinson | marcus.robinson@gmail.com | Chicago, IL

Senior Back-
end Engineer – 7 years experience

EXPERIENCE
Lead Engineer, Groupon (2019–Present)
Re-architectured the deal recom-
mendation engine, improving click-through rates by 28%.
Manages high-per-
formance systems handling 500K concurrent users.

EDUCATION
B.S. Computer En-
gineering, UIUC, 2016

SKILLS: Java, Python, Kafka, Cassandra, AWS, Spring Boot`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-004",
    category: "pdf",
    persona: "PDF — non-US phone format (India)",
    reviewerScore: 4.5,
    messages: [
      {
        content: `Vikram Sharma
vikram.sharma@gmail.com | +91 98765 43210
Bengaluru, Karnataka, India

PROFESSIONAL EXPERIENCE
Lead Backend Engineer, Swiggy (2021–Present)
Designed order management system processing 5M daily orders.
Improved checkout latency by 40% through async processing.

Senior Engineer, Ola (2018–2021)
Trip allocation algorithms for ride matching.

EDUCATION
B.Tech Computer Science and Engineering
Indian Institute of Technology, Roorkee – 2018

TECHNICAL SKILLS
Java, Spring Boot, Python, Kafka, DynamoDB, Redis, AWS, Docker, Kubernetes`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-005",
    category: "pdf",
    persona: "PDF — financial professional",
    reviewerScore: 4.6,
    messages: [
      {
        content: `Jennifer Wu
jennifer.wu@gmail.com | (646) 555-7890 | New York, NY

EXPERIENCE
Quantitative Engineer, Jane Street Capital (2020–Present)
Built low-latency trading systems processing $10B in daily volume.
Reduced order execution latency from 50μs to 8μs.

Software Engineer, Two Sigma (2017–2020)
Real-time risk management systems in C++ and Python.

EDUCATION
B.S. Mathematics and Computer Science, MIT – 2017

SKILLS
C++, Python, OCaml, FPGA, low-latency systems, Linux kernel, financial data APIs`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-006",
    category: "pdf",
    persona: "PDF — healthcare IT specialist",
    reviewerScore: 4.4,
    messages: [
      {
        content: `Robert Chen | robert.chen@gmail.com | Boston, MA

Healthcare IT Engineer, Mass General Hospital (2019–Present)
Built EHR integration middleware using HL7/FHIR standards.
Onboarded 12 clinical departments to the unified platform.

Software Engineer, Epic Systems (2016–2019)
Developed features for Epic's inpatient workflow module.

Education
B.S. Computer Science, Northeastern University – 2016
HL7 FHIR Certification, 2021

Skills
Java, Python, HL7, FHIR, SQL, Azure, Epic, healthcare interoperability, REST APIs`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-007",
    category: "pdf",
    persona: "PDF — blockchain/Web3 developer",
    reviewerScore: 4.4,
    messages: [
      {
        content: `Alex Rivera
alex.rivera@protonmail.com | Remote | https://github.com/alexrivera

Web3 / Smart Contract Developer (2021–Present) – Freelance
Deployed 8 production smart contracts on Ethereum and Solana.
Built DeFi protocol with $15M TVL at peak.

Software Engineer, Coinbase (2019–2021)
Exchange infrastructure and crypto custody systems.

Education
B.S. Computer Science, University of Southern California, 2019

Skills
Solidity, Rust, TypeScript, Ethereum, Solana, Hardhat, Web3.js, React, Node.js, AWS`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-008",
    category: "pdf",
    persona: "PDF — game developer",
    reviewerScore: 4.4,
    messages: [
      {
        content: `Tom Bradley
tom.bradley@gmail.com | (503) 555-2345 | Portland, OR

Senior Game Engineer, Bungie (2020–Present)
Shipped Destiny 2: Lightfall expansion (10M+ players).
Optimized rendering pipeline; improved frame rate by 25% on last-gen consoles.

Game Developer, Electronic Arts (2017–2020)
Gameplay programming for FIFA and Madden franchises.

Education
B.S. Computer Science, Oregon State University – 2017

Skills
C++, Unreal Engine, Unity, HLSL, GLSL, rendering, physics simulation, C#, Git`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-009",
    category: "pdf",
    persona: "PDF — enterprise Java architect, long career",
    reviewerScore: 4.6,
    messages: [
      {
        content: `Sandra Torres
s.torres@gmail.com | (312) 555-0987 | Chicago, IL

Chief Architect, Allstate Insurance (2018–Present)
Designed microservices migration from monolith; 200+ services now on Kubernetes.
Saved $6M annually in licensing costs through open-source adoption.
Team of 12 architects across 3 business domains.

Principal Architect, Morningstar (2014–2018)
Data platform architecture for financial analytics serving 200K users.

Senior Architect, Accenture (2010–2014)

Education
M.S. Software Engineering, Illinois Institute of Technology – 2010
B.S. Computer Science, University of Illinois at Chicago – 2007

Skills
Java, Spring, Kubernetes, Kafka, AWS, Terraform, architecture patterns, microservices, team leadership`,
        isUser: true,
      },
    ],
  },
];

// ===========================================================================
// SECTION F: CHAT — International Engineers (15 cases) [D1 expansion]
// ===========================================================================

const chatInternational: GoldCase[] = [
  {
    id: "chat-intl-001",
    category: "chat",
    persona: "International — Nigerian full-stack, Lagos",
    reviewerScore: 4.5,
    messages: [
      {
        content:
          "Hi, I'm Chukwuemeka Obi, chukwuemeka.obi@gmail.com, Lagos Nigeria",
        isUser: true,
      },
      { content: "Tell me about your experience.", isUser: false },
      {
        content:
          "I am a Senior Full-Stack Engineer at Paystack for 3 years. I build payment integrations used by 100,000+ businesses across Africa. Our platform processes ₦2B daily.",
        isUser: true,
      },
      { content: "Previous roles?", isUser: false },
      {
        content:
          "Before Paystack I was at Andela as a software engineer for 2 years, working with US startups remotely.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content: "B.Sc. Computer Science, University of Lagos, 2018",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "TypeScript, React, Node.js, Python, PostgreSQL, Redis, AWS, Stripe API, Paystack API",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-intl-002",
    category: "chat",
    persona: "International — Australian backend engineer, Sydney",
    reviewerScore: 4.6,
    messages: [
      {
        content:
          "G'day, I'm James O'Sullivan, james.osullivan@gmail.com, Sydney Australia",
        isUser: true,
      },
      { content: "What's your background?", isUser: false },
      {
        content:
          "I work at Atlassian as a Senior Backend Engineer for 4 years. I own the data pipeline for Jira reporting that serves 10M+ users.",
        isUser: true,
      },
      { content: "Previously?", isUser: false },
      {
        content:
          "Before Atlassian I was at Canva for 2 years building their image processing microservices.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "B.Engineering (Software), University of New South Wales, 2016",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Java, Python, Kotlin, Kafka, PostgreSQL, AWS, DynamoDB, Kubernetes, gRPC",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-intl-003",
    category: "chat",
    persona: "International — Canadian fintech engineer, Toronto",
    reviewerScore: 4.6,
    messages: [
      {
        content:
          "Hi, Isabelle Tremblay here, isabelle.tremblay@gmail.com, Toronto Canada",
        isUser: true,
      },
      { content: "What do you work on?", isUser: false },
      {
        content:
          "I'm a Software Engineer at Shopify for 3 years. I build payment fraud detection systems that saved $15M CAD in fraudulent transactions last year.",
        isUser: true,
      },
      { content: "Prior experience?", isUser: false },
      {
        content:
          "I interned at RBC (Royal Bank of Canada) for 2 summers then joined Shopify full-time after graduating.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content: "B.Sc. Computer Science, University of Waterloo, 2021",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Ruby, Go, Python, PostgreSQL, Redis, Kafka, AWS, machine learning, fraud detection",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-intl-004",
    category: "chat",
    persona: "International — Singaporean cloud engineer",
    reviewerScore: 4.5,
    messages: [
      {
        content:
          "My name is Wei Ling Tan, wltan@gmail.com, +65 9123 4567, Singapore",
        isUser: true,
      },
      { content: "Tell me about your role.", isUser: false },
      {
        content:
          "I am a Cloud Engineer at GovTech Singapore for 4 years. I architect cloud infrastructure for government digital services used by 5.5M citizens.",
        isUser: true,
      },
      { content: "Previous experience?", isUser: false },
      {
        content:
          "Before GovTech I was at Grab as a DevOps engineer for 2 years.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "B.Eng. Computer Science, National University of Singapore, 2018",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "AWS, Azure, Terraform, Kubernetes, Python, Go, CI/CD, security compliance, IAM",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-intl-005",
    category: "chat",
    persona: "International — Mexican fintech developer",
    reviewerScore: 4.4,
    messages: [
      {
        content:
          "Hola, soy Diego Hernández, diego.hernandez@gmail.com, Mexico City",
        isUser: true,
      },
      { content: "Tell me about your work.", isUser: false },
      {
        content:
          "I work at Konfio, a fintech company in Mexico, as a senior software engineer for 3 years. I build the credit scoring platform for SME loans.",
        isUser: true,
      },
      { content: "Previous experience?", isUser: false },
      {
        content:
          "Before Konfio I was at OXXO Pay for 2 years working on digital payment systems.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "Ingeniería en Sistemas Computacionales, ITESM (Tecnológico de Monterrey), 2019",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Python, Django, PostgreSQL, Redis, AWS, machine learning, scikit-learn, Docker",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-intl-006",
    category: "chat",
    persona: "International — Ukrainian engineer relocated to Poland",
    reviewerScore: 4.4,
    notes: "Relocation context, current location different from education",
    messages: [
      {
        content:
          "My name is Oleksandr Kovalenko, oleksandr.k@gmail.com, currently in Warsaw Poland",
        isUser: true,
      },
      { content: "What's your background?", isUser: false },
      {
        content:
          "I was a backend engineer at EPAM Systems in Kyiv for 5 years, then relocated to Warsaw in 2022. I now work remotely for a UK startup.",
        isUser: true,
      },
      { content: "What kind of work?", isUser: false },
      {
        content:
          "I build B2B SaaS platforms in Node.js and TypeScript. Most recently I improved API response times by 60% for a logistics client.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "M.Sc. Computer Science, Taras Shevchenko National University of Kyiv, 2017",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Node.js, TypeScript, NestJS, PostgreSQL, MongoDB, Docker, AWS, REST APIs",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-intl-007",
    category: "chat",
    persona: "International — Spanish mobile engineer, Barcelona",
    reviewerScore: 4.5,
    messages: [
      {
        content:
          "Hi, I'm Alejandro García, alejandro.garcia@gmail.com, Barcelona Spain",
        isUser: true,
      },
      { content: "What do you do?", isUser: false },
      {
        content:
          "I'm an iOS engineer at Glovo for 3 years. I built the real-time order tracking feature used by 20M users across 25 countries.",
        isUser: true,
      },
      { content: "Before Glovo?", isUser: false },
      {
        content:
          "2 years at King (Candy Crush) building mobile games in Swift.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "Grado en Ingeniería Informática, Universitat Politècnica de Catalunya (UPC), 2019",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Swift, SwiftUI, UIKit, Combine, Core Location, Firebase, Xcode, Fastlane, Git",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-intl-008",
    category: "chat",
    persona: "International — Indonesian data engineer, Jakarta",
    reviewerScore: 4.4,
    messages: [
      {
        content:
          "Hi, my name is Budi Santoso, budi.santoso@gmail.com, Jakarta Indonesia, +62 812 3456 7890",
        isUser: true,
      },
      { content: "Tell me about your experience.", isUser: false },
      {
        content:
          "I work at Gojek as a data engineer for 4 years. I built the data pipeline infrastructure that processes 50M ride events per day.",
        isUser: true,
      },
      { content: "Previous experience?", isUser: false },
      {
        content: "I was a junior data engineer at Tokopedia for 2 years.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "S.T. Teknik Informatika, Institut Teknologi Bandung (ITB), 2018",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Python, Spark, Kafka, Airflow, BigQuery, PostgreSQL, dbt, Terraform, GCP",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-intl-009",
    category: "chat",
    persona: "International — Egyptian software engineer, Cairo",
    reviewerScore: 4.3,
    messages: [
      {
        content:
          "My name is Ahmed Mostafa, ahmed.mostafa92@gmail.com, Cairo Egypt",
        isUser: true,
      },
      { content: "What's your work experience?", isUser: false },
      {
        content:
          "I work at Instabug as a senior software engineer for 3 years. I built the crash reporting SDK now installed in 25,000+ apps worldwide.",
        isUser: true,
      },
      { content: "Before that?", isUser: false },
      {
        content:
          "I was at Valeo (automotive tech) for 2 years as a C++ developer.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "B.Sc. Computer and Systems Engineering, Ain Shams University, 2017",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Swift, Objective-C, C++, Python, Ruby, SDKs, iOS, crash reporting, analytics",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-intl-010",
    category: "chat",
    persona: "International — Turkish ML researcher, Ankara",
    reviewerScore: 4.5,
    messages: [
      {
        content:
          "Hi, I am Mehmet Yilmaz, m.yilmaz@gmail.com, currently in Ankara Turkey",
        isUser: true,
      },
      { content: "What's your background?", isUser: false },
      {
        content:
          "I'm a research engineer at ASELSAN (defense tech company) working on computer vision systems for 5 years. I developed object detection models deployed on military drones.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "M.Sc. Computer Engineering, METU (Middle East Technical University), 2020. B.Sc. EE, Boğaziçi University, 2018.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Python, PyTorch, OpenCV, YOLO, TensorRT, CUDA, C++, ROS, embedded systems",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-intl-011",
    category: "chat",
    persona: "International — Polish backend engineer, Kraków",
    reviewerScore: 4.4,
    messages: [
      {
        content:
          "Hi, my name is Jakub Wiśniewski, jakub.wisniewski@gmail.com, Kraków Poland",
        isUser: true,
      },
      { content: "What do you do?", isUser: false },
      {
        content:
          "I work at Allegro (largest Polish e-commerce) as a senior backend engineer for 4 years. I built the recommendation engine serving 20M users.",
        isUser: true,
      },
      { content: "Before Allegro?", isUser: false },
      {
        content: "2 years at Comarch as a Java developer building ERP systems.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "Master of Science in Computer Science, AGH University of Science and Technology, 2018",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Java, Kotlin, Spring Boot, Kafka, Elasticsearch, MongoDB, AWS, Kubernetes",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-intl-012",
    category: "chat",
    persona: "International — Argentine systems engineer, Buenos Aires",
    reviewerScore: 4.3,
    messages: [
      {
        content:
          "Hola, me llamo Martín Pérez, martin.perez@gmail.com, Buenos Aires Argentina",
        isUser: true,
      },
      { content: "Tell me about your experience.", isUser: false },
      {
        content:
          "I am a Systems Engineer at Mercado Libre for 5 years. I work on the logistics checkout flow handling 3M orders per day.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "Ingeniería en Sistemas de Información, UTN (Universidad Tecnológica Nacional), 2018",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Java, Python, Go, MySQL, Redis, Kubernetes, AWS, distributed systems",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-intl-013",
    category: "chat",
    persona: "International — Sri Lankan embedded systems engineer",
    reviewerScore: 4.3,
    messages: [
      {
        content:
          "My name is Thilina Rajapaksha, thilina.r@gmail.com, Colombo Sri Lanka",
        isUser: true,
      },
      { content: "What's your work?", isUser: false },
      {
        content:
          "I am an Embedded Systems Engineer at WSO2 for 4 years. I build IoT platform firmware for industrial automation clients.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "B.Sc. Electronic and Telecommunications Engineering, University of Moratuwa, 2019",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "C, C++, FreeRTOS, MQTT, Python, Raspberry Pi, ARM Cortex, AWS IoT, Docker",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-intl-014",
    category: "chat",
    persona: "International — Iranian software engineer in Germany (diaspora)",
    reviewerScore: 4.4,
    messages: [
      {
        content:
          "Hi, I am Amir Hosseini, amir.hosseini@gmail.com, Munich Germany",
        isUser: true,
      },
      { content: "Tell me about jobs.", isUser: false },
      {
        content:
          "I am a software engineer at BMW Group for 3 years. I build connected car APIs for BMW's CarData platform, handling 8M connected vehicles.",
        isUser: true,
      },
      { content: "Before BMW?", isUser: false },
      {
        content:
          "I was a backend developer at Digikala (Iran's largest e-commerce) for 2 years before relocating.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "M.Sc. Computer Engineering, Technical University of Munich (TUM), 2020",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Python, Go, FastAPI, PostgreSQL, Kafka, AWS, Docker, Kubernetes, automotive protocols",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-intl-015",
    category: "chat",
    persona: "International — Kenyan product engineer, Nairobi",
    reviewerScore: 4.4,
    messages: [
      {
        content:
          "Hello, I am Grace Wanjiru, grace.wanjiru@gmail.com, Nairobi Kenya",
        isUser: true,
      },
      { content: "What do you work on?", isUser: false },
      {
        content:
          "I'm a Software Engineer at Safaricom for 3 years working on M-PESA, the mobile payments platform with 30M users.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content: "B.Sc. Computer Science, University of Nairobi, 2020",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Java, Spring Boot, Python, PostgreSQL, Redis, RabbitMQ, Docker, mobile payments APIs",
        isUser: true,
      },
    ],
  },
];

// ===========================================================================
// SECTION G: CHAT — Employment Gaps & Freelancers (15 cases) [D1 expansion]
// ===========================================================================

const chatGapsFreelancers: GoldCase[] = [
  {
    id: "chat-gap-001",
    category: "chat",
    persona: "Employment gap — parental leave, returning engineer",
    reviewerScore: 4.3,
    notes: "Gap explanation: parental leave 2022-2023",
    messages: [
      {
        content: "Hi, I'm Jennifer Walsh, jennifer.walsh@gmail.com, Austin TX",
        isUser: true,
      },
      { content: "Tell me about your background.", isUser: false },
      {
        content:
          "I took a career break from 2022 to 2023 for parental leave and am returning to software engineering now. Before that I was a senior engineer at Dell for 4 years.",
        isUser: true,
      },
      { content: "What did you do at Dell?", isUser: false },
      {
        content:
          "I built internal developer tooling and CI/CD pipelines. Reduced build times by 50% for 200+ engineering teams.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content: "B.S. Computer Science, University of Texas at Austin, 2016",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content: "Python, Jenkins, Kubernetes, AWS, Terraform, CI/CD, Bash, Go",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-gap-002",
    category: "chat",
    persona: "Employment gap — illness recovery, 8-month gap",
    reviewerScore: 4.2,
    notes: "Short gap, recent return to work",
    messages: [
      {
        content: "I'm Daniel Park, daniel.park@gmail.com, I'm based in Chicago",
        isUser: true,
      },
      { content: "Tell me about your career.", isUser: false },
      {
        content:
          "I was a front end developer at Morningstar for 3 years and then had a medical leave from Jan to Aug 2024. I'm now contracting independently.",
        isUser: true,
      },
      { content: "What did you do at Morningstar?", isUser: false },
      {
        content:
          "Built financial data visualization components in React and D3.js used by 200K professional investors.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content: "B.S. Information Systems, DePaul University, 2020",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "React, TypeScript, D3.js, Highcharts, AG Grid, CSS, accessibility, REST APIs",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-gap-003",
    category: "chat",
    persona: "Employment gap — sabbatical for startup that failed",
    reviewerScore: 4.2,
    notes: "Gap context: co-founded a startup 2021-2023, shutting down",
    messages: [
      {
        content: "My name is Kevin Rodriguez, kevin.r@gmail.com, San Jose CA",
        isUser: true,
      },
      { content: "Tell me about your work history.", isUser: false },
      {
        content:
          "I was a software engineer at Salesforce for 2 years, then co-founded a B2B SaaS startup (inventory management) from 2021-2023. We raised $500K but didn't reach product-market fit, so I'm back to looking for roles.",
        isUser: true,
      },
      { content: "What did you build?", isUser: false },
      {
        content:
          "At Salesforce I built Lightning components. At the startup I was the sole engineer — built the full product from scratch with React, Node, and AWS.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content: "B.S. Computer Science, San Jose State University, 2017",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "React, Node.js, TypeScript, PostgreSQL, AWS, Salesforce Lightning, Apex",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-gap-004",
    category: "chat",
    persona: "Freelancer — multiple short-term contracts",
    reviewerScore: 4.3,
    messages: [
      {
        content:
          "Hey, I'm Nia Johnson, nia.johnson@gmail.com, freelance software developer based in Atlanta GA",
        isUser: true,
      },
      { content: "Tell me about your freelance work.", isUser: false },
      {
        content:
          "I have been freelancing for 4 years. I've built React web apps for 15+ clients including a healthcare portal (3,000 daily users), a real estate listings platform, and an e-commerce site.",
        isUser: true,
      },
      { content: "Any company experience?", isUser: false },
      {
        content:
          "Yes, before freelancing I was a junior developer at Cox Enterprises for 2 years.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content: "B.S. Computer Science, Georgia State University, 2019",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "React, Next.js, TypeScript, Node.js, GraphQL, PostgreSQL, Tailwind, Firebase",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-gap-005",
    category: "chat",
    persona: "Freelancer — open source contributor with no corporate history",
    reviewerScore: 4.0,
    messages: [
      {
        content: "My name is Sam Peterson, sam.peterson@protonmail.com",
        isUser: true,
      },
      { content: "What's your work experience?", isUser: false },
      {
        content:
          "I haven't worked in a standard job — I've been a freelance developer for 5 years and an active open source contributor. I'm a top 10 contributor to a popular state management library with 40K GitHub stars.",
        isUser: true,
      },
      { content: "What freelance projects?", isUser: false },
      {
        content:
          "I've built custom tooling for 3 medium-sized companies. Most recently a CLI tool for a DevOps firm and a custom CMS for a media company.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "Self-taught. Completed CS50 and full-stack courses on Udemy. No degree.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content: "TypeScript, React, Vue.js, Node.js, Rust, open source, Git",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-gap-006",
    category: "chat",
    persona: "Freelancer — contract DevOps consultant, global clients",
    reviewerScore: 4.4,
    messages: [
      {
        content:
          "Hi I'm Marco Visconti, marco.visconti@gmail.com, Milan Italy, I work as an independent DevOps consultant",
        isUser: true,
      },
      { content: "Tell me about your consulting.", isUser: false },
      {
        content:
          "I have been an independent contractor for 6 years, specializing in cloud migrations to AWS and GCP. I've completed 30+ engagements for clients in Europe and the US.",
        isUser: true,
      },
      { content: "Previous employment?", isUser: false },
      {
        content:
          "I was a systems administrator at Telecom Italia for 3 years before going independent.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "Laurea Magistrale (M.Sc.) in Computer Engineering, Politecnico di Milano, 2015",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "AWS, GCP, Terraform, Ansible, Kubernetes, Docker, Python, Bash, CI/CD, FinOps",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-gap-007",
    category: "chat",
    persona: "Employment gap — relocation gap, international move",
    reviewerScore: 4.3,
    messages: [
      {
        content:
          "Hi, I'm Rania Khalil, rania.khalil@gmail.com, I moved from Dubai to San Francisco a year ago",
        isUser: true,
      },
      { content: "Tell me about your history.", isUser: false },
      {
        content:
          "I was a senior data scientist at Emirates NBD bank for 5 years, then spent 6 months relocating and getting settled in the US. I'm now actively looking for roles.",
        isUser: true,
      },
      { content: "What did you work on at Emirates NBD?", isUser: false },
      {
        content:
          "Credit risk modeling, fraud detection ML models, and customer churn prediction. Our fraud model reduced losses by AED 45M annually.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "M.Sc. Data Science, Heriot-Watt University Dubai, 2018. B.Sc. Statistics, Lebanese American University, 2016.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Python, R, scikit-learn, XGBoost, TensorFlow, SQL, Tableau, SAS, Azure, banking domain",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-gap-008",
    category: "chat",
    persona: "Military veteran transitioning to software engineering",
    reviewerScore: 4.3,
    messages: [
      {
        content:
          "Hi, I'm Marcus Williams, marcus.f.williams@gmail.com, Colorado Springs CO",
        isUser: true,
      },
      { content: "Tell me about yourself.", isUser: false },
      {
        content:
          "I served 6 years in the US Army as a signals intelligence analyst, then transitioned to software engineering through a 12-week bootcamp. I've been a software developer at Lockheed Martin for 1 year.",
        isUser: true,
      },
      { content: "What do you work on at Lockheed?", isUser: false },
      {
        content:
          "I build simulation software for defense systems in C++ and Python. Most recently I improved simulation render speed by 35%.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "B.S. Cybersecurity, Colorado Technical University, 2023 (completed while in service). Full Stack Bootcamp, Galvanize, 2022.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "C++, Python, simulation, cybersecurity, Linux, networking, team leadership",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-gap-009",
    category: "chat",
    persona: "Long gap — caretaker returning to tech after 3 years",
    reviewerScore: 4.0,
    notes: "3-year caregiving gap 2020-2023, maintaining skills during gap",
    messages: [
      {
        content:
          "Hi, my name is Patricia Chen, patricia.chen@gmail.com, Boston MA",
        isUser: true,
      },
      { content: "Tell me about your career.", isUser: false },
      {
        content:
          "I took 3 years off (2020-2023) to care for an ill family member. Before that I was a data engineer at Fidelity Investments for 4 years. During my gap I did freelance data projects and kept my skills current with online courses.",
        isUser: true,
      },
      { content: "What did you do at Fidelity?", isUser: false },
      {
        content:
          "I built ETL pipelines for portfolio analytics ingesting 10TB of market data daily. Reduced data processing latency by 40%.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content: "B.S. Computer Science, Northeastern University, 2016",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Python, Spark, SQL, Airflow, AWS Glue, S3, Redshift, dbt, Snowflake",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-gap-010",
    category: "chat",
    persona: "Freelancer — data science contractor, multiple industries",
    reviewerScore: 4.3,
    messages: [
      {
        content:
          "My name is Shreya Mehta, shreya.mehta@gmail.com, freelance data scientist in San Francisco",
        isUser: true,
      },
      { content: "Tell me about your freelance work.", isUser: false },
      {
        content:
          "I've been contracting for 5 years. I build recommendation systems, predictive models, and data pipelines. Notable projects: a churn model for a $500M e-commerce firm (25% reduction), demand forecasting for a grocery chain.",
        isUser: true,
      },
      { content: "Prior company experience?", isUser: false },
      {
        content:
          "I did 2 years at Lyft as a data scientist before going independent.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content: "M.S. Statistics, Stanford University, 2017",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Python, R, SQL, PyTorch, scikit-learn, Spark, MLflow, Databricks, GCP, A/B testing",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-gap-011",
    category: "chat",
    persona: "Career gap — graduate school pause, now industry",
    reviewerScore: 4.4,
    messages: [
      {
        content:
          "Hi, I'm Brian O'Connor, brian.oconnor@gmail.com, Cambridge MA",
        isUser: true,
      },
      { content: "What's your background?", isUser: false },
      {
        content:
          "I worked at Google for 3 years as a software engineer, then paused to pursue a PhD in computer science. I left after completing my Masters (2 years) and am now returning to industry.",
        isUser: true,
      },
      { content: "What did you research?", isUser: false },
      {
        content:
          "Distributed systems — specifically fault tolerance in consensus protocols. Published 2 papers.",
        isUser: true,
      },
      { content: "What did you do at Google?", isUser: false },
      {
        content:
          "I worked on the Google Cloud Spanner team writing Go and C++ for the distributed transaction layer.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "M.S. Computer Science (ABD PhD), MIT, 2024. B.S. CS, Harvard, 2018.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Go, C++, distributed systems, consensus algorithms, Raft, Paxos, database internals",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-gap-012",
    category: "chat",
    persona: "Freelancer — design-to-dev full-stack, boutique clients",
    reviewerScore: 4.2,
    messages: [
      {
        content:
          "Hey, I'm Zoe Mitchell, zoe.mitchell@gmail.com, Portland Oregon",
        isUser: true,
      },
      { content: "Tell me about your work.", isUser: false },
      {
        content:
          "I've been freelancing for 3 years doing full-stack web projects for small businesses and nonprofits. About 25 completed projects — everything from design to deployment.",
        isUser: true,
      },
      { content: "No full-time roles?", isUser: false },
      {
        content:
          "I had one full-time role at an agency for 2 years before going independent. Now I want to transition back to a product company.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "B.F.A. Interactive Media, Pacific Northwest College of Art, 2019",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "React, Next.js, Tailwind CSS, Figma, Node.js, Stripe, PostgreSQL, Vercel, Shopify",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-gap-013",
    category: "chat",
    persona: "Employment gap — layoff, 4-month gap, upskilling",
    reviewerScore: 4.2,
    messages: [
      {
        content:
          "Hi, name is Tyler Morrison, tylermorrison@gmail.com, Seattle WA",
        isUser: true,
      },
      { content: "Tell me about your history.", isUser: false },
      {
        content:
          "I was laid off from Twitter in late 2022 during the mass layoffs. I took 4 months to upskill in Go and ML before landing a role at a smaller startup, which I'm leaving now for a senior position.",
        isUser: true,
      },
      { content: "What did you do at Twitter?", isUser: false },
      {
        content:
          "I was a backend engineer on the recommendations team for 3 years. I built the user segmentation service used to personalize timelines for 200M daily users.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content: "B.S. Computer Science, University of Washington, 2019",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Scala, Go, Python, Kafka, Hadoop, Spark, Redis, ML pipelines, Kubernetes, AWS",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-gap-014",
    category: "chat",
    persona: "Freelancer — Android developer, app portfolio",
    reviewerScore: 4.3,
    messages: [
      {
        content:
          "I'm Emmanuel Adeyemi, emma.adeyemi@gmail.com, London UK, freelance Android developer",
        isUser: true,
      },
      { content: "Tell me about your apps.", isUser: false },
      {
        content:
          "I've published 8 Android apps to the Play Store with 500K+ combined downloads. I also contract for UK fintech startups building Kotlin apps.",
        isUser: true,
      },
      { content: "Any company experience?", isUser: false },
      {
        content:
          "I was a junior Android developer at Lloyds Banking Group for 2 years before going independent.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content: "B.Sc. Computer Science, University of Hertfordshire, 2019",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Kotlin, Java, Android SDK, Jetpack Compose, Retrofit, Room, Firebase, Google Play",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-gap-015",
    category: "chat",
    persona: "Gap — visa/work authorization delay after immigration",
    reviewerScore: 4.1,
    notes: "Immigration-related gap, strong overseas experience",
    messages: [
      {
        content:
          "My name is Yuki Tanaka, yuki.tanaka@gmail.com, currently in San Francisco CA",
        isUser: true,
      },
      { content: "Tell me about your work history.", isUser: false },
      {
        content:
          "I worked at Sony in Tokyo as a senior software engineer for 5 years, then immigrated to the US in 2023. I had a 10-month gap waiting for my work authorization, and I have been employed since January 2024.",
        isUser: true,
      },
      { content: "Current role?", isUser: false },
      {
        content:
          "I joined Nvidia as a software engineer. I'm building GPU driver tooling using C++ and Python.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "M.S. Information Science, University of Tokyo, 2017. B.S. Mathematics, Kyoto University, 2015.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "C++, Python, CUDA, GPU architecture, Linux driver development, Rust, embedded systems",
        isUser: true,
      },
    ],
  },
];

// ===========================================================================
// SECTION H: CHAT — Non-Tech Professionals (15 cases) [D1 expansion]
// ===========================================================================

const chatNonTech: GoldCase[] = [
  {
    id: "chat-nt-001",
    category: "chat",
    persona: "Non-tech — lawyer pivoting to legal tech PM",
    reviewerScore: 4.3,
    messages: [
      {
        content:
          "Hi, I am Claire Davidson, claire.davidson@gmail.com, Washington DC",
        isUser: true,
      },
      { content: "Tell me about your background.", isUser: false },
      {
        content:
          "I was a corporate attorney at Kirkland & Ellis for 6 years, specializing in M&A. I'm pivoting to legal technology product management after leading an internal digital transformation project.",
        isUser: true,
      },
      { content: "Tell me about the tech project.", isUser: false },
      {
        content:
          "I led adoption of AI contract review tools for our 500-attorney firm, reducing review time by 40%. I worked closely with the vendor on feature requirements.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "J.D., Georgetown University Law Center, 2017. B.A. Political Science, Duke University, 2014.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Legal research, contract negotiation, product requirements, Agile, stakeholder management, AI tools",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-nt-002",
    category: "chat",
    persona: "Non-tech — nurse pivoting to health informatics",
    reviewerScore: 4.2,
    messages: [
      {
        content:
          "My name is Alicia Romero, alicia.romero@gmail.com, Houston TX",
        isUser: true,
      },
      { content: "What's your work experience?", isUser: false },
      {
        content:
          "I have been an ICU nurse at Houston Methodist for 7 years. I recently led our unit's transition to a new EHR system and trained 50 staff members on it.",
        isUser: true,
      },
      { content: "How are you transitioning?", isUser: false },
      {
        content:
          "I completed a Health Informatics certification and a SQL bootcamp. I want to work as a clinical data analyst or in health tech product.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "B.S.N. Nursing, Texas A&M University, 2016. Health Informatics Certificate, AMIA, 2024.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Epic EHR, SQL, clinical workflows, patient data, HL7, FHIR, data analysis, training",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-nt-003",
    category: "chat",
    persona: "Non-tech — supply chain manager moving to operations tech",
    reviewerScore: 4.2,
    messages: [
      {
        content: "Hi, I'm James Okonkwo, james.okonkwo@gmail.com, Dallas TX",
        isUser: true,
      },
      { content: "What do you do?", isUser: false },
      {
        content:
          "I've been a senior supply chain manager at FedEx for 8 years. I optimize last-mile delivery routing which has reduced fuel costs by $2M annually. I'm now targeting supply chain tech companies.",
        isUser: true,
      },
      { content: "Any tech skills?", isUser: false },
      {
        content:
          "I use Python for route optimization scripts and SQL for reporting. I have an MBA with a tech concentration.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "MBA, operations & technology, SMU Cox School of Business, 2019. B.S. Industrial Engineering, UT Dallas, 2015.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Supply chain optimization, SQL, Python, Tableau, SAP, logistics operations, route planning",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-nt-004",
    category: "chat",
    persona: "Non-tech — financial analyst moving to fintech",
    reviewerScore: 4.3,
    messages: [
      {
        content:
          "I'm Sophia Moreau, sophia.moreau@gmail.com, currently in New York",
        isUser: true,
      },
      { content: "Tell me about your career.", isUser: false },
      {
        content:
          "I have been a quantitative analyst at J.P. Morgan for 5 years, building pricing models for derivatives. I want to move to a fintech company doing product or data roles.",
        isUser: true,
      },
      { content: "What tech do you use?", isUser: false },
      {
        content:
          "Python (pandas, numpy, scipy), SQL, R, Bloomberg Terminal, Excel VBA. I'm learning machine learning.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "M.S. Financial Engineering, Columbia University, 2018. B.S. Applied Mathematics, NYU, 2016.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Python, R, SQL, financial modeling, derivatives pricing, risk management, Bloomberg, Excel",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-nt-005",
    category: "chat",
    persona: "Non-tech — science teacher becoming instructional designer",
    reviewerScore: 4.1,
    messages: [
      {
        content:
          "Hi, I'm Andrew Foster, andrew.foster@gmail.com, Minneapolis MN",
        isUser: true,
      },
      { content: "What's your background?", isUser: false },
      {
        content:
          "I was a high school biology teacher for 8 years. I've been doing curriculum design and now want to move into instructional design for edtech companies.",
        isUser: true,
      },
      { content: "Any edtech experience?", isUser: false },
      {
        content:
          "I built an online learning module for my district used by 3,000 students and piloted a flipped classroom program at my school.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "M.Ed. Curriculum and Instruction, University of Minnesota, 2020. B.S. Biology, Carleton College, 2015.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Instructional design, Canvas LMS, Articulate Storyline, curriculum development, assessment design, Google Workspace",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-nt-006",
    category: "chat",
    persona: "Non-tech — marketing director pivoting to martech",
    reviewerScore: 4.3,
    messages: [
      {
        content: "Hi, I'm Lauren Kim, lauren.kim@gmail.com, San Francisco CA",
        isUser: true,
      },
      { content: "What's your experience?", isUser: false },
      {
        content:
          "I've been Director of Digital Marketing at Levi's for 5 years, managing a $10M annual budget and a team of 8. I drove 35% revenue growth through digital campaigns.",
        isUser: true,
      },
      { content: "Why tech roles?", isUser: false },
      {
        content:
          "I've become the in-house expert on our martech stack — HubSpot, Salesforce, Segment, and Amplitude. I want to move to a martech product or solutions engineer role.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "MBA, Marketing & Analytics, UC Berkeley Haas, 2018. B.A. Communications, UCLA, 2015.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "HubSpot, Salesforce, Segment, Amplitude, SQL, Python basics, digital marketing, analytics",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-nt-007",
    category: "chat",
    persona: "Non-tech — civil engineer pivoting to geospatial/GIS tech",
    reviewerScore: 4.2,
    messages: [
      {
        content: "Hello, I'm Sam Oduya, sam.oduya@gmail.com, Phoenix AZ",
        isUser: true,
      },
      { content: "Tell me about your career.", isUser: false },
      {
        content:
          "I'm a licensed civil engineer with 7 years at AECOM. I specialize in transportation infrastructure. Recently I've been heavily using GIS tools and Python for spatial analysis.",
        isUser: true,
      },
      { content: "What tech work have you done?", isUser: false },
      {
        content:
          "I built a Python tool to automate traffic volume analysis that saves our team 40 hours/month. I want to move into GIS software or geospatial data engineering.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "M.S. Civil Engineering (Transportation), Arizona State University, 2018. B.Sc. Civil Engineering, University of Lagos, 2015.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Python, ArcGIS, QGIS, PostGIS, SQL, AutoCAD, GeoPandas, spatial analysis, GeoJSON",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-nt-008",
    category: "chat",
    persona: "Non-tech — journalist transitioning to data journalism/analyst",
    reviewerScore: 4.1,
    messages: [
      {
        content: "Hi, I'm Nadia Williams, nadia.williams@gmail.com, New York",
        isUser: true,
      },
      { content: "What do you do now?", isUser: false },
      {
        content:
          "I'm a Senior Reporter at the New York Times for 6 years covering technology. I've been doing data-driven investigative stories using public datasets and I'm transitioning to data analytics roles.",
        isUser: true,
      },
      { content: "What tech skills?", isUser: false },
      {
        content:
          "Python (pandas, matplotlib), SQL, R, Tableau. I've done FOIA data analysis for several major stories.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "M.S. Journalism (data specialization), Columbia University, 2018. B.A. English, Brown University, 2016.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Python, R, SQL, Tableau, data storytelling, investigative research, public records, writing",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-nt-009",
    category: "chat",
    persona: "Non-tech — pharmacist pivoting to pharma data science",
    reviewerScore: 4.2,
    messages: [
      {
        content: "My name is Erica Huang, erica.huang@gmail.com, Boston MA",
        isUser: true,
      },
      { content: "Tell me about yourself.", isUser: false },
      {
        content:
          "I'm a clinical pharmacist at Massachusetts General Hospital for 5 years. I'm getting my M.S. in Biostatistics part-time and want to move to pharmaceutical data science.",
        isUser: true,
      },
      { content: "What tech work have you done?", isUser: false },
      {
        content:
          "I've done statistical analysis of drug interaction data using R and Python as part of my grad program. I also built a SQL database for medication reconciliation at the hospital.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "M.S. Biostatistics (in progress, expected 2025), Harvard School of Public Health. Pharm.D., UMass Amherst, 2020.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "R, Python, SAS, SQL, clinical data, drug safety, statistical modeling, clinical trials",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-nt-010",
    category: "chat",
    persona: "Non-tech — HR manager pivoting to people analytics",
    reviewerScore: 4.1,
    messages: [
      {
        content: "Hi, I'm David Chen, david.chen@gmail.com, Chicago IL",
        isUser: true,
      },
      { content: "What's your background?", isUser: false },
      {
        content:
          "I've been an HR Business Partner at Facebook (Meta) for 5 years, managing talent for 800-person engineering organizations. I'm now targeting people analytics or HRBP tech-focused roles.",
        isUser: true,
      },
      { content: "Any analytics work?", isUser: false },
      {
        content:
          "I built retention risk dashboards in Tableau using Workday data, and wrote Python scripts to analyze survey results. These drove a 20% reduction in attrition.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "MBA, HR & Organizational Behavior, University of Chicago Booth, 2018. B.A. Psychology, Northwestern, 2015.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Workday, Tableau, Python, SQL, people analytics, organizational design, talent management",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-nt-011",
    category: "chat",
    persona: "Non-tech — aircraft mechanic pivoting to aviation software QA",
    reviewerScore: 4.0,
    messages: [
      {
        content:
          "My name is Roberto Castillo, roberto.castillo@gmail.com, Dallas TX",
        isUser: true,
      },
      { content: "Tell me about your work.", isUser: false },
      {
        content:
          "I've been an A&P mechanic at American Airlines for 8 years, maintaining and certifying commercial aircraft. I've been doing software QA testing as a side role for our maintenance tracking system.",
        isUser: true,
      },
      { content: "Tell me more about the QA part.", isUser: false },
      {
        content:
          "I wrote test cases and found 30+ critical bugs in the new maintenance software before it was deployed to 5,000 mechanics company-wide. I'm now transitioning to software QA full-time.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "A.S. Aviation Maintenance Technology, Tarrant County College, 2015. FAA Airframe & Powerplant (A&P) Certificate.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Manual testing, test case writing, JIRA, Selenium (learning), aviation domain, safety-critical systems",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-nt-012",
    category: "chat",
    persona: "Non-tech — architect pivoting to BIM/construction tech",
    reviewerScore: 4.2,
    messages: [
      {
        content: "Hi, I'm Amelia Stewart, amelia.stewart@gmail.com, Chicago IL",
        isUser: true,
      },
      { content: "What's your background?", isUser: false },
      {
        content:
          "I'm a licensed architect with 8 years of experience at Skidmore Owings & Merrill. I specialize in large commercial buildings and I've become an expert in BIM software and computational design.",
        isUser: true,
      },
      { content: "What tech do you use?", isUser: false },
      {
        content:
          "Revit, Rhino, Grasshopper (parametric design), Python for scripting, and Dynamo for BIM automation. I built automated clash detection workflows that saved $500K on a major project.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "M.Arch. (computational architecture focus), Illinois Institute of Technology, 2016. B.Arch., Cornell, 2014.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Revit, BIM, Python, Dynamo, Grasshopper/Rhino, AutoCAD, computational design, construction tech",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-nt-013",
    category: "chat",
    persona: "Non-tech — scientist pivoting to biotech data engineering",
    reviewerScore: 4.3,
    messages: [
      {
        content:
          "Hi, I'm Dr. Maya Patel, maya.patel@gmail.com, South San Francisco CA",
        isUser: true,
      },
      { content: "Tell me about your work.", isUser: false },
      {
        content:
          "I'm a research scientist at Genentech. For 6 years I've been doing computational biology — analyzing genomic datasets to find biomarkers for cancer. I'm transitioning to data engineering.",
        isUser: true,
      },
      { content: "What engineering work have you done?", isUser: false },
      {
        content:
          "I built our lab's genomic data processing pipeline in Python and Snakemake, which cut analysis time from 2 weeks to 3 days for whole-genome sequencing data. I'm also building a Nextflow pipeline for production.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "PhD Computational Biology, UCSF, 2019. B.S. Bioinformatics, UC San Diego, 2014.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Python, R, Snakemake, Nextflow, Spark, AWS, Docker, bioinformatics pipelines, SQL, Airflow",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-nt-014",
    category: "chat",
    persona: "Non-tech — banker to blockchain/fintech developer",
    reviewerScore: 4.1,
    messages: [
      {
        content:
          "My name is Victor Adeyemi, victor.adeyemi@gmail.com, New York NY",
        isUser: true,
      },
      { content: "Tell me about your career.", isUser: false },
      {
        content:
          "I spent 5 years in investment banking at Citigroup analyzing structured products. I taught myself Solidity and Python for the last 2 years and now do blockchain development on the side.",
        isUser: true,
      },
      { content: "What blockchain work have you done?", isUser: false },
      {
        content:
          "I deployed 3 DeFi smart contracts on Ethereum, built a token vesting contract used by a startup raising $2M, and contributed to an open-source lending protocol.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "B.S. Finance, New York University Stern School of Business, 2018.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "Solidity, Python, Web3.js, Hardhat, Foundry, DeFi, ERC-20, financial modeling, SQL",
        isUser: true,
      },
    ],
  },
  {
    id: "chat-nt-015",
    category: "chat",
    persona: "Non-tech — social worker pivoting to UX research",
    reviewerScore: 4.1,
    messages: [
      {
        content: "Hi, I'm Jasmine Cooper, jasmine.cooper@gmail.com, Seattle WA",
        isUser: true,
      },
      { content: "Tell me about your background.", isUser: false },
      {
        content:
          "I've been a licensed clinical social worker for 7 years at Seattle Children's Hospital. I'm pivoting to UX research, where I can apply my deep interview and empathy skills to tech products.",
        isUser: true,
      },
      { content: "Any UX experience?", isUser: false },
      {
        content:
          "I completed a UX research bootcamp and did 3 UX research projects: usability testing for a mental health app, user interviews and affinity mapping for a nonprofit, and a heuristic evaluation.",
        isUser: true,
      },
      { content: "Education?", isUser: false },
      {
        content:
          "M.S.W. Clinical Social Work, University of Washington, 2017. B.A. Psychology, Seattle University, 2015. UX Research Certificate, Nielsen Norman Group, 2024.",
        isUser: true,
      },
      { content: "Skills?", isUser: false },
      {
        content:
          "UX research, usability testing, user interviews, affinity mapping, Figma, survey design, qualitative research",
        isUser: true,
      },
    ],
  },
];

// ===========================================================================
// SECTION J: PDF — Expanded (51 cases) [D3 expansion]
// Scanned/OCR noise, multi-column, table-based, header/footer artifacts
// ===========================================================================

const pdfExpanded: GoldCase[] = [
  {
    id: "pdf-010",
    category: "pdf",
    persona: "PDF — multi-column layout, two columns side-by-side",
    reviewerScore: 4.2,
    notes: "Multi-column text extraction merges columns left-to-right",
    messages: [
      {
        content: `SARAH CHEN                        CONTACT
sarah.chen@gmail.com              Phone: (415) 555-1234
Senior Data Scientist             Location: San Francisco, CA
                                  LinkedIn: /in/sarahchen

EXPERIENCE                        SKILLS
Data Scientist, Uber (2021–now)   Python, R, SQL
- Surge pricing ML model          TensorFlow, PyTorch
- 18% reduction in driver costs   Spark, Airflow
                                  AWS, GCP
Data Scientist, Lyft (2019–21)    Statistics, A/B
- Demand forecasting              Causal inference
- Saved $2.1M in incentives

EDUCATION
M.S. Statistics, Stanford 2019
B.S. Math, UC Berkeley 2017`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-011",
    category: "pdf",
    persona: "PDF — scanned text with OCR noise, low quality scan",
    reviewerScore: 3.8,
    notes: "Tests robustness to character substitution noise from OCR",
    messages: [
      {
        content: `J0hn M1tchell
j0hn.m1tchell@gma1l.c0m | (555) 123-4567 | B0st0n, MA

Sen10r S0ftware Engineer | 8 years

EXPERlENCE

Lead Eng1neer at Wayfair (2020-Present)
- Bu1lt furniture rec0mmendati0n engine (5M daily users)
- lmpr0ved search relevance by 34%
- Led team 0f 7 eng1neers

Backend Eng1neer at HubSp0t (2016-2020)
- CRM data pipeline for 100K+ b0s1nesses
- Reduced API latency by 50%

EDUCATl0N
B.S. C0mputer Sc1ence, N0rtheastern Un1versity - 2016

SKlLLS
Java, Pyth0n, SQL, Kafka, AWS, K8s, P0stgreSQL`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-012",
    category: "pdf",
    persona: "PDF — table-formatted experience section",
    reviewerScore: 4.3,
    notes: "Table cells extracted as mixed text rows",
    messages: [
      {
        content: `MARCUS JOHNSON | marcus.johnson@gmail.com | (312) 555-9090 | Chicago, IL

PROFESSIONAL EXPERIENCE

Company         | Role                    | Period      | Location
----------------|-------------------------|-------------|------------------
Google          | Senior SWE              | 2021–Now    | Chicago (Remote)
Groupon         | Software Engineer II    | 2018–2021   | Chicago, IL
Accenture       | Associate Developer     | 2016–2018   | Chicago, IL

Key Achievements:
• Google: Built Workspace APIs used by 6M enterprise users. Reduced latency by 40%.
• Groupon: Deals matching algorithm — 22% CTR improvement.
• Accenture: CRM integration for Fortune 500 insurance client.

EDUCATION
B.S. Computer Science, University of Illinois Urbana-Champaign — 2016

SKILLS: Go, Python, Java, Google Cloud, Kubernetes, PostgreSQL, gRPC, REST APIs`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-013",
    category: "pdf",
    persona: "PDF — footer with page numbers on every line",
    reviewerScore: 4.2,
    notes: "Repeated page number artifact in extracted text",
    messages: [
      {
        content: `Emma Watson
emma.watson@gmail.com | Seattle, WA | (206) 555-3210
1

SUMMARY
ML Engineer with 6 years of experience in NLP and recommendation systems.
1

EXPERIENCE
Principal ML Engineer, Amazon (2021–Present)
Alexa NLU models — improved intent recognition accuracy to 97.3%.
Led team of 9 ML engineers.
1

Senior ML Engineer, Zillow (2018–2021)
Home valuation ML models (Zestimate) for 110M homes.
2

ML Engineer, Expedia (2016–2018)
Hotel recommendation personalization engine.
2

EDUCATION
M.S. Computer Science (ML specialization), UW Seattle — 2016
2

SKILLS: Python, PyTorch, TensorFlow, NLP, transformers, Spark, SageMaker, AWS, Kubernetes`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-014",
    category: "pdf",
    persona: "PDF — reversed chronological order listed oldest first",
    reviewerScore: 4.3,
    notes: "Experience listed oldest-first (unusual ordering)",
    messages: [
      {
        content: `Carlos Rivera
carlos.rivera@gmail.com | (650) 555-7777 | Palo Alto, CA

CHRONOLOGICAL EXPERIENCE (earliest to recent):

Junior Developer, Oracle, 2012–2015
Core database engine testing and QA.

Software Engineer, Oracle, 2015–2018
PL/SQL optimizer contributions.

Senior Engineer, Snowflake, 2018–2021
Query optimization engine for cloud data warehouse. Reduced complex query time by 45%.

Staff Engineer, Snowflake, 2021–Present
Core storage engine. Led cross-functional team of 12 engineers. 3 patents filed.

EDUCATION
B.S. CS, University of California, Riverside — 2012

SKILLS: C++, Java, SQL, distributed databases, query optimization, cloud architecture`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-015",
    category: "pdf",
    persona: "PDF — resume with watermark text artifacts",
    reviewerScore: 4.1,
    notes: "Watermark 'CONFIDENTIAL' appears throughout extracted text",
    messages: [
      {
        content: `CONFIDENTIAL
Priya Patel
priya.patel.eng@gmail.com
CONFIDENTIAL
San Jose, CA | (408) 555-2345

Senior Software Engineer | Infrastructure
CONFIDENTIAL

Experience:
Staff Engineer, Netflix, 2020–Present CONFIDENTIAL
Content delivery infrastructure (CDN) for 260M subscribers.
Reduced video startup time by 28% globally.

Senior Engineer, LinkedIn, 2017–2020 CONFIDENTIAL
Feed infrastructure serving 850M members.

Engineer, Juniper Networks, 2014–2017 CONFIDENTIAL
Network OS development in C.

CONFIDENTIAL
Education: B.S. CS, UCLA, 2014

Skills: C, C++, Go, Python, distributed systems, CDN, TCP/IP, Kubernetes, Linux kernel`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-016",
    category: "pdf",
    persona: "PDF — resume with bullet unicode variants (▪, ▸, ◦)",
    reviewerScore: 4.4,
    messages: [
      {
        content: `Michael Torres
michael.torres@gmail.com ▪ (646) 555-8888 ▪ New York, NY

Principal Product Manager ▸ Fintech & Payments ▸ 10 years

Experience

Principal PM ▸ Stripe (2021–Present)
◦ Led Revenue Recognition product ($200M ARR, 5,000 enterprise customers)
◦ Shipped automated revenue waterfall — reduced customer implementation time 70%
◦ Managed team of 4 PMs across 2 time zones

Senior PM ▸ PayPal (2018–2021)
◦ Owned PayPal Checkout redesign (1.2B transactions/yr)
◦ Improved checkout conversion by 11% (split-tested with 50M users)

PM ▸ Capital One (2015–2018)

Education
MBA ▸ Wharton School of Business, 2015
B.S. Finance ▸ NYU Stern, 2013

Skills: Product strategy, payments domain, SQL, Amplitude, A/B testing, roadmapping, stakeholder management`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-017",
    category: "pdf",
    persona: "PDF — resume with color section dividers as dashes/equals",
    reviewerScore: 4.4,
    messages: [
      {
        content: `Natalie Kim
natalie.kim@gmail.com | (617) 555-5555 | Boston, MA
================================================================

PROFESSIONAL SUMMARY
================================================================
Senior UX Designer with 7 years driving user-centered product design for enterprise SaaS.

================================================================
EXPERIENCE
================================================================
Lead UX Designer > Cognex Corporation (2021–Present)
Machine vision software UI. Designed industrial tablet interface adopted by 2,000+ factory operators.
Reduced operator training time from 8 hours to 2 hours.

----------------------------------------------------------------
Senior UX Designer > Toast (2018–2021)
Restaurant management platform (90,000 restaurants). Point of sale redesign cut order errors by 32%.

----------------------------------------------------------------
UX Designer > Fidelity Investments (2016–2018)
Customer-facing portfolio management tools.

================================================================
EDUCATION
================================================================
B.S. Cognitive Science + HCI, Carnegie Mellon University — 2016

================================================================
SKILLS
================================================================
Figma, Sketch, InVision, UserTesting, Hotjar, SQL, Accessibility, Design Systems, Research Methods`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-018",
    category: "pdf",
    persona: "PDF — scanned resume, heavy whitespace between chars",
    reviewerScore: 3.9,
    notes: "Whitespace noise from scanned PDF",
    messages: [
      {
        content: `D a v i d  L e e
d a v i d . l e e @ g m a i l . c o m
( 4 0 8 )  5 5 5 - 1 1 1 1
S a n  J o s e ,  C A

S o f t w a r e  E n g i n e e r  |  8  y e a r s

E X P E R I E N C E

S e n i o r  E n g i n e e r ,  C i s c o  ( 2 0 2 0 - P r e s e n t )
N e t w o r k  c o n f i g u r a t i o n  a u t o m a t i o n  p l a t f o r m .
R e d u c e d  n e t w o r k  c h a n g e s  e r r o r  r a t e  b y  6 0 % .

E n g i n e e r ,  A r i s t a  N e t w o r k s  ( 2 0 1 6 - 2 0 2 0 )
E O S  ( E x t e n s i b l e  O p e r a t i n g  S y s t e m )  d e v e l o p m e n t .

E D U C A T I O N
B . S .  C S ,  U C  S a n t a  B a r b a r a  2 0 1 6

S K I L L S
P y t h o n ,  C + + ,  N e t c o n f ,  Y A N G ,  N e t M i k o ,  A W S ,  G i t`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-019",
    category: "pdf",
    persona: "PDF — resume sent as image, minimal extracted text",
    reviewerScore: 3.7,
    notes: "Very sparse OCR output from image-based PDF",
    messages: [
      {
        content: `Jennifer Hayes
j.hayes@gmail.com
Product Manager

Google 2019 - now
Sr PM, Google Maps
Launched Local Guides.

Facebook 2016 - 2019
PM, News Feed

Stanford MBA 2016
Dartmouth BA CS 2014

Skills: strategy, analytics, SQL, launches`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-020",
    category: "pdf",
    persona: "PDF — Chinese company names with English descriptions",
    reviewerScore: 4.4,
    messages: [
      {
        content: `Hao Chen (陈 昊)
hao.chen.swe@gmail.com | San Francisco, CA | +1 (650) 555-4321
Previously: Beijing, Shanghai

Senior Software Engineer | 8 years (China + US)

Experience:

Staff Engineer, ByteDance (字节跳动) — San Francisco (2022–Present)
TikTok recommendation algorithm — US content ranking team.
Improved watch-time metrics by 12% through multi-modal feature engineering.

Senior Engineer, Meituan (美团) — Beijing (2018–2022)
Order matching and dispatch algorithms for food delivery (70M daily orders).

Software Engineer, Baidu (百度) — Beijing (2016–2018)
Natural language search ranking models.

Education:
M.S. Computer Science, Carnegie Mellon University — 2016
B.Eng. Computer Science, Tsinghua University (清华大学) — 2014

Skills: Python, C++, PyTorch, TensorFlow, Spark, recommendation systems, distributed ML, AWS`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-021",
    category: "pdf",
    persona: "PDF — resume with linked text artifacts [Company Name]",
    reviewerScore: 4.3,
    notes: "Hyperlink text artifacts from PDF link extraction",
    messages: [
      {
        content: `Alison Park
alison.park@gmail.com | (213) 555-0001 | Los Angeles, CA
[LinkedIn Profile] [GitHub Portfolio] [Personal Website]

Software Engineer | Full Stack | 5 years

Experience:
Senior Engineer, [Snap Inc.] (2021–Present) [View Company]
[AR developer platform] — SDK used by 250K developers.
Reduced AR content publish time from 22 minutes to 3 minutes.

Software Engineer, [Hulu] (2019–2021) [View Company]
[Video player SDK] for Hulu.com (40M subscribers).

Junior Engineer, [NBCUniversal] (2018–2019)

Education:
[UCLA] — B.S. Computer Science — Class of 2018 [View School]

Skills: Swift, Kotlin, TypeScript, React Native, GraphQL, AWS, video streaming, SDKs`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-022",
    category: "pdf",
    persona: "PDF — all text in uppercase (some templates do this)",
    reviewerScore: 4.1,
    notes: "Full uppercase extraction — tests case normalization",
    messages: [
      {
        content: `ANTONIO FERRARI
ANTONIO.FERRARI@GMAIL.COM | +39 02 1234 5678 | MILAN, ITALY

SENIOR DATA ENGINEER | 7 YEARS

EXPERIENCE

LEAD DATA ENGINEER, FERRARI (THE CAR COMPANY) — MARANELLO, IT (2021–PRESENT)
TELEMETRY DATA PIPELINE FOR F1 RACING — 2TB PER RACE WEEKEND.
REDUCED LAP TIME ANALYSIS FROM 4 HOURS TO 12 MINUTES.

SENIOR DATA ENGINEER, SKY ITALIA — MILAN (2018–2021)
STREAMING ANALYTICS — 5M CONCURRENT VIEWERS PEAK.

DATA ENGINEER, ACCENTURE ITALY (2016–2018)

EDUCATION
LAUREA IN INGEGNERIA INFORMATICA, POLITECNICO DI MILANO — 2016

SKILLS: PYTHON, APACHE SPARK, KAFKA, AWS, DATABRICKS, DELTA LAKE, SQL, FLINK`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-023",
    category: "pdf",
    persona:
      "PDF — company names with commas (e.g., 'Smith, Jones & Partners')",
    reviewerScore: 4.2,
    messages: [
      {
        content: `Margaret O'Brien
margaret.obrien@gmail.com | (617) 555-3333 | Boston, MA

Technology Partner | Law & Consulting Firms | 12 years

Professional Experience:

Director of Technology, Ropes & Gray LLP, Boston (2020–Present)
Legal technology strategy for 1,400-attorney global firm.
Implemented AI contract review — reduced due diligence time by 55%.

IT Manager, Sullivan & Worcester LLP, Boston (2016–2020)
Managed IT infrastructure for 350-person firm.

Systems Analyst, Bain & Company, Boston (2012–2016)
Business intelligence systems for consulting teams.

Education:
M.S. Information Management, Simmons University — 2012
B.S. Computer Information Systems, Bentley University — 2010

Skills:
Legal technology, SaaS management, AI/ML tools, Python, SQL, Microsoft 365, project management`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-024",
    category: "pdf",
    persona: "PDF — resume with projects section taking up most space",
    reviewerScore: 4.3,
    messages: [
      {
        content: `Owen Martinez
owen.martinez@gmail.com | (512) 555-6543 | Austin, TX | github.com/owenmartinez

New Grad Software Engineer — Seeking First Full-Time Role

PROJECTS (Capstone & Personal)

DistributedDB (Senior Capstone, 2024)
Built a fault-tolerant distributed key-value store using Raft consensus (Go). Handles 50K ops/sec, zero data loss on node failures. 800+ GitHub stars.

ResumeParser (Open Source, 2023)
NLP-based resume information extractor (Python, spaCy). 300+ GitHub stars, 40 contributors.

Real-Time Chat App (Personal, 2023)
WebSocket-based group chat with message persistence. React + Node.js + MongoDB. 500 daily active users.

EXPERIENCE
Software Engineering Intern, Dell Technologies (Summer 2023)
Contributed 12 features to internal developer portal. All changes shipped to production.

EDUCATION
B.S. Computer Science, University of Texas at Austin — 2024 (GPA: 3.9/4.0)

SKILLS: Go, Python, TypeScript, React, Node.js, PostgreSQL, Redis, Docker, Kubernetes`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-025",
    category: "pdf",
    persona: "PDF — mixed language labels (French headers, English content)",
    reviewerScore: 4.3,
    messages: [
      {
        content: `Camille Bernard
camille.bernard@gmail.com | Paris, France | +33 7 55 44 33 22

Ingénieure logicielle | Software Engineer | 6 ans

EXPÉRIENCE PROFESSIONNELLE
Senior Engineer, Deezer (2021–Present)
Music recommendation engine for 16M active users. A/B tested 40+ ranking features.

Ingénieure, BlaBlaCar (2018–2021)
Ride-sharing matching algorithms. Improved driver-passenger match rate by 19%.

Développeuse Junior, Criteo (2017–2018)
Programmatic ad targeting.

FORMATION
Ingénieure diplômée — INSA Lyon — Informatique — 2017

COMPÉTENCES TECHNIQUES
Python, Scala, Spark, Kafka, Cassandra, Redis, GCP, recommendation systems, A/B testing, SQL`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-026",
    category: "pdf",
    persona: "PDF — sparse experience section with many short roles",
    reviewerScore: 4.0,
    messages: [
      {
        content: `Ryan Cooper
r.cooper@gmail.com | (415) 555-1357

Backend Engineer (contractor, full-time)

Contract History:
✦ Stripe (3 months, 2024) — Payments API improvements
✦ DoorDash (6 months, 2023) — Order fulfillment microservices  
✦ Robinhood (4 months, 2023) — Options trading backend
✦ Coinbase (5 months, 2022) — Crypto custody APIs
✦ Plaid (6 months, 2022) — Financial data aggregation
✦ Square (8 months, 2021) — Point of sale backend
✦ Uber (4 months, 2020) — Maps backend internship (converted to FTE)

Full-time: Backend Engineer, Uber (2020–2021) before going contractor

Education: B.S. CS, UC Berkeley, 2020

Skills: Go, Python, Java, PostgreSQL, Kafka, Redis, AWS, microservices, financial APIs`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-027",
    category: "pdf",
    persona: "PDF — resume with academic publications mixed in",
    reviewerScore: 4.4,
    messages: [
      {
        content: `Dr. Lin Wei
lin.wei@gmail.com | New Haven, CT

Research Scientist / Senior ML Engineer | Transitioning to Industry

Education:
PhD Computer Science, Yale University — 2022 (Advisor: Prof. Zhong)
B.S. Computer Science, Peking University — 2017

Selected Publications:
[1] Wei L. et al. "Efficient Sparse Transformers for Long-Form Text." NeurIPS 2022.
[2] Wei L. et al. "Cross-Modal Alignment in Vision-Language Models." ICML 2021.
[3] Wei L. "Token Pruning for Real-Time Inference." ACL 2021. (Best Paper Award)

Industry Experience:
Research Intern, Google Brain (Summer 2021) — sparse attention mechanisms
Research Intern, Microsoft Research (Summer 2020) — multilingual NLP

Teaching:
Teaching Assistant, Yale CS475 (Machine Learning), 3 semesters

Skills: Python, PyTorch, JAX, Transformers, CUDA, distributed training, LLMs, NLP research`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-028",
    category: "pdf",
    persona: "PDF — Indian name, US visa status mentioned",
    reviewerScore: 4.4,
    messages: [
      {
        content: `Saurabh Gupta
saurabh.gupta@gmail.com | (408) 555-7890 | Sunnyvale, CA
Work Authorization: US Citizen (no sponsorship required)

Software Engineer | Distributed Systems | 8 years in US

Experience:
Staff Software Engineer, Meta (2020–Present)
Instagram backend infrastructure — photo/video storage layer (2B+ users).
Designed shard rebalancing system reducing p99 latency by 40%.

Senior Engineer, LinkedIn (2016–2020)
Member profile service — handled 850M members.
Contributed to open-source Kafka library (30K+ stars).

Software Engineer, Yelp (2014–2016)
Business search indexing pipeline.

Education:
M.S. Computer Science, USC (University of Southern California) — 2014
B.Tech Information Technology, NIT Trichy — 2012

Skills: C++, Python, Java, Kafka, RocksDB, distributed storage, Kubernetes, MySQL, performance engineering`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-029",
    category: "pdf",
    persona: "PDF — skills listed with rating bars (1-5 or percentage)",
    reviewerScore: 4.0,
    notes: "Skill ratings as text artifacts: 'Python ████████░░ 80%'",
    messages: [
      {
        content: `Luca Moretti
luca.moretti@gmail.com | Rome, Italy | +39 06 555 1234

Full Stack Developer | 5 years

Experience:
Senior Developer, Enel (2021–Present) — Rome
Smart grid data platform for 30M Italian electricity customers
Built real-time demand forecasting API.

Developer, TIM (Telecom Italia) (2019–2021)
Customer portal APIs for 20M subscribers.

Education: B.Sc. Computer Engineering, Sapienza University of Rome — 2019

SKILLS
Python           ████████████░░░ 80%
JavaScript       ███████████████ 100%
React            ████████████░░░ 80%
PostgreSQL       ██████████░░░░░ 65%
AWS              ████████░░░░░░░ 55%
Docker           ████████████░░░ 80%
Machine Learning ██████░░░░░░░░░ 40%`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-030",
    category: "pdf",
    persona: "PDF — resume with emoji icons in section headers",
    reviewerScore: 4.2,
    messages: [
      {
        content: `Isabella Santos
isabella.santos@gmail.com | Sydney, Australia
+61 412 345 678 | linkedin.com/in/isabellasantos

👩‍💻 ABOUT ME
Senior Data Scientist with 6 years building production ML systems.

💼 EXPERIENCE

Senior Data Scientist @ Atlassian (2021–Present)
Jira issue priority prediction ML model (10M+ daily issues).
Reduced time-to-resolution by 18%.

Data Scientist @ Commonwealth Bank of Australia (2019–2021)
Fraud detection models — $45M AUD in prevented annual losses.

🎓 EDUCATION
M.Sc. Data Science, University of Sydney — 2019
B.Eng. Electrical Engineering, UNSW — 2017

🛠️ SKILLS
Python, R, Scikit-Learn, PyTorch, SQL, Spark, Databricks, AWS SageMaker, MLflow, A/B testing`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-031",
    category: "pdf",
    persona: "PDF — French Canadian name, bilingual English/French",
    reviewerScore: 4.3,
    messages: [
      {
        content: `Jean-François Gagnon
jf.gagnon@gmail.com | +1 (514) 555-4321 | Montréal, QC, Canada

Architecte logiciel / Software Architect | 10 ans / 10 years

Expérience / Experience:

Architecte Principal, Ubisoft Montréal (2020–présent)
Architecture technique pour Assassin's Creed Codename Hexe.
Led 15-person technical team. Reduced build times by 45% with distributed compilation.

Architecte Senior, Desjardins (2016–2020)
Banking platform modernisation for $250B cooperative (7M members).

Développeur Principal, Bell Canada (2014–2016)

Éducation / Education:
M.Sc. Génie Logiciel, École Polytechnique de Montréal — 2014
B.Eng. Informatique, McGill University — 2012

Compétences / Skills: C++, Unreal Engine, C#, Python, Azure, Kubernetes, Java, Spring, distributed systems`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-032",
    category: "pdf",
    persona: "PDF — Persian name with transliteration note",
    reviewerScore: 4.3,
    messages: [
      {
        content: `Shirin Moradi (شیرین مرادی)
shirin.moradi@gmail.com | Vienna, Austria | +43 676 123 4567

Business Intelligence Developer | 7 years

Professional Experience:

BI Lead, Erste Group Bank AG — Vienna (2021–Present)
Data warehouse for €250B EU banking group (16M customers, 7 countries).
Built executive dashboards used by C-suite across 4 subsidiaries.

BI Developer, A1 Telekom Austria (2018–2021)
Customer analytics platform for 5.5M mobile subscribers.

Junior BI Developer, Raiffeisen Bank International (2016–2018)

Education:
M.Sc. Business Intelligence, Vienna University of Technology (TU Wien) — 2016
B.Sc. Computer Science, Sharif University of Technology, Tehran — 2014

Skills: SQL, Power BI, Tableau, SAP BW/4HANA, Python, Azure Synapse, data modeling, ETL`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-033",
    category: "pdf",
    persona: "PDF — DevRel / developer advocate, non-standard role",
    reviewerScore: 4.3,
    messages: [
      {
        content: `Brendan Walsh
brendan.walsh@gmail.com | (415) 555-8989 | San Francisco, CA
@bwalsh_dev (Twitter) | dev.to/brendanwalsh | github.com/bwalsh

Developer Advocate & Technical Writer | 7 years

Experience:

Senior Developer Advocate, Twilio (2021–Present)
Grew SDK adoption by 60% through tutorials and conference talks (15 talks globally).
Maintained 3 official language SDKs (Python, Node.js, Ruby).

Developer Relations Engineer, Stripe (2018–2021)
Wrote API docs and sample apps for Stripe Checkout ($800B processed/yr).

Software Engineer, Heroku (2016–2018)
Platform add-on integrations.

Education:
B.S. Computer Science, Trinity College Dublin — 2016

Skills: Python, Node.js, Ruby, REST APIs, technical writing, public speaking, documentation, demos, SDKs, community building`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-034",
    category: "pdf",
    persona: "PDF — embedded resume in email body (no formatting)",
    reviewerScore: 3.8,
    notes:
      "Test parsing of minimal structure typical of plain-text email paste",
    messages: [
      {
        content: `Rachel Kim / rachel.kim.dev@gmail.com / (206) 555-1234 / Seattle WA

Current: Senior Frontend Engineer at Microsoft (2020-present). Working on VS Code web editor. Shipped the VS Code extension marketplace redesign (2M daily users).

Prior: Software Engineer at Amazon (2018-2020). Alexa web developer console. And before that: Frontend intern at Redfin (2017 summer).

Education: BS Computer Science, University of Washington 2018.

Skills: TypeScript, React, Angular, Node.js, Azure, REST, accessibility, Webpack, Jest.`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-035",
    category: "pdf",
    persona: "PDF — executive with 30-year career, many companies",
    reviewerScore: 4.5,
    messages: [
      {
        content: `Robert Harrison, Jr.
rob.harrison@gmail.com | (617) 555-2222 | Wellesley, MA

Chief Information Officer | Technology Executive | 30 years

CAREER SUMMARY
Technology executive with P&L responsibility across healthcare, financial services, and manufacturing sectors.

Executive Experience:

CIO, Bright Horizons Family Solutions (2017–Present)
$2B public company. Led digital transformation and cloud migration program ($50M investment) delivering $18M annual cost savings.

SVP Technology, Blue Cross Blue Shield of Massachusetts (2011–2017)
Defined enterprise technology strategy for $9B health insurer.

VP IT, State Street Corporation (2007–2011)
Core banking infrastructure and global data center consolidation.

Managing Director, Accenture Financial Services (2001–2007)

Senior Consultant, Andersen Consulting (1993–2001)

Education:
MBA, MIT Sloan School of Management — 1997
B.S. Computer Science, Penn State University — 1993

Key Skills: Technology strategy, P&L leadership, cloud transformation, vendor management, cybersecurity governance, digital innovation, team building`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-036",
    category: "pdf",
    persona: "PDF — cybersecurity researcher with CVEs credited",
    reviewerScore: 4.5,
    messages: [
      {
        content: `Alex Chen
alex.chen.sec@gmail.com | (602) 555-0011 | Phoenix, AZ
https://bugcrowd.com/alexchen | HackerOne: @alexchenSec

Principal Security Researcher | 9 years

Experience:

Principal Security Researcher, CrowdStrike (2021–Present)
Threat intelligence research on ransomware groups. Discovered Magniber/STOP ransomware C2 infrastructure.
CVEs credited: CVE-2023-41234, CVE-2023-38956, CVE-2022-44567

Security Researcher, Palo Alto Networks (2018–2021)
Malware analysis and threat hunting for Unit 42 research team.
Presented at DEF CON 2020 and 2021.

Penetration Tester, Coalfire (2015–2018)

Education:
M.S. Information Security, Arizona State University — 2015
B.S. CS, University of Arizona — 2013

Skills: Reverse engineering, IDA Pro, Ghidra, binary exploitation, fuzzing, Python, C, threat intelligence, MITRE ATT&CK`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-037",
    category: "pdf",
    persona: "PDF — non-tech company (hospital IT), healthcare domain",
    reviewerScore: 4.3,
    messages: [
      {
        content: `Sandra Kowalski
sandra.kowalski@gmail.com | (312) 555-7654 | Chicago, IL

Clinical Informatics Engineer | 8 years

Experience:

Clinical Informatics Engineer III, Northwestern Medicine (2020–Present)
Epic EHR customization and integration (28,000 employees, 600K annual patients).
Built HL7 interface engine processing 2M clinical messages daily.

Integration Analyst, Rush University Medical Center (2016–2020)
Cloverleaf and Mirth Connect HL7 integrations for 150+ clinical systems.

Junior Developer, Allscripts Healthcare Technology (2015–2016)

Education:
M.S. Health Informatics, Illinois Institute of Technology — 2015
B.S. Computer Science, DePaul University — 2013
Epic Certified: Bridges, Inbound Interfaces

Skills: SQL, Java, Python, HL7, FHIR, Epic EHR, Mirth Connect, healthcare data integration, clinical workflows`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-038",
    category: "pdf",
    persona: "PDF — technical program manager, cross between PM and engineer",
    reviewerScore: 4.4,
    messages: [
      {
        content: `Anita Sharma
anita.sharma@gmail.com | (206) 555-9876 | Seattle, WA

Technical Program Manager | Infrastructure & Platform | 10 years

Professional History:

Senior TPM, Amazon Web Services (2020–Present)
Program manager for EC2 Nitro hypervisor program (100M+ VMs).
Coordinated 200+ engineers across 15 teams to deliver 3 major platform releases.
Zero-downtime migration of 50M+ live VMs.

TPM, Microsoft Azure (2016–2020)
Azure Kubernetes Service (AKS) general availability launch program.
Managed dependencies across 40 engineering teams.

Software Engineer, Expedia (2014–2016)

Education:
M.S. Computer Science, University of Washington — 2014
B.Tech Computer Science, BITS Pilani — 2012

Skills: Program management, technical roadmaps, cross-team coordination, risk management, Python, SQL, cloud infrastructure, AWS, Azure`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-039",
    category: "pdf",
    persona: "PDF — patent-heavy engineer, IP focus",
    reviewerScore: 4.4,
    messages: [
      {
        content: `Raymond Park
raymond.park@gmail.com | (408) 555-3030 | San Jose, CA

Principal Engineer — Innovation & Patents | 14 years

Professional Experience:

Principal Engineer, Qualcomm (2015–Present)
Core modem software architecture. Filed and granted 24 US patents in baseband signal processing.
Led 5G NR standardization contributions to 3GPP (45 accepted proposals).

Senior Engineer, Broadcom (2010–2015)
Wi-Fi chipset firmware. 6 patents in MIMO optimization.

Engineer, Atheros Communications (acquired by Qualcomm) (2008–2010)

IP Portfolio: 30 granted US patents, 8 pending. Available at USPTO.

Education:
M.S. Electrical Engineering, Stanford University — 2008
B.S. Electrical Engineering, UC San Diego — 2006

Skills: C, C++, Python, 5G NR, LTE, baseband, signal processing, 3GPP standards, FPGA, software patent writing`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-040",
    category: "pdf",
    persona: "PDF — blockchain/Web3 engineer, novel field",
    reviewerScore: 4.3,
    messages: [
      {
        content: `Jake Morrison
jake.morrison@gmail.com | (415) 555-4040 | San Francisco, CA
github.com/jakemorrisondev | twitter.com/jakemorrisondev

Web3 Protocol Engineer | DeFi & Smart Contracts | 5 years

Work Experience:

Protocol Engineer, Uniswap Labs (2022–Present)
Core contributor to Uniswap v4 (AMM protocol with $2B+ TVL).
Designed hooks architecture enabling custom liquidity pool logic (EIP submitted).
Solidity, Foundry, formal verification.

Smart Contract Engineer, OpenSea (2020–2022)
NFT marketplace smart contracts. Audited 15 third-party protocols.
Led gas optimization reducing average transaction cost by 35%.

Blockchain Developer, ConsenSys (2019–2020)
MetaMask browser extension development.

Education:
B.S. Computer Science, Princeton University — 2019

Skills: Solidity, Rust, EVM, Foundry, Hardhat, Web3.js, DeFi protocols, formal verification, cryptography, Python`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-041",
    category: "pdf",
    persona: "PDF — technical content writer / documentation engineer",
    reviewerScore: 4.2,
    messages: [
      {
        content: `Meredith Davis
meredith.davis@gmail.com | (512) 555-5678 | Austin, TX

Technical Writer / Documentation Engineer | 7 years

Experience:

Staff Technical Writer, HashiCorp (2021–Present)
Owner of Terraform documentation (4M monthly readers).
Led docs-as-code migration to Hugo + Markdown. Reduced broken links by 90%.
Writes and reviews 200+ doc PRs per quarter.

Senior Technical Writer, DigitalOcean (2018–2021)
Redesigned "Tutorials" section (12M monthly visitors).
Increased tutorial completion rate from 42% to 68%.

Documentation Engineer, Rackspace (2016–2018)

Education:
B.A. English & Computer Science (double major), UT Austin — 2016

Skills: Technical writing, docs-as-code, Markdown, Hugo, GitHub, Python, REST API documentation, OpenAPI/Swagger, developer education`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-042",
    category: "pdf",
    persona: "PDF — database specialist, DBA path",
    reviewerScore: 4.4,
    messages: [
      {
        content: `Patricia Nguyen
patricia.nguyen@gmail.com | (713) 555-6789 | Houston, TX

Senior Database Architect | 12 years

Career History:

Principal Database Architect, ExxonMobil (2019–Present)
Oracle and PostgreSQL architecture for 70,000-employee energy company.
Led cloud migration of 500TB data warehouse to Snowflake — 65% cost reduction.

Senior DBA, ConocoPhillips (2014–2019)
Performance tuning for upstream oil & gas exploration databases.

DBA, CenterPoint Energy (2012–2014)

Certifications:
Oracle Certified Master DBA (OCM) — 2018
AWS Database Specialty — 2021
PostgreSQL Professional Certification — 2020

Education:
B.S. Management Information Systems, University of Houston — 2012

Technical Skills: Oracle, PostgreSQL, Snowflake, MySQL, MongoDB, Python, SQL tuning, AWS RDS, data architecture, ETL`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-043",
    category: "pdf",
    persona: "PDF — staff engineer, long form technical narrative",
    reviewerScore: 4.6,
    messages: [
      {
        content: `Kiran Rao
kiran.rao@gmail.com | (650) 555-3210 | Menlo Park, CA

Staff Software Engineer | High-Performance Systems | 11 years at Meta

Professional Experience:

Staff Software Engineer, Meta (2013–Present)
I joined as a SWE III and grew to Staff Engineer over 11 years. Key work:

2021–2024: Led Horizon Worlds (VR metaverse) physics engine team. Designed frame synchronization protocol for synchronized multiplayer physics at 90fps for 100K concurrent users. Filed 2 patents.

2017–2021: Core contributor to HHVM (HipHop Virtual Machine), Meta's PHP/Hack runtime serving Facebook.com. Optimized JIT compiler — 15% reduction in CPU cost across Meta's server fleet (saves ~$40M/yr).

2013–2017: Infrastructure engineer for Facebook's memcached fleet (1,000+ nodes), the #1 caching layer for all Facebook product features.

Education:
M.S. Computer Science, Stanford University — 2013
B.S. CS & Mathematics, IIT Roorkee — 2011

Areas of Expertise: C++, PHP, Python, compiler optimization, distributed caching, VR/XR systems, JIT compilation, low-latency networking`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-044",
    category: "pdf",
    persona: "PDF — cloud architect, multi-cloud focus",
    reviewerScore: 4.5,
    messages: [
      {
        content: `Zara Ahmed
zara.ahmed@gmail.com | (781) 555-4567 | Boston, MA

Principal Cloud Architect | Multi-Cloud | 12 years

Experience:

Principal Cloud Architect, Liberty Mutual Insurance (2020–Present)
$48B insurer cloud transformation. Designed multi-cloud (AWS + Azure + GCP) architecture for 45,000 employees.
$22M annual cloud cost savings through FinOps program.
Achieved ISO 27001 and SOC2 compliance for cloud security posture.

Senior Cloud Architect, Akamai (2016–2020)
CDN edge computing architecture (200+ PoPs globally, 15–30% of world's web traffic).

Cloud Solutions Architect, IBM Consulting (2012–2016)

Education:
M.S. Computer Engineering, Boston University — 2012
B.Tech ECE, Jamia Millia Islamia University — 2010

Certifications:
AWS Solutions Architect Professional (2023)
Azure Solutions Architect Expert (2022)
GCP Professional Cloud Architect (2021)
TOGAF 9.2 (2020)

Skills: Multi-cloud architecture, FinOps, Terraform, Kubernetes, CloudFormation, Python, enterprise security, compliance`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-045",
    category: "pdf",
    persona: "PDF — test engineer / SDET, QA automation specialty",
    reviewerScore: 4.3,
    messages: [
      {
        content: `Tim Chen
tim.chen@gmail.com | (650) 555-7890 | San Francisco, CA

Senior Software Development Engineer in Test (SDET) | 8 years

Professional Experience:

Staff SDET, Stripe (2021–Present)
QA architecture for Stripe's payments API (used by 1M+ businesses). Built test infrastructure processing 500K test runs/day. Reduced release cycle from 2 weeks to 4 days.

Senior SDET, Twilio (2018–2021)
Owned automated test suites for SMS/Voice APIs (1B monthly messages). Reduced production incidents by 60% through proactive test coverage.

SDET, Box (2016–2018)

Education:
B.S. Computer Science, San Jose State University — 2016

Skills: Python, Java, Selenium, Playwright, pytest, TestNG, CI/CD automation, Jenkins, contract testing (Pact), performance testing (k6), infrastructure testing`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-046",
    category: "pdf",
    persona: "PDF — remote-first engineer, no office location",
    reviewerScore: 4.3,
    messages: [
      {
        content: `Morgan Lee
morgan.lee@gmail.com | Remote (US-based, Pacific timezone)

Senior Software Engineer | Full Remote | 7 years

Experience:

Senior Software Engineer, GitHub (Remote, 2021–Present)
GitHub Actions workflow orchestration service (200M+ workflow runs/month).
Shipped self-hosted runner auto-scaling feature — adopted by 50,000+ enterprise orgs.

Software Engineer, Notion (Remote, 2019–2021)
Real-time collaborative editing using CRDT algorithms.

Software Engineer, Basecamp (Remote, 2017–2019)
Remote-first project management features.

Education:
B.S. Computer Science, University of Oregon — 2017

Skills: Ruby, Go, TypeScript, React, PostgreSQL, Redis, Docker, GitHub Actions, distributed systems, CRDTs, async workflows`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-047",
    category: "pdf",
    persona: "PDF — data platform engineer with strong open source",
    reviewerScore: 4.4,
    messages: [
      {
        content: `Sofia Alvarez
sofia.alvarez@gmail.com | (512) 555-2019 | Austin, TX

Senior Data Platform Engineer | Streaming & Batch | 7 years

Experience:

Senior Data Platform Engineer, Cloudflare (2021–Present)
Data ingestion platform handling 5 trillion DNS queries per day (~28M/sec peak).
Led committer privilege on Apache Flink project (top 20 contributor).

Data Engineer, HEB Grocery (2018–2021)
Real-time supply chain analytics for 400+ Texas stores.
Reduced out-of-stock events by 14% through demand sensing pipeline.

Data Analyst, Whole Foods Market (2016–2018)

Open Source:
Apache Flink: 165 commits, 2 accepted feature PRs
Apache Kafka: 12 commits, documentation contributor

Education:
M.S. Statistics, UT Austin — 2016
B.S. Mathematics, Rice University — 2014

Skills: Apache Flink, Kafka, Spark, Python, Java, Scala, dbt, Snowflake, AWS, Airflow, real-time data engineering`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-048",
    category: "pdf",
    persona: "PDF — experienced nurse practitioner pivoting to clinical AI",
    reviewerScore: 4.1,
    messages: [
      {
        content: `Tiffany Robinson, NP-C, MSN
tiffany.robinson.np@gmail.com | (617) 555-3456 | Boston, MA

Advanced Practice Registered Nurse → Clinical AI Product Specialist

Clinical Experience:

Nurse Practitioner, Primary Care, Mass General Brigham (2016–Present)
Managing panel of 1,800 patients. Top 5% for patient satisfaction scores.
Led rollout of AI-assisted clinical documentation for 35 NPs in practice.

Registered Nurse, ICU, Brigham and Women's Hospital (2013–2016)

Education & Certifications:
M.S.N. Family Nurse Practitioner, MCPHS University — 2016
B.S.N., Boston College — 2013
AANP Certified NP (NP-C)
Epic Certified Applications Specialist — 2023
AWS Cloud Practitioner — 2024

Skills Relevant to Clinical AI: Clinical workflows, Epic EHR, NLP annotation (I've done clinical NER labeling), Python basics, HL7/FHIR, FDA regulatory awareness`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-049",
    category: "pdf",
    persona: "PDF — senior manager with IC → management transition",
    reviewerScore: 4.5,
    messages: [
      {
        content: `Christopher Wong
christopher.wong@gmail.com | (415) 555-8181 | San Francisco, CA

Engineering Manager → Director / VP | Platform Teams | 10 years

Professional History:

Director of Engineering, Salesforce (2021–Present)
Engineering Director for Salesforce Platform (AppExchange) — 250 engineers, 10M installs.
Grew teams from 40 to 90 engineers in 18 months while maintaining delivery cadence.

Engineering Manager, Twilio (2018–2021)
Managed 3 teams (20 engineers) on Programmable Voice product.

Senior Software Engineer (IC), Twilio (2015–2018)
Was promoted to EM from IC after delivering TwiML XML processing engine.

Software Engineer, Yelp (2013–2015)
Business data APIs.

Education:
B.S. Computer Science, UCLA — 2013

Leadership Skills: Team building, roadmap planning, recruiting, career development
Technical Background: Python, Java, Node.js, REST, Kubernetes, AWS, distributed systems`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-050",
    category: "pdf",
    persona: "PDF — resume with unusual date formats (quarters, fiscal years)",
    reviewerScore: 4.0,
    notes: "Dates in Q1 2022 / FY 2020 format",
    messages: [
      {
        content: `Derek Thompson
derek.thompson@gmail.com | Portland, OR | (503) 555-2020

Senior Product Manager — Analytics Tools

Professional Experience:

Senior PM, Domo (Q2 2021–present)
Business intelligence platform (3,000 companies, $350M ARR).
Launched Domo AI Analyzer feature — 800 beta customers in first 6 months.

PM, Adobe Analytics (FY2018–FY2021)
Analytics product for 8,000 enterprise customers.

Associate PM, Tableau / Salesforce (Q3 2016–Q4 2018)

Education:
MBA, University of Oregon Lundquist College of Business — 2016
B.S. Statistics, Oregon State — 2014

Skills: SQL, Tableau, Google Analytics, product roadmapping, data visualization, customer research, analytics tools domain`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-051",
    category: "pdf",
    persona: "PDF — sparse OCR output with combined lines and merged words",
    reviewerScore: 3.7,
    notes: "OCR merged adjacent words and line breaks",
    messages: [
      {
        content: `KarenAdams karen.adams@gmail.com(404)555-1234 AtlantaGA
SeniorDataEngineer 6yearsexperience

Experience:
LeadDataEngineerHomeDepot(2021-now)
DatainfrastructureforHomeDepot.com($15Bannualonlinesales)
BuiltETLpipelineprocessing50MproductupdatesdailyReducedlatencyby65%

DataEngineerCocaColaAtlanta(2018-2021)
Salesdatapipelineglobalreporting

Education
BSComputerScienceGeorgiaStateUniversity2018

Skills Python Spark Kafka Snowflake AWS dbt Terraform Kubernetes SQL`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-052",
    category: "pdf",
    persona: "PDF — Korean resume structure (education first)",
    reviewerScore: 4.3,
    notes: "Korean-style CVs often list education before experience",
    messages: [
      {
        content: `Lee Jae-won (이재원)
jaewon.lee@gmail.com | +82 10 1234 5678 → now San Francisco, CA

Software Engineer | Backend Systems

학력 (Education — listed first per Korean resume convention):
M.S. Computer Science, Stanford University — 2022
B.S. Computer Science, Yonsei University — 2020

경력 (Work Experience):

Software Engineer, Kakao Corp. (2020–2021, part-time/internship during M.S.)
Backend APIs for KakaoTalk Business.

Software Engineering Intern, Naver Corp. (Summer 2019)
Search relevance backend.

Current Role:
Software Engineer, Stripe — San Francisco (2022–Present)
Billing infrastructure team. Shipped automated proration feature used by 200K+ merchants.

기술 (Skills): Java, Kotlin, Python, Spring Boot, PostgreSQL, Kafka, gRPC, AWS, Kubernetes`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-053",
    category: "pdf",
    persona: "PDF — technical founder, startup history",
    reviewerScore: 4.4,
    messages: [
      {
        content: `Nathan Ross
nathan.ross@gmail.com | (415) 555-7000 | San Francisco, CA

Serial Founder & CTO | 3 startups | AI / Infrastructure

Career:

CTO & Co-Founder, NovaTek AI (2022–2024)
AI model inference optimization startup. Raised $8M seed (a16z, YC W23).
Built team of 12. Product: 4x faster LLM inference on commodity hardware.
Acquired by Groq in Q4 2024.

CTO & Co-Founder, DataFlow (2018–2022)
Real-time data pipeline tooling. Raised $15M Series A.
150 paying customers at acquisition. Acquired by Fivetran 2022.

Founding Engineer, Cruise Automation (2016–2018)
Employee #8. Sensor fusion and perception systems for autonomous vehicles.

Education:
B.S. CS & EE, MIT — 2016

Skills: Python, C++, Rust, distributed systems, inference optimization, LLMs, startup leadership, fundraising, team building`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-054",
    category: "pdf",
    persona: "PDF — cloud security engineer, compliance-heavy",
    reviewerScore: 4.4,
    messages: [
      {
        content: `Diana Petrov
diana.petrov@gmail.com | (571) 555-9000 | McLean, VA
Clearance: TS/SCI with CI Poly (Active)

Cloud Security Architect | Zero Trust & Compliance | 10 years

Experience:

Cloud Security Architect, Leidos (2020–Present)
Zero Trust architecture for US Intelligence Community cloud environment.
Led FedRAMP High authorization for 3 government cloud platforms.

Security Engineer, Booz Allen Hamilton (2016–2020)
Cloud security assessments for DoD and DHS clients.

Network Security Analyst, General Dynamics IT (2014–2016)

Education:
M.S. Information Security Management, Carnegie Mellon University — 2014
B.S. Computer Science, Virginia Tech — 2012

Certifications:
CISSP, CCSP, AWS Security Specialty, Azure Security Engineer, FedRAMP Certification Authority

Skills: Zero Trust, FedRAMP, NIST 800-53, AWS GovCloud, Azure Government, Terraform, cloud security architecture`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-055",
    category: "pdf",
    persona: "PDF — medical device software engineer, FDA regulated",
    reviewerScore: 4.4,
    messages: [
      {
        content: `Linda Gao
linda.gao@gmail.com | (617) 555-1100 | Cambridge, MA

Senior Software Engineer — Medical Devices | FDA Regulated Systems | 8 years

Experience:

Senior SWE, iRhythm Technologies (2021–Present)
Cardiac monitoring device software (Zio patch — 500K+ monitors deployed).
IEC 62304 compliant development. Led FDA 510(k) software documentation for Zio XT.

Software Engineer, Medtronic (2017–2021)
Insulin pump firmware and companion iOS app (300K patients worldwide).
Led Class III medical device SW verification and validation.

Software Engineer, Fitbit (2015–2017)
Consumer health tracking (before medical device pivot).

Education:
M.S. Biomedical Engineering, MIT — 2015
B.S. Electrical Engineering, UC San Diego — 2013

Skills: C, C++, Python, IEC 62304, FDA 21 CFR Part 11, software verification & validation, iOS (Swift), regulatory documentation, embedded systems`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-056",
    category: "pdf",
    persona: "PDF — automotive software engineer, AUTOSAR/CAN bus",
    reviewerScore: 4.3,
    messages: [
      {
        content: `Andreas Müller
andreas.mueller@gmail.com | Munich, Germany | +49 176 5555 1234

Automotive Software Engineer | AUTOSAR & Embedded Systems | 9 years

Berufserfahrung (Experience):

Senior Embedded Engineer, BMW Group (2020–Present)
AUTOSAR-based software for BMW iX3 electric vehicle BMS (battery management).
Reduced cell balancing algorithm runtime by 30%.

Embedded Software Engineer, Continental AG (2016–2020)
ECU software for Advanced Driver Assistance Systems (ADAS) — 5 OEM clients.

Junior Engineer, Robert Bosch GmbH (2015–2016)

Ausbildung (Education):
M.Sc. Electrical Engineering (Automotive), TU Munich — 2015
B.Sc. Electrical Engineering, KIT — 2013

Zertifikate (Certifications):
ISTQB Embedded Systems Specialist Certificate, 2020
AUTOSAR AP (Adaptive Platform) Training, 2021

Skills: C, AUTOSAR, CAN, LIN, MOST, MISRA C, Vector CANalyzer, Python, ISO 26262 (Functional Safety)`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-057",
    category: "pdf",
    persona: "PDF — aviation software engineer, DO-178C regulated",
    reviewerScore: 4.3,
    messages: [
      {
        content: `James Nakamura
james.nakamura@gmail.com | (972) 555-8765 | Dallas, TX

Aviation Software Engineer | DO-178C DAL A/B Systems | 10 years

Experience:

Senior Software Engineer, Lockheed Martin Aeronautics (2019–Present)
Flight control system software for F-35 (DO-178C DAL A).
McAfee DISA STIGs compliance for classified avionics systems.
Led SIL (Software Integration Lab) test team of 6.

Software Engineer, L3Harris Technologies (2015–2019)
Mission computer software for multiple military platforms.

Junior Engineer, General Dynamics Aviation (2013–2015)

Education:
B.S. Computer Engineering, Texas A&M University — 2013

Certifications:
DO-178C Practitioner, RTCA, 2017

Skills: Ada, C, C++, ARINC 429, MIL-STD-1553, Python (testing), DO-178C, LDRA, VectorCAST, Rational DOORS, safety-critical systems`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-058",
    category: "pdf",
    persona: "PDF — genomics / bioinformatics engineer",
    reviewerScore: 4.4,
    messages: [
      {
        content: `Yolanda Green
yolanda.green@gmail.com | (617) 555-3141 | Cambridge, MA

Senior Bioinformatics Engineer | Genomics Data | 8 years

Experience:

Senior Bioinformatics Engineer, Broad Institute (2020–Present)
Variant calling pipelines for UK Biobank whole-genome sequencing (500K genomes).
Scaled WGS pipeline from 1K to 50K samples/month on Terra platform.

Bioinformatics Engineer, Illumina (2016–2020)
BaseSpace Sequence Hub — NGS data analysis platform for 200K researchers.

Research Engineer intern, 23andMe (Summer 2015)

Education:
Ph.D. Computational Biology, UC Berkeley — 2016
B.S. Bioinformatics, UCSD — 2011

Skills: Python, Snakemake, Nextflow, WDL, R, Bioconductor, GATK, BWA, samtools, Hail, Terra, GCP, Docker, Spark, genomics data engineering`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-059",
    category: "pdf",
    persona: "PDF — AI safety researcher joining industry",
    reviewerScore: 4.5,
    messages: [
      {
        content: `Dr. Ethan Webb
ethan.webb.ai@gmail.com | Berkeley, CA

AI Safety Researcher | Alignment & Interpretability | Transitioning to Industry

Academic & Research Background:

Research Scientist (Postdoc), Center for Human-Compatible AI (CHAI), UC Berkeley (2022–2024)
Constitutional AI techniques for value alignment. Sole-authored ICML 2023 paper (Best Paper nominee).

PhD Computer Science, Stanford University (2017–2022)
Thesis: "Scalable Oversight Methods for Advanced AI Systems"
4 NeurIPS papers, 2 ICML papers, Advisor: Prof. P. Abbeel

Industry Experience:
Research Intern, Anthropic (Summer 2021) — Constitutional AI early work
Research Intern, DeepMind Safety (Summer 2020)

Education:
PhD CS, Stanford, 2022
B.S. Mathematics & CS, Harvard (summa cum laude), 2017

Skills: Python, PyTorch, JAX, RLHF, constitutional AI, interpretability, formal verification, mathematical reasoning, alignment theory`,
        isUser: true,
      },
    ],
  },
  {
    id: "pdf-060",
    category: "pdf",
    persona: "PDF — operations engineer, SRE with on-call heavy background",
    reviewerScore: 4.4,
    messages: [
      {
        content: `Raj Patel
raj.patel.sre@gmail.com | (669) 555-2468 | San Jose, CA

Staff Site Reliability Engineer | High-Traffic Systems | 10 years

Experience:

Staff SRE, LinkedIn (2019–Present)
On-call lead for LinkedIn search (850M members, 2B searches/day).
Drove 99.99% availability from 99.95% baseline in 2 years.
Led SRE chapter of 30 engineers. Defined SLI/SLO framework adopted company-wide.

Senior SRE, Uber (2015–2019)
On-call for ride dispatch system (100M weekly trips peak).
Designed circuit breaker pattern now standard across Uber's 2,000+ microservices.

SRE, Zynga (2013–2015)

Education:
B.S. Computer Engineering, San Jose State University — 2013

Skills: Go, Python, Prometheus, Grafana, PagerDuty, Kubernetes, Terraform, AWS, distributed systems, incident management, chaos engineering, SLIs/SLOs`,
        isUser: true,
      },
    ],
  },
];

// ===========================================================================
// EXPORT: combined gold dataset
// ===========================================================================

export const GOLD_DATASET: GoldCase[] = [
  ...chatNewGrads,
  ...chatMidSenior,
  ...chatCareerEdge,
  ...chatInternational,
  ...chatGapsFreelancers,
  ...chatNonTech,
  ...pasteCases,
  ...pasteExpanded,
  ...pdfCases,
  ...pdfExpanded,
];

export const GOLD_DATASET_STATS = {
  total: GOLD_DATASET.length,
  chat: GOLD_DATASET.filter((c) => c.category === "chat").length,
  paste: GOLD_DATASET.filter((c) => c.category === "paste").length,
  pdf: GOLD_DATASET.filter((c) => c.category === "pdf").length,
};
