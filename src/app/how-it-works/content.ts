import {
  Brain,
  Zap,
  Sparkles,
  Target,
  Search,
  MessageSquare,
  Briefcase,
  UserCheck,
} from "lucide-react";
import type {
  AgentDefinition,
  BeforeAfterExample,
  DemoResumePreview,
  FlowStepDefinition,
} from "./types";

export const jobseekerAgents: AgentDefinition[] = [
  {
    id: "research",
    name: "The Scout",
    nickname: "Research Agent",
    modelFree: "gemini-2.5-flash-lite",
    modelPremium: "gemini-2.5-flash",
    icon: Target,
    color: "purple",
    description:
      "The reconnaissance agent that digs deep into company culture, core values, and industry trends to find the requirements hidden between the lines of a job post.",
    whatItDoes: [
      "Analyzes company mission and values",
      "Researches industry-specific trends",
      "Identifies cultural fit indicators",
    ],
  },
  {
    id: "planning",
    name: "The Architect",
    nickname: "Planning Agent",
    modelFree: "gemini-2.5-flash-lite",
    modelPremium: "gemini-2.5-flash",
    icon: Brain,
    color: "blue",
    description:
      "The strategic brain that synthesizes research data and job requirements to create a personalized multi-point roadmap for your resume.",
    whatItDoes: [
      "Reads and understands the job requirements",
      "Identifies gaps between your resume and the target role",
      "Creates a tailored strategy to maximize your match",
    ],
  },
  {
    id: "writing",
    name: "The Writer",
    nickname: "Execution & Polish Agent",
    modelFree: "gemini-2.5-flash-lite",
    modelPremium: "gemini-2.5-flash",
    icon: Zap,
    color: "amber",
    description:
      "The master storyteller that rewrites your content with high-impact language, ensuring perfect tone, brevity, and punchiness in a single unified pass.",
    whatItDoes: [
      "Rewrites experience with action-driven language",
      "Refines tone and professional flow",
      "Optimizes for maximum brevity and ATS compatibility",
    ],
  },
  {
    id: "auditor",
    name: "The Auditor",
    nickname: "Validation & Design Agent",
    modelFree: "gemini-2.5-flash-lite",
    modelPremium: "gemini-2.5-flash",
    icon: Sparkles,
    color: "green",
    description:
      "The quality control specialist that fact-checks the final result against requirements and intelligently selects the perfect visual template for your career level.",
    whatItDoes: [
      "Prevents AI hallucinations and verifies goals",
      "Automatically selects the best visual template",
      "Ensures zero errors before you see the final result",
    ],
  },
];

export const recruiterAgents: AgentDefinition[] = [
  {
    id: "requirement-agent",
    name: "Requirement Agent",
    nickname: "The Listener",
    modelFree: "gemini-2.5-flash-lite",
    modelPremium: "gemini-2.5-pro",
    icon: MessageSquare,
    color: "blue",
    description:
      "The intelligent conversation agent that understands your hiring needs in natural language, extracts key requirements, and prepares precise search criteria for the talent database.",
    whatItDoes: [
      "Understands natural language job requirements",
      "Extracts must-have skills, experience levels, and qualifications",
      "Translates recruiter intent into structured search parameters",
      "Asks clarifying questions when requirements are ambiguous",
    ],
  },
  {
    id: "smart-search",
    name: "Smart Search Agent",
    nickname: "The Matchmaker",
    modelFree: "gemini-2.5-flash-lite",
    modelPremium: "gemini-2.5-pro",
    icon: Search,
    color: "purple",
    description:
      "The intelligent search engine that queries the candidate database, understands candidate profiles deeply, and ranks matches by relevance to your requirements.",
    whatItDoes: [
      "Searches database with semantic understanding of skills and experience",
      "Analyzes candidate profiles for relevant achievements and projects",
      "Calculates match scores based on requirement alignment",
      "Provides clear explanations for why each candidate is a good match",
    ],
  },
];

export const jobseekerBeforeAfterExamples: BeforeAfterExample[] = [
  {
    category: "Experience Statement",
    before: "Worked on various projects and helped the team",
    after:
      "Led 3 cross-functional teams to deliver a design system adopted by 1M+ users, reducing development time by 40%",
    improvement: "Vague -> Specific with impact metrics",
  },
  {
    category: "Technical Skills",
    before: "Good at Python and some machine learning stuff",
    after:
      "Built production ML pipelines processing 10M+ daily predictions using Python, TensorFlow, and AWS SageMaker",
    improvement: "Casual -> Professional with scale",
  },
  {
    category: "Leadership",
    before: "Managed a few people",
    after:
      "Scaled engineering team from 4 to 12 engineers across 3 time zones while maintaining 95% retention rate",
    improvement: "Generic -> Quantified growth story",
  },
];

export const recruiterBeforeAfterExamples: BeforeAfterExample[] = [
  {
    category: "Candidate Search",
    before:
      "Search: 'Java engineer 5+ years' -> Scroll through 200+ profiles, manually read each resume, guess which ones might be good fits",
    after:
      "Search: 'Looking for Java engineer with 5+ years experience in distributed systems' -> AI analyzes all resumes, understands context, and returns 'Top Match: Sarah Chen (94% match) - 7 years Java, led microservices migration at Scale Corp, built high-throughput payment systems'",
    improvement: "Manual guesswork -> AI-powered precision matching",
  },
  {
    category: "Outreach Message",
    before:
      "Hi, we have an exciting opportunity. Please check it out and let me know if you're interested.",
    after:
      "Hi Sarah, your work scaling the Stripe payments team from 8 to 40 engineers caught my attention. We're building something similar at Acme-would love 15 mins to share why our mission might resonate with you.",
    improvement: "Generic spam -> Personalized & specific",
  },
  {
    category: "Candidate Screening",
    before: "Manually review 200 resumes over 3 days",
    after:
      "AI-powered screening ranks 200 candidates in 30 seconds with 94% accuracy vs. human reviewers",
    improvement: "Time-consuming -> Instant insights",
  },
  {
    category: "Interview Preparation",
    before: "Quick skim of resume 5 minutes before the call",
    after:
      "Detailed candidate brief with 10 tailored questions, key achievements to discuss, and potential red flags to probe",
    improvement: "Unprepared -> Fully briefed",
  },
];

export const jobseekerFlowSteps: FlowStepDefinition[] = [
  {
    label: "Your Resume",
    sublabel: "+ Job Description",
    icon: Target,
    isFirst: true,
  },
  {
    label: "The Scout",
    sublabel: "Research",
    icon: Target,
    color: "purple",
  },
  {
    label: "The Architect",
    sublabel: "Strategy",
    icon: Brain,
    color: "blue",
  },
  {
    label: "The Writer",
    sublabel: "Writing & Polish",
    icon: Zap,
    color: "amber",
  },
  {
    label: "The Auditor",
    sublabel: "Final Audit",
    icon: Sparkles,
    color: "green",
  },
  {
    label: "Enhanced Resume",
    sublabel: "Interview Ready",
    icon: Sparkles,
    isLast: true,
  },
];

export const recruiterFlowSteps: FlowStepDefinition[] = [
  {
    label: "Job Opening",
    sublabel: "+ Requirements",
    icon: Briefcase,
    isFirst: true,
  },
  {
    label: "Requirement",
    sublabel: "Understanding",
    icon: MessageSquare,
    color: "blue",
  },
  {
    label: "Smart Search",
    sublabel: "Matching",
    icon: Search,
    color: "purple",
  },
  {
    label: "Hired!",
    sublabel: "Success",
    icon: UserCheck,
    isLast: true,
  },
];

export const demoResumes: DemoResumePreview[] = [
  { id: "1", title: "Senior Software Engineer", color: "blue" },
  { id: "4", title: "Full Stack Engineer", color: "indigo" },
  { id: "23", title: "Product Manager", color: "purple" },
  { id: "24", title: "Executive", color: "rose" },
];
