import { DashboardResume } from "@/types";

export const diverseDemoResumes11: Record<string, DashboardResume> = {
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
