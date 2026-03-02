/**
 * Synthetic "golden AI responses" for the generation quality KPI gate.
 *
 * These are hand-crafted to cover three categories:
 *   - 15 CLEAN responses  — valid JSON, schema-conformant, factually grounded
 *   - 10 HALLUCINATED responses — valid JSON, schema-conformant, but contain
 *       metrics/claims NOT present in the evidence messages
 *   - 5 MALFORMED responses — invalid JSON, truncated output, or missing
 *       required fields
 *
 * Each entry provides:
 *   id            – unique identifier
 *   category      – "clean" | "hallucinated" | "malformed"
 *   response      – the raw string an AI model would return
 *   evidenceMessages – the user messages that constitute ground truth
 *   expectedSchemaValid  – should schema validation pass?
 *   expectedHallucinated – should hallucination detection flag this?
 *   notes         – human-readable description
 */

export type GoldenCategory = "clean" | "hallucinated" | "malformed";

export interface GoldenAIResponse {
  id: string;
  category: GoldenCategory;
  response: string;
  evidenceMessages: Array<{ content: string; isUser: boolean }>;
  expectedSchemaValid: boolean;
  expectedHallucinated: boolean;
  notes: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function jsonStr(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, null, 2);
}

// ============================================================================
// SECTION 1: CLEAN RESPONSES (15)
// ============================================================================

const cleanResponses: GoldenAIResponse[] = [
  {
    id: "clean-001",
    category: "clean",
    response: jsonStr({
      title: "Software Engineer Resume",
      templateId: "signal-v1",
      summary:
        "Full-stack software engineer building web applications using React and Node.js.",
      skills: [
        { name: "React", level: "Advanced", visibility: "public" },
        { name: "Node.js", level: "Advanced", visibility: "public" },
        { name: "TypeScript", level: "Intermediate", visibility: "public" },
      ],
      experience: [
        {
          company: "Acme Corp",
          role: "Software Engineer",
          startDate: "2021",
          endDate: "2024",
          description:
            "Built and maintained customer-facing web applications using React and Node.js.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "MIT",
          degree: "B.S. Computer Science",
          startDate: "2017",
          endDate: "2021",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "alex@example.com", visibility: "public" },
        phone: { value: "555-0100", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      {
        content:
          "My name is Alex Johnson, email alex@example.com, phone 555-0100",
        isUser: true,
      },
      {
        content:
          "I worked at Acme Corp as a Software Engineer from 2021 to 2024. I built web applications using React and Node.js.",
        isUser: true,
      },
      {
        content: "I have a B.S. in Computer Science from MIT, graduated 2021",
        isUser: true,
      },
      { content: "Skills: React, Node.js, TypeScript", isUser: true },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: false,
    notes: "Clean response — standard engineer, all claims grounded",
  },
  {
    id: "clean-002",
    category: "clean",
    response: jsonStr({
      title: "Marketing Manager Resume",
      templateId: "signal-v1",
      summary:
        "Marketing manager with 5 years of experience in digital marketing and team leadership.",
      skills: [
        { name: "Digital Marketing", level: "Advanced", visibility: "public" },
        { name: "SEO", level: "Advanced", visibility: "public" },
        {
          name: "Google Analytics",
          level: "Intermediate",
          visibility: "public",
        },
      ],
      experience: [
        {
          company: "BrandFirst Inc",
          role: "Marketing Manager",
          startDate: "2019",
          endDate: "2024",
          description:
            "Led digital marketing campaigns and managed a team of 4 marketers.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "UCLA",
          degree: "B.A. Marketing",
          startDate: "2015",
          endDate: "2019",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "sarah.marketing@example.com", visibility: "public" },
        phone: { value: "555-0102", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      {
        content: "I'm Sarah, email sarah.marketing@example.com phone 555-0102",
        isUser: true,
      },
      {
        content:
          "I've been a Marketing Manager at BrandFirst Inc since 2019 until 2024. I led digital marketing campaigns and managed a team of 4 marketers.",
        isUser: true,
      },
      { content: "I studied Marketing at UCLA, B.A., 2015-2019", isUser: true },
      {
        content: "Skills: Digital Marketing, SEO, Google Analytics",
        isUser: true,
      },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: false,
    notes: "Clean — marketing persona, all claims grounded",
  },
  {
    id: "clean-003",
    category: "clean",
    response: jsonStr({
      title: "Data Scientist Resume",
      templateId: "signal-v1",
      summary: "Data scientist with skills in machine learning and Python.",
      skills: [
        { name: "Python", level: "Advanced", visibility: "public" },
        { name: "Machine Learning", level: "Advanced", visibility: "public" },
        { name: "SQL", level: "Intermediate", visibility: "public" },
        { name: "TensorFlow", level: "Intermediate", visibility: "public" },
      ],
      experience: [
        {
          company: "DataCo",
          role: "Data Scientist",
          startDate: "2020",
          endDate: "2024",
          description:
            "Built ML models for customer churn prediction using Python and TensorFlow.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "Stanford University",
          degree: "M.S. Data Science",
          startDate: "2018",
          endDate: "2020",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "datascientist@example.com", visibility: "public" },
        phone: { value: "555-0103", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      {
        content: "Email: datascientist@example.com, phone 555-0103",
        isUser: true,
      },
      {
        content:
          "I'm a Data Scientist at DataCo since 2020 to 2024. I built ML models for customer churn prediction using Python and TensorFlow.",
        isUser: true,
      },
      { content: "M.S. Data Science from Stanford, 2018-2020", isUser: true },
      {
        content: "Skills: Python, Machine Learning, SQL, TensorFlow",
        isUser: true,
      },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: false,
    notes: "Clean — data scientist, technical skills",
  },
  {
    id: "clean-004",
    category: "clean",
    response: jsonStr({
      title: "Graphic Designer Resume",
      templateId: "signal-v1",
      summary: "Creative graphic designer focused on branding and UI design.",
      skills: [
        { name: "Adobe Photoshop", level: "Advanced", visibility: "public" },
        { name: "Figma", level: "Advanced", visibility: "public" },
        { name: "Illustrator", level: "Intermediate", visibility: "public" },
      ],
      experience: [
        {
          company: "PixelPerfect Studio",
          role: "Graphic Designer",
          startDate: "2020",
          endDate: "2024",
          description:
            "Designed brand identities and UI mockups for SaaS clients.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "RISD",
          degree: "B.F.A. Graphic Design",
          startDate: "2016",
          endDate: "2020",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "designer@example.com", visibility: "public" },
        phone: { value: "555-0104", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      { content: "Email designer@example.com phone 555-0104", isUser: true },
      {
        content:
          "Graphic Designer at PixelPerfect Studio from 2020 to 2024. I designed brand identities and UI mockups for SaaS clients.",
        isUser: true,
      },
      {
        content: "B.F.A. Graphic Design from RISD, graduated 2020",
        isUser: true,
      },
      { content: "Adobe Photoshop, Figma, Illustrator", isUser: true },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: false,
    notes: "Clean — creative role, no numeric claims",
  },
  {
    id: "clean-005",
    category: "clean",
    response: jsonStr({
      title: "Product Manager Resume",
      templateId: "signal-v1",
      summary:
        "Product manager with experience shipping consumer products at early-stage startups.",
      skills: [
        { name: "Product Strategy", level: "Advanced", visibility: "public" },
        { name: "Agile", level: "Advanced", visibility: "public" },
        { name: "SQL", level: "Intermediate", visibility: "public" },
      ],
      experience: [
        {
          company: "LaunchPad Startup",
          role: "Product Manager",
          startDate: "2022",
          endDate: "2024",
          description:
            "Shipped 3 consumer features from ideation to launch using agile methodology.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "University of Michigan",
          degree: "B.S. Information Systems",
          startDate: "2018",
          endDate: "2022",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "pm@example.com", visibility: "public" },
        phone: { value: "555-0105", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      { content: "pm@example.com phone 555-0105", isUser: true },
      {
        content:
          "Product Manager at LaunchPad Startup 2022-2024. Shipped 3 consumer features from ideation to launch using agile methodology.",
        isUser: true,
      },
      {
        content:
          "B.S. Information Systems from University of Michigan, 2018-2022",
        isUser: true,
      },
      { content: "Skills: Product Strategy, Agile, SQL", isUser: true },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: false,
    notes: "Clean — PM role, numeric claim (3 features) is grounded",
  },
  {
    id: "clean-006",
    category: "clean",
    response: jsonStr({
      title: "DevOps Engineer Resume",
      templateId: "signal-v1",
      summary:
        "DevOps engineer specializing in CI/CD pipelines and cloud infrastructure.",
      skills: [
        { name: "AWS", level: "Advanced", visibility: "public" },
        { name: "Docker", level: "Advanced", visibility: "public" },
        { name: "Kubernetes", level: "Intermediate", visibility: "public" },
        { name: "Terraform", level: "Intermediate", visibility: "public" },
      ],
      experience: [
        {
          company: "CloudScale Inc",
          role: "DevOps Engineer",
          startDate: "2021",
          endDate: "2024",
          description:
            "Managed CI/CD pipelines for 12 microservices deployed on AWS EKS using Kubernetes.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "Georgia Tech",
          degree: "B.S. Computer Engineering",
          startDate: "2017",
          endDate: "2021",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "devops@example.com", visibility: "public" },
        phone: { value: "555-0106", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      { content: "devops@example.com, 555-0106", isUser: true },
      {
        content:
          "DevOps Engineer at CloudScale Inc 2021-2024. Managed CI/CD pipelines for 12 microservices deployed on AWS EKS using Kubernetes.",
        isUser: true,
      },
      {
        content: "B.S. Computer Engineering from Georgia Tech, 2017-2021",
        isUser: true,
      },
      { content: "AWS, Docker, Kubernetes, Terraform", isUser: true },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: false,
    notes: "Clean — DevOps, numeric claim (12 microservices) is grounded",
  },
  {
    id: "clean-007",
    category: "clean",
    response: jsonStr({
      title: "UX Designer Resume",
      templateId: "signal-v1",
      summary:
        "UX designer focused on user research and accessible design systems.",
      skills: [
        { name: "User Research", level: "Advanced", visibility: "public" },
        { name: "Figma", level: "Advanced", visibility: "public" },
        { name: "Accessibility", level: "Intermediate", visibility: "public" },
      ],
      experience: [
        {
          company: "AccessFirst Design",
          role: "UX Designer",
          startDate: "2022",
          endDate: "2024",
          description:
            "Conducted user research studies and designed accessibility-first components for a design system.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "Carnegie Mellon",
          degree: "M.Des. Interaction Design",
          startDate: "2020",
          endDate: "2022",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "ux@example.com", visibility: "public" },
        phone: { value: "555-0107", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      { content: "ux@example.com, phone 555-0107", isUser: true },
      {
        content:
          "UX Designer at AccessFirst Design 2022-2024. Conducted user research studies and designed accessibility-first components for a design system.",
        isUser: true,
      },
      {
        content: "M.Des. Interaction Design from Carnegie Mellon, 2020-2022",
        isUser: true,
      },
      { content: "Skills: User Research, Figma, Accessibility", isUser: true },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: false,
    notes: "Clean — UX designer, descriptive claims only",
  },
  {
    id: "clean-008",
    category: "clean",
    response: jsonStr({
      title: "Frontend Engineer Resume",
      templateId: "signal-v1",
      summary:
        "Frontend engineer with experience building responsive interfaces using React and CSS.",
      skills: [
        { name: "React", level: "Advanced", visibility: "public" },
        { name: "CSS", level: "Advanced", visibility: "public" },
        { name: "JavaScript", level: "Advanced", visibility: "public" },
      ],
      experience: [
        {
          company: "WebCraft LLC",
          role: "Frontend Engineer",
          startDate: "2020",
          endDate: "2024",
          description:
            "Built responsive web interfaces for e-commerce platform serving daily active users.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "University of Washington",
          degree: "B.S. Computer Science",
          startDate: "2016",
          endDate: "2020",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "frontend@example.com", visibility: "public" },
        phone: { value: "555-0108", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      { content: "frontend@example.com, 555-0108", isUser: true },
      {
        content:
          "Frontend Engineer at WebCraft LLC 2020-2024. Built responsive web interfaces for e-commerce platform serving daily active users.",
        isUser: true,
      },
      {
        content:
          "B.S. Computer Science from University of Washington, 2016-2020",
        isUser: true,
      },
      { content: "React, CSS, JavaScript", isUser: true },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: false,
    notes: "Clean — frontend engineer, no metrics to hallucinate",
  },
  {
    id: "clean-009",
    category: "clean",
    response: jsonStr({
      title: "Mobile Developer Resume",
      templateId: "signal-v1",
      summary: "Mobile developer building iOS apps using Swift.",
      skills: [
        { name: "Swift", level: "Advanced", visibility: "public" },
        { name: "iOS", level: "Advanced", visibility: "public" },
        { name: "Xcode", level: "Intermediate", visibility: "public" },
      ],
      experience: [
        {
          company: "AppSmith",
          role: "iOS Developer",
          startDate: "2022",
          endDate: "2024",
          description:
            "Developed and shipped 2 iOS apps to the App Store with over 10,000 downloads each.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "UC Berkeley",
          degree: "B.S. Electrical Engineering",
          startDate: "2018",
          endDate: "2022",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "iosdev@example.com", visibility: "public" },
        phone: { value: "555-0109", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      { content: "Email iosdev@example.com phone 555-0109", isUser: true },
      {
        content:
          "iOS Developer at AppSmith 2022-2024. Developed and shipped 2 iOS apps to the App Store with over 10,000 downloads each.",
        isUser: true,
      },
      {
        content: "B.S. Electrical Engineering from UC Berkeley 2018-2022",
        isUser: true,
      },
      { content: "Skills: Swift, iOS, Xcode", isUser: true },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: false,
    notes: "Clean — numeric claim (10,000 downloads) grounded in evidence",
  },
  {
    id: "clean-010",
    category: "clean",
    response: jsonStr({
      title: "Backend Engineer Resume",
      templateId: "signal-v1",
      summary:
        "Backend engineer with experience building APIs and microservices in Go and Python.",
      skills: [
        { name: "Go", level: "Advanced", visibility: "public" },
        { name: "Python", level: "Intermediate", visibility: "public" },
        { name: "PostgreSQL", level: "Intermediate", visibility: "public" },
      ],
      experience: [
        {
          company: "APIStar",
          role: "Backend Engineer",
          startDate: "2021",
          endDate: "2024",
          description:
            "Built REST APIs serving 500 requests per second using Go and PostgreSQL.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "Purdue University",
          degree: "B.S. Computer Science",
          startDate: "2017",
          endDate: "2021",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "backend@example.com", visibility: "public" },
        phone: { value: "555-0110", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      { content: "backend@example.com, 555-0110", isUser: true },
      {
        content:
          "Backend Engineer at APIStar 2021-2024. Built REST APIs serving 500 requests per second using Go and PostgreSQL.",
        isUser: true,
      },
      {
        content: "B.S. Computer Science from Purdue University 2017-2021",
        isUser: true,
      },
      { content: "Go, Python, PostgreSQL", isUser: true },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: false,
    notes: "Clean — numeric claim (500 rps) grounded",
  },
  {
    id: "clean-011",
    category: "clean",
    response: jsonStr({
      title: "Project Manager Resume",
      templateId: "signal-v1",
      summary:
        "Project manager with PMP certification and experience in agile delivery.",
      skills: [
        { name: "Project Management", level: "Advanced", visibility: "public" },
        { name: "Agile/Scrum", level: "Advanced", visibility: "public" },
        { name: "Jira", level: "Intermediate", visibility: "public" },
      ],
      experience: [
        {
          company: "DeliverCo",
          role: "Project Manager",
          startDate: "2019",
          endDate: "2024",
          description:
            "Managed delivery of 8 software projects on time using agile methodology.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "Northeastern University",
          degree: "M.S. Project Management",
          startDate: "2017",
          endDate: "2019",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "pm2@example.com", visibility: "public" },
        phone: { value: "555-0111", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      { content: "pm2@example.com phone 555-0111", isUser: true },
      {
        content:
          "Project Manager at DeliverCo 2019-2024. Managed delivery of 8 software projects on time using agile methodology. I have PMP certification.",
        isUser: true,
      },
      {
        content:
          "M.S. Project Management from Northeastern University, 2017-2019",
        isUser: true,
      },
      {
        content: "Skills: Project Management, Agile/Scrum, Jira",
        isUser: true,
      },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: false,
    notes: "Clean — PM, numeric (8 projects), certification grounded",
  },
  {
    id: "clean-012",
    category: "clean",
    response: jsonStr({
      title: "Security Engineer Resume",
      templateId: "signal-v1",
      summary:
        "Security engineer focused on application security and penetration testing.",
      skills: [
        {
          name: "Penetration Testing",
          level: "Advanced",
          visibility: "public",
        },
        { name: "OWASP", level: "Advanced", visibility: "public" },
        { name: "Python", level: "Intermediate", visibility: "public" },
      ],
      experience: [
        {
          company: "SecureTech",
          role: "Security Engineer",
          startDate: "2021",
          endDate: "2024",
          description:
            "Performed penetration tests on web applications and identified 45 vulnerabilities across client engagements.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "RIT",
          degree: "B.S. Cybersecurity",
          startDate: "2017",
          endDate: "2021",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "sec@example.com", visibility: "public" },
        phone: { value: "555-0112", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      { content: "sec@example.com 555-0112", isUser: true },
      {
        content:
          "Security Engineer at SecureTech 2021-2024. Performed penetration tests on web apps and identified 45 vulnerabilities across client engagements.",
        isUser: true,
      },
      { content: "B.S. Cybersecurity from RIT 2017-2021", isUser: true },
      { content: "Penetration Testing, OWASP, Python", isUser: true },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: false,
    notes: "Clean — security, numeric claim (45 vulns) grounded",
  },
  {
    id: "clean-013",
    category: "clean",
    response: jsonStr({
      title: "Technical Writer Resume",
      templateId: "signal-v1",
      summary:
        "Technical writer creating developer documentation and API guides.",
      skills: [
        { name: "Technical Writing", level: "Advanced", visibility: "public" },
        { name: "Markdown", level: "Advanced", visibility: "public" },
        {
          name: "API Documentation",
          level: "Intermediate",
          visibility: "public",
        },
      ],
      experience: [
        {
          company: "DocuGood",
          role: "Technical Writer",
          startDate: "2022",
          endDate: "2024",
          description:
            "Authored developer documentation for REST APIs and maintained a knowledge base.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "University of Oregon",
          degree: "B.A. English",
          startDate: "2018",
          endDate: "2022",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "writer@example.com", visibility: "public" },
        phone: { value: "555-0113", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      { content: "writer@example.com, 555-0113", isUser: true },
      {
        content:
          "Technical Writer at DocuGood 2022-2024. Authored developer documentation for REST APIs and maintained a knowledge base.",
        isUser: true,
      },
      {
        content: "B.A. English from University of Oregon 2018-2022",
        isUser: true,
      },
      {
        content: "Technical Writing, Markdown, API Documentation",
        isUser: true,
      },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: false,
    notes: "Clean — non-engineering role, descriptive only",
  },
  {
    id: "clean-014",
    category: "clean",
    response: jsonStr({
      title: "QA Engineer Resume",
      templateId: "signal-v1",
      summary:
        "QA engineer focused on automated testing using Selenium and Cypress.",
      skills: [
        { name: "Selenium", level: "Advanced", visibility: "public" },
        { name: "Cypress", level: "Advanced", visibility: "public" },
        { name: "JavaScript", level: "Intermediate", visibility: "public" },
      ],
      experience: [
        {
          company: "TestWell Inc",
          role: "QA Engineer",
          startDate: "2020",
          endDate: "2024",
          description:
            "Built automated test suites covering 200 test cases for a SaaS platform.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "Arizona State University",
          degree: "B.S. Software Engineering",
          startDate: "2016",
          endDate: "2020",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "qa@example.com", visibility: "public" },
        phone: { value: "555-0114", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      { content: "qa@example.com, 555-0114", isUser: true },
      {
        content:
          "QA Engineer at TestWell Inc 2020-2024. Built automated test suites covering 200 test cases for a SaaS platform.",
        isUser: true,
      },
      {
        content:
          "B.S. Software Engineering from Arizona State University 2016-2020",
        isUser: true,
      },
      { content: "Selenium, Cypress, JavaScript", isUser: true },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: false,
    notes: "Clean — QA, numeric claim (200 tests) grounded",
  },
  {
    id: "clean-015",
    category: "clean",
    response: jsonStr({
      title: "Full-Stack Developer Resume",
      templateId: "signal-v1",
      summary:
        "Full-stack developer building SaaS products with Next.js and PostgreSQL.",
      skills: [
        { name: "Next.js", level: "Advanced", visibility: "public" },
        { name: "PostgreSQL", level: "Intermediate", visibility: "public" },
        { name: "TypeScript", level: "Advanced", visibility: "public" },
      ],
      experience: [
        {
          company: "SaaSForge",
          role: "Full-Stack Developer",
          startDate: "2021",
          endDate: "2024",
          description:
            "Developed a multi-tenant SaaS platform handling 1,000 active users.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "University of Texas at Austin",
          degree: "B.S. Computer Science",
          startDate: "2017",
          endDate: "2021",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "fullstack@example.com", visibility: "public" },
        phone: { value: "555-0115", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      { content: "fullstack@example.com, 555-0115", isUser: true },
      {
        content:
          "Full-Stack Developer at SaaSForge 2021-2024. Developed a multi-tenant SaaS platform handling 1,000 active users.",
        isUser: true,
      },
      {
        content:
          "B.S. Computer Science from University of Texas at Austin 2017-2021",
        isUser: true,
      },
      { content: "Next.js, PostgreSQL, TypeScript", isUser: true },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: false,
    notes: "Clean — numeric claim (1,000 users) grounded",
  },
];

// ============================================================================
// SECTION 2: HALLUCINATED RESPONSES (10)
// ============================================================================

const hallucinatedResponses: GoldenAIResponse[] = [
  {
    id: "hallucinated-001",
    category: "hallucinated",
    response: jsonStr({
      title: "Software Engineer Resume",
      templateId: "signal-v1",
      summary:
        "Increased revenue by 40% through engineering optimizations and reduced page load time by 60%.",
      skills: [
        { name: "React", level: "Advanced", visibility: "public" },
        { name: "Node.js", level: "Intermediate", visibility: "public" },
      ],
      experience: [
        {
          company: "TechStart",
          role: "Software Engineer",
          startDate: "2022",
          endDate: "2024",
          description:
            "Led a team of 15 engineers to deliver a platform that reduced costs by $2M annually.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "MIT",
          degree: "B.S. Computer Science",
          startDate: "2018",
          endDate: "2022",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "dev@example.com", visibility: "public" },
        phone: { value: "555-0200", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      { content: "dev@example.com phone 555-0200", isUser: true },
      {
        content:
          "I'm a Software Engineer at TechStart since 2022. I work with React and Node.js on the frontend.",
        isUser: true,
      },
      { content: "B.S. CS from MIT 2018-2022", isUser: true },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: true,
    notes: "Hallucinated — 40%, 60%, $2M, 15 engineers never mentioned by user",
  },
  {
    id: "hallucinated-002",
    category: "hallucinated",
    response: jsonStr({
      title: "Marketing Manager Resume",
      templateId: "signal-v1",
      summary:
        "Award-winning marketing leader who grew organic traffic by 300% and managed a $5M budget.",
      skills: [
        { name: "Marketing", level: "Advanced", visibility: "public" },
        { name: "SEO", level: "Advanced", visibility: "public" },
      ],
      experience: [
        {
          company: "BrandCo",
          role: "Marketing Manager",
          startDate: "2020",
          endDate: "2024",
          description:
            "Spearheaded international expansion to 12 markets and achieved $10M in pipeline revenue.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "NYU",
          degree: "B.A. Marketing",
          startDate: "2016",
          endDate: "2020",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "marketer@example.com", visibility: "public" },
        phone: { value: "555-0201", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      { content: "marketer@example.com, 555-0201", isUser: true },
      {
        content:
          "Marketing Manager at BrandCo since 2020 to 2024. I did SEO and content marketing.",
        isUser: true,
      },
      { content: "NYU, B.A. Marketing 2016-2020", isUser: true },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: true,
    notes:
      "Hallucinated — 300% traffic, $5M budget, 12 markets, $10M pipeline fabricated",
  },
  {
    id: "hallucinated-003",
    category: "hallucinated",
    response: jsonStr({
      title: "Data Analyst Resume",
      templateId: "signal-v1",
      summary:
        "Expert data analyst who improved forecasting accuracy by 35% and saved the company $1.5M.",
      skills: [
        { name: "SQL", level: "Advanced", visibility: "public" },
        { name: "Python", level: "Intermediate", visibility: "public" },
        { name: "Tableau", level: "Intermediate", visibility: "public" },
      ],
      experience: [
        {
          company: "InsightCo",
          role: "Data Analyst",
          startDate: "2021",
          endDate: "2024",
          description: "Built dashboards using Tableau and wrote SQL queries.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "Penn State",
          degree: "B.S. Statistics",
          startDate: "2017",
          endDate: "2021",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "analyst@example.com", visibility: "public" },
        phone: { value: "555-0202", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      { content: "analyst@example.com, 555-0202", isUser: true },
      {
        content:
          "Data Analyst at InsightCo 2021-2024. Built dashboards using Tableau and wrote SQL queries.",
        isUser: true,
      },
      { content: "B.S. Statistics from Penn State 2017-2021", isUser: true },
      { content: "SQL, Python, Tableau", isUser: true },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: true,
    notes:
      "Hallucinated summary — 35% improvement and $1.5M saving fabricated. Description is clean.",
  },
  {
    id: "hallucinated-004",
    category: "hallucinated",
    response: jsonStr({
      title: "Sales Executive Resume",
      templateId: "signal-v1",
      summary:
        "Top-performing sales executive who consistently exceeded targets by 150% and closed $20M in deals.",
      skills: [
        { name: "Sales", level: "Advanced", visibility: "public" },
        { name: "CRM", level: "Intermediate", visibility: "public" },
        { name: "Negotiation", level: "Advanced", visibility: "public" },
      ],
      experience: [
        {
          company: "SellPro",
          role: "Sales Executive",
          startDate: "2019",
          endDate: "2024",
          description:
            "Managed enterprise accounts and generated $8M in annual recurring revenue.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "Indiana University",
          degree: "B.S. Business",
          startDate: "2015",
          endDate: "2019",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "sales@example.com", visibility: "public" },
        phone: { value: "555-0203", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      { content: "sales@example.com phone 555-0203", isUser: true },
      {
        content:
          "Sales Executive at SellPro 2019-2024. I managed enterprise accounts.",
        isUser: true,
      },
      { content: "Indiana University B.S. Business 2015-2019", isUser: true },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: true,
    notes: "Hallucinated — 150% target, $20M, $8M ARR all fabricated",
  },
  {
    id: "hallucinated-005",
    category: "hallucinated",
    response: jsonStr({
      title: "Cloud Architect Resume",
      templateId: "signal-v1",
      summary:
        "Recognized cloud architect who reduced infrastructure costs by 70% and achieved 99.99% uptime.",
      skills: [
        { name: "AWS", level: "Advanced", visibility: "public" },
        { name: "GCP", level: "Intermediate", visibility: "public" },
        { name: "Terraform", level: "Advanced", visibility: "public" },
      ],
      experience: [
        {
          company: "CloudNative Corp",
          role: "Cloud Architect",
          startDate: "2020",
          endDate: "2024",
          description:
            "Architected multi-region cloud deployment serving 50M users globally.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "University of Illinois",
          degree: "M.S. Computer Science",
          startDate: "2018",
          endDate: "2020",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "cloud@example.com", visibility: "public" },
        phone: { value: "555-0204", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      { content: "cloud@example.com, 555-0204", isUser: true },
      {
        content:
          "Cloud Architect at CloudNative Corp 2020-2024. I work with AWS and Terraform.",
        isUser: true,
      },
      {
        content: "M.S. CS from University of Illinois 2018-2020",
        isUser: true,
      },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: true,
    notes:
      "Hallucinated — 70% cost reduction, 99.99% uptime, 50M users fabricated",
  },
  {
    id: "hallucinated-006",
    category: "hallucinated",
    response: jsonStr({
      title: "HR Manager Resume",
      templateId: "signal-v1",
      summary:
        "Experienced HR manager who reduced employee turnover by 25% and led a team of 20 recruiters.",
      skills: [
        { name: "Recruiting", level: "Advanced", visibility: "public" },
        { name: "HRIS", level: "Intermediate", visibility: "public" },
        { name: "Employee Relations", level: "Advanced", visibility: "public" },
      ],
      experience: [
        {
          company: "PeopleCo",
          role: "HR Manager",
          startDate: "2018",
          endDate: "2024",
          description: "Managed HR operations for a 500-person company.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "Ohio State",
          degree: "B.A. Human Resources",
          startDate: "2014",
          endDate: "2018",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "hr@example.com", visibility: "public" },
        phone: { value: "555-0205", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      { content: "hr@example.com, 555-0205", isUser: true },
      {
        content:
          "HR Manager at PeopleCo since 2018 to 2024. I manage HR operations.",
        isUser: true,
      },
      {
        content: "B.A. Human Resources from Ohio State 2014-2018",
        isUser: true,
      },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: true,
    notes:
      "Hallucinated — 25% turnover reduction, 20 recruiters, 500-person company",
  },
  {
    id: "hallucinated-007",
    category: "hallucinated",
    response: jsonStr({
      title: "Machine Learning Engineer Resume",
      templateId: "signal-v1",
      summary:
        "ML engineer who improved model accuracy by 22% and deployed models processing 1M predictions daily.",
      skills: [
        { name: "Python", level: "Advanced", visibility: "public" },
        { name: "PyTorch", level: "Advanced", visibility: "public" },
        { name: "MLOps", level: "Intermediate", visibility: "public" },
      ],
      experience: [
        {
          company: "AILab",
          role: "ML Engineer",
          startDate: "2021",
          endDate: "2024",
          description:
            "Trained and deployed machine learning models for recommendation systems.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "Columbia University",
          degree: "M.S. Machine Learning",
          startDate: "2019",
          endDate: "2021",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "ml@example.com", visibility: "public" },
        phone: { value: "555-0206", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      { content: "ml@example.com 555-0206", isUser: true },
      {
        content:
          "ML Engineer at AILab 2021-2024. I trained and deployed machine learning models for recommendation systems.",
        isUser: true,
      },
      {
        content: "M.S. Machine Learning from Columbia 2019-2021",
        isUser: true,
      },
      { content: "Python, PyTorch, MLOps", isUser: true },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: true,
    notes:
      "Hallucinated summary — 22% accuracy, 1M predictions fabricated. Description is clean.",
  },
  {
    id: "hallucinated-008",
    category: "hallucinated",
    response: jsonStr({
      title: "Accountant Resume",
      templateId: "signal-v1",
      summary:
        "CPA-certified accountant who streamlined reporting processes saving 200 hours annually.",
      skills: [
        { name: "Accounting", level: "Advanced", visibility: "public" },
        { name: "Excel", level: "Advanced", visibility: "public" },
        { name: "QuickBooks", level: "Intermediate", visibility: "public" },
      ],
      experience: [
        {
          company: "NumbersCo",
          role: "Staff Accountant",
          startDate: "2020",
          endDate: "2024",
          description:
            "Managed monthly close process and prepared financial statements for a $50M company.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "University of Florida",
          degree: "B.S. Accounting",
          startDate: "2016",
          endDate: "2020",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "accountant@example.com", visibility: "public" },
        phone: { value: "555-0207", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      { content: "accountant@example.com, 555-0207", isUser: true },
      {
        content:
          "Staff Accountant at NumbersCo 2020-2024. I manage the monthly close and prepare financial statements.",
        isUser: true,
      },
      {
        content: "B.S. Accounting from University of Florida 2016-2020",
        isUser: true,
      },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: true,
    notes:
      "Hallucinated — CPA certification, 200 hours, $50M company fabricated",
  },
  {
    id: "hallucinated-009",
    category: "hallucinated",
    response: jsonStr({
      title: "Content Strategist Resume",
      templateId: "signal-v1",
      summary:
        "Content strategist who increased engagement by 85% and grew the blog audience to 500K monthly readers.",
      skills: [
        { name: "Content Strategy", level: "Advanced", visibility: "public" },
        { name: "SEO", level: "Intermediate", visibility: "public" },
        { name: "Analytics", level: "Intermediate", visibility: "public" },
      ],
      experience: [
        {
          company: "ContentHub",
          role: "Content Strategist",
          startDate: "2021",
          endDate: "2024",
          description:
            "Created content plans and managed the editorial calendar.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "USC",
          degree: "B.A. Communications",
          startDate: "2017",
          endDate: "2021",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "content@example.com", visibility: "public" },
        phone: { value: "555-0208", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      { content: "content@example.com 555-0208", isUser: true },
      {
        content:
          "Content Strategist at ContentHub 2021-2024. I created content plans and managed the editorial calendar.",
        isUser: true,
      },
      { content: "B.A. Communications from USC 2017-2021", isUser: true },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: true,
    notes: "Hallucinated — 85% engagement, 500K readers fabricated",
  },
  {
    id: "hallucinated-010",
    category: "hallucinated",
    response: jsonStr({
      title: "Solutions Architect Resume",
      templateId: "signal-v1",
      summary:
        "Solutions architect with expertise in enterprise migrations saving clients $15M in total.",
      skills: [
        { name: "Architecture", level: "Advanced", visibility: "public" },
        { name: "AWS", level: "Advanced", visibility: "public" },
        { name: "Azure", level: "Intermediate", visibility: "public" },
      ],
      experience: [
        {
          company: "ConsultPro",
          role: "Solutions Architect",
          startDate: "2019",
          endDate: "2024",
          description:
            "Designed cloud migration strategies for Fortune 500 clients.",
          visibility: "public",
        },
      ],
      education: [
        {
          institution: "Virginia Tech",
          degree: "M.S. Information Technology",
          startDate: "2017",
          endDate: "2019",
          visibility: "public",
        },
      ],
      contact: {
        email: { value: "architect@example.com", visibility: "public" },
        phone: { value: "555-0209", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      { content: "architect@example.com, 555-0209", isUser: true },
      {
        content:
          "Solutions Architect at ConsultPro 2019-2024. I design cloud migration strategies.",
        isUser: true,
      },
      { content: "M.S. IT from Virginia Tech 2017-2019", isUser: true },
    ],
    expectedSchemaValid: true,
    expectedHallucinated: true,
    notes: "Hallucinated — $15M savings, Fortune 500 fabricated",
  },
];

// ============================================================================
// SECTION 3: MALFORMED RESPONSES (5)
// ============================================================================

const malformedResponses: GoldenAIResponse[] = [
  {
    id: "malformed-001",
    category: "malformed",
    response:
      'Here is your resume:\n```json\n{"title": "Resume", "summary": "A great engineer"',
    evidenceMessages: [{ content: "I'm an engineer", isUser: true }],
    expectedSchemaValid: false,
    expectedHallucinated: false,
    notes: "Malformed — truncated JSON, never closes the brace",
  },
  {
    id: "malformed-002",
    category: "malformed",
    response:
      "I'd be happy to help you create a resume! Here are some questions I have...",
    evidenceMessages: [{ content: "Create my resume", isUser: true }],
    expectedSchemaValid: false,
    expectedHallucinated: false,
    notes: "Malformed — conversational text, no JSON at all",
  },
  {
    id: "malformed-003",
    category: "malformed",
    response: jsonStr({
      title: "Resume",
      summary: "An engineer.",
      skills: [],
      experience: [],
    }),
    evidenceMessages: [
      {
        content:
          "I'm an engineer at Google. email: test@google.com phone 555-0300",
        isUser: true,
      },
    ],
    expectedSchemaValid: false,
    expectedHallucinated: false,
    notes:
      "Malformed — valid JSON but missing required fields (contact, templateId, skills min 1)",
  },
  {
    id: "malformed-004",
    category: "malformed",
    response: `{"title": "Resume", "templateId": "signal-v1", summary: bad json here`,
    evidenceMessages: [{ content: "I'm a designer", isUser: true }],
    expectedSchemaValid: false,
    expectedHallucinated: false,
    notes: "Malformed — invalid JSON syntax (unquoted key, no value)",
  },
  {
    id: "malformed-005",
    category: "malformed",
    response: jsonStr({
      title: "",
      templateId: "signal-v1",
      summary: "",
      skills: [{ name: "", level: "", visibility: "public" }],
      experience: [
        {
          company: "",
          role: "",
          startDate: "",
          description: "",
          visibility: "public",
        },
      ],
      education: [],
      contact: {
        email: { value: "notanemail", visibility: "public" },
        phone: { value: "", visibility: "masked" },
      },
      projects: [],
    }),
    evidenceMessages: [
      { content: "I'm John at TechCorp, john@techcorp.com", isUser: true },
    ],
    expectedSchemaValid: false,
    expectedHallucinated: false,
    notes:
      "Malformed — all required string fields are empty, invalid email format",
  },
];

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const GOLDEN_AI_RESPONSES: GoldenAIResponse[] = [
  ...cleanResponses,
  ...hallucinatedResponses,
  ...malformedResponses,
];

export const GOLDEN_STATS = {
  total: GOLDEN_AI_RESPONSES.length,
  clean: cleanResponses.length,
  hallucinated: hallucinatedResponses.length,
  malformed: malformedResponses.length,
};
