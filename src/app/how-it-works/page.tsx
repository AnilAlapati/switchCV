"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Brain,
  Zap,
  ArrowRight,
  Sparkles,
  Target,
  Users,
  FileText,
  Palette,
  Search,
  BarChart3,
  Mail,
  GitBranch,
  MessageSquare,
  Briefcase,
  Filter,
  UserCheck,
} from "lucide-react";

// Hook to detect if user prefers reduced motion
function usePrefersReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersReduced;
}

type UserMode = "jobseeker" | "recruiter";

// ==================== JOBSEEKER AGENTS ====================
const jobseekerAgents = [
  {
    id: "research",
    name: "Research Agent",
    nickname: "The Scout",
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
    name: "Planning Agent",
    nickname: "The Strategist",
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
    id: "execution",
    name: "Execution Agent",
    nickname: "The Writer",
    modelFree: "gemini-2.5-flash-lite",
    modelPremium: "gemini-2.5-flash",
    icon: Zap,
    color: "amber",
    description:
      "The high-speed writer that rewrites your resume content following the strategic plan, transforming generic statements into powerful achievements.",
    whatItDoes: [
      "Rewrites experience with action-driven language",
      "Quantifies achievements with metrics where possible",
      "Optimizes keywords for ATS compatibility",
    ],
  },
  {
    id: "validation",
    name: "Validation Agent",
    nickname: "The Auditor",
    modelFree: "gemini-2.5-flash-lite",
    modelPremium: "gemini-2.5-flash",
    icon: Sparkles,
    color: "green",
    description:
      "The quality control agent that fact-checks the execution against the original requirements and strategic plan, ensuring zero hallucinations.",
    whatItDoes: [
      "Verifies ATS score improvement",
      "Ensures all strategic goals were met",
      "Prevents AI hallucinations",
    ],
  },
  {
    id: "polish",
    name: "Polish Agent",
    nickname: "The Editor",
    modelFree: "gemini-2.5-flash-lite",
    modelPremium: "gemini-2.5-flash",
    icon: Users,
    color: "rose",
    description:
      "The final editor that refines tone, brevity, and punchiness. It ensures your resume sounds professional, human, and impactful.",
    whatItDoes: [
      "Refines tone and professional flow",
      "Optimizes for maximum brevity",
      "Ensures a consistent 'active' voice",
    ],
  },
  {
    id: "template-selector",
    name: "Template Selector Agent",
    nickname: "The Designer",
    modelFree: "gemini-2.5-flash-lite",
    modelPremium: "gemini-2.5-flash",
    icon: Palette,
    color: "indigo",
    description:
      "The design intelligence that analyzes your career profile, experience level, and industry to select the perfect visual template that showcases your story.",
    whatItDoes: [
      "Evaluates seniority level and career stage",
      "Matches industry standards to template styles",
      "Selects from 8 premium templates (Standard, Modern, Executive, Masonry, Bento, Terminal, Editorial, Noir)",
    ],
  },
];

// ==================== RECRUITER AGENTS ====================
const recruiterAgents = [
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

const beforeAfterExamples = [
  {
    category: "Experience Statement",
    before: "Worked on various projects and helped the team",
    after:
      "Led 3 cross-functional teams to deliver a design system adopted by 1M+ users, reducing development time by 40%",
    improvement: "Vague → Specific with impact metrics",
  },
  {
    category: "Technical Skills",
    before: "Good at Python and some machine learning stuff",
    after:
      "Built production ML pipelines processing 10M+ daily predictions using Python, TensorFlow, and AWS SageMaker",
    improvement: "Casual → Professional with scale",
  },
  {
    category: "Leadership",
    before: "Managed a few people",
    after:
      "Scaled engineering team from 4 to 12 engineers across 3 time zones while maintaining 95% retention rate",
    improvement: "Generic → Quantified growth story",
  },
];

// Before/After examples for recruiters
const recruiterBeforeAfterExamples = [
  {
    category: "Candidate Search",
    before:
      "Search: 'Java engineer 5+ years' → Scroll through 200+ profiles, manually read each resume, guess which ones might be good fits",
    after:
      "Search: 'Looking for Java engineer with 5+ years experience in distributed systems' → AI analyzes all resumes, understands context, and returns 'Top Match: Sarah Chen (94% match) - 7 years Java, led microservices migration at Scale Corp, built high-throughput payment systems'",
    improvement: "Manual guesswork → AI-powered precision matching",
  },
  {
    category: "Outreach Message",
    before:
      "Hi, we have an exciting opportunity. Please check it out and let me know if you're interested.",
    after:
      "Hi Sarah, your work scaling the Stripe payments team from 8 to 40 engineers caught my attention. We're building something similar at Acme—would love 15 mins to share why our mission might resonate with you.",
    improvement: "Generic spam → Personalized & specific",
  },
  {
    category: "Candidate Screening",
    before: "Manually review 200 resumes over 3 days",
    after:
      "AI-powered screening ranks 200 candidates in 30 seconds with 94% accuracy vs. human reviewers",
    improvement: "Time-consuming → Instant insights",
  },
  {
    category: "Interview Preparation",
    before: "Quick skim of resume 5 minutes before the call",
    after:
      "Detailed candidate brief with 10 tailored questions, key achievements to discuss, and potential red flags to probe",
    improvement: "Unprepared → Fully briefed",
  },
];

export default function HowItWorksPage() {
  const [mode, setMode] = useState<UserMode>("jobseeker");
  const agents = mode === "jobseeker" ? jobseekerAgents : recruiterAgents;
  const examples =
    mode === "jobseeker" ? beforeAfterExamples : recruiterBeforeAfterExamples;

  return (
    <main className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-black/10 py-4 px-6 md:px-12">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>
          <Link
            href="/auth?mode=signup"
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            Try it Free →
          </Link>
        </div>
      </header>

      {/* Mode Toggle */}
      <section className="py-6 px-6 md:px-12 border-b border-black/10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-gray-500 mr-2">I am a:</span>
            <div className="inline-flex bg-gray-100 rounded-lg p-1 border border-black/10">
              <button
                onClick={() => setMode("jobseeker")}
                className={`px-5 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${mode === "jobseeker"
                  ? "bg-black text-white shadow-sm"
                  : "text-gray-600 hover:text-black"
                  }`}
              >
                <Briefcase className="w-4 h-4" />
                Job Seeker
              </button>
              <button
                onClick={() => setMode("recruiter")}
                className={`px-5 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${mode === "recruiter"
                  ? "bg-black text-white shadow-sm"
                  : "text-gray-600 hover:text-black"
                  }`}
              >
                <UserCheck className="w-4 h-4" />
                Recruiter
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="py-16 md:py-24 px-6 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <motion.span
            key={mode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs font-mono font-bold uppercase tracking-widest text-gray-400 mb-4 block"
          >
            {mode === "jobseeker" ? "Under the Hood" : "Recruiter Intelligence"}
          </motion.span>
          <motion.h1
            key={`title-${mode}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-serif font-bold tracking-tight text-black mb-6"
          >
            {mode === "jobseeker"
              ? "How Our AI Agents Work"
              : "AI-Powered Recruiting"}
          </motion.h1>
          <motion.p
            key={`desc-${mode}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-600 font-light max-w-2xl mx-auto"
          >
            {mode === "jobseeker"
              ? "Six specialized AI agents collaborate to transform your resume—researching, strategizing, writing, validating, polishing, and designing. Together, they produce results no single AI can match."
              : "Two intelligent agents work together to streamline your recruiting—one understands your requirements in natural language, the other searches and analyzes candidate profiles to find the best matches."}
          </motion.p>
        </div>
      </section>

      {/* Animated Flow Diagram */}
      <AnimatedFlowDiagram mode={mode} />

      {/* Before/After Section - THE KEY SELLING POINT (Jobseekers only) */}
      {mode === "jobseeker" && (
        <section className="py-16 md:py-24 px-6 md:px-12 bg-[#F5F5F0]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
                See the Difference
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                Real examples of how our agents transform vague statements into compelling, quantified achievements.
              </p>
            </div>

            <div className="space-y-8">
              {examples.map((example, index) => (
                <motion.div
                  key={`${mode}-${example.category}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="bg-white rounded-xl border border-black/10 overflow-hidden shadow-sm"
                >
                  <div className="px-6 py-3 bg-gray-50 border-b border-black/5">
                    <span className="text-xs font-mono font-bold uppercase tracking-widest text-gray-500">
                      {example.category}
                    </span>
                  </div>
                  <div className="p-6 grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">
                        BEFORE
                      </span>
                      <p className="text-gray-500 line-through italic">
                        &quot;{example.before}&quot;
                      </p>
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                        AFTER
                      </span>
                      <p className="text-black font-medium">
                        &quot;{example.after}&quot;
                      </p>
                    </div>
                  </div>
                  <div className="px-6 py-3 bg-blue-50 border-t border-blue-100">
                    <span className="text-sm text-blue-700 font-medium flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      {example.improvement}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Demo Resume Links */}
            <DemoResumeCarousel />

          </div>
        </section>
      )}

      {/* Recruiter AI Search Demo Section */}
      {mode === "recruiter" && (
        <section className="py-16 md:py-24 px-6 md:px-12 bg-[#F5F5F0]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
                See How Our AI Finds the Best Match
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                When you search, our agents don&apos;t just match keywords—they deeply understand each resume and rank candidates by true fit.
              </p>
            </div>

            {/* Search Query Example */}
            <div className="bg-white rounded-xl border border-black/10 overflow-hidden shadow-lg mb-6">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-indigo-50 border-b border-black/5">
                <div className="flex items-center gap-3">
                  <Search className="w-5 h-5 text-gray-700" />
                  <span className="text-sm font-mono text-gray-500">Your Search Query:</span>
                </div>
                <p className="mt-2 text-lg font-medium text-gray-900">
                  &quot;Looking for a Java engineer with 5+ years experience in distributed systems and microservices&quot;
                </p>
              </div>

              {/* Agent Processing Steps */}
              <div className="px-6 py-4 bg-gray-50 border-b border-black/5">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full">
                    <MessageSquare className="w-4 h-4" />
                    Requirement Agent parses intent
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-400 hidden sm:block" />
                  <span className="flex items-center gap-2 bg-gray-200 text-gray-800 px-3 py-1.5 rounded-full">
                    <Search className="w-4 h-4" />
                    Smart Search Agent scans 500+ resumes
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-400 hidden sm:block" />
                  <span className="flex items-center gap-2 bg-black text-white px-3 py-1.5 rounded-full">
                    <BarChart3 className="w-4 h-4" />
                    AI ranks by true fit
                  </span>
                </div>
              </div>

              {/* Results */}
              <div className="p-6">
                <div className="text-xs font-mono font-bold uppercase tracking-widest text-gray-400 mb-4">
                  Top Matches (from 500+ candidates)
                </div>

                <div className="space-y-4">
                  {/* Top Match */}
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-gray-50 rounded-lg border-2 border-black">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-bold">
                          SC
                        </div>
                        <div>
                          <span className="font-bold text-gray-900">Sarah Chen</span>
                          <span className="text-sm text-gray-500 ml-2">Senior Software Engineer</span>
                        </div>
                      </div>
                      <span className="bg-black text-white text-sm font-bold px-3 py-1 rounded-full">
                        94% Match
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong className="text-gray-800">Why this match:</strong> 7 years Java experience, led microservices migration at Scale Corp processing 2M daily transactions, expertise in Kafka and distributed caching
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">Java 7+ yrs ✓</span>
                      <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">Distributed Systems ✓</span>
                      <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">Microservices ✓</span>
                      <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">Leadership ✓</span>
                    </div>
                  </div>

                  {/* Second Match */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold">
                          MR
                        </div>
                        <div>
                          <span className="font-bold text-gray-900">Marcus Rodriguez</span>
                          <span className="text-sm text-gray-500 ml-2">Backend Engineer</span>
                        </div>
                      </div>
                      <span className="bg-gray-700 text-white text-sm font-bold px-3 py-1 rounded-full">
                        87% Match
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong className="text-gray-800">Why this match:</strong> 5 years Java, strong Spring Boot and AWS experience, built event-driven architecture at FinTech startup
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded">Java 5 yrs ✓</span>
                      <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded">Distributed Systems ✓</span>
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Microservices (partial)</span>
                    </div>
                  </div>

                  {/* Third Match */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold">
                          AK
                        </div>
                        <div>
                          <span className="font-bold text-gray-900">Aisha Kumar</span>
                          <span className="text-sm text-gray-500 ml-2">Full Stack Developer</span>
                        </div>
                      </div>
                      <span className="bg-gray-600 text-white text-sm font-bold px-3 py-1 rounded-full">
                        82% Match
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong className="text-gray-800">Why this match:</strong> 6 years Java/Kotlin, Docker & Kubernetes expert, designed service mesh for e-commerce platform handling 100k concurrent users
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded">Java 6 yrs ✓</span>
                      <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded">Microservices ✓</span>
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Distributed (learning)</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-800 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      <strong>AI Insight:</strong> Sarah Chen&apos;s profile shows she scaled a payments system similar to your requirements—consider asking about her approach to handling distributed transactions.
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <p className="text-center text-sm text-gray-500 mt-4">
              Our agents analyze experience, skills, projects, and achievements—not just keyword matching
            </p>
          </div>
        </section>
      )}

      {/* Agent Cards */}
      <section className="py-16 md:py-24 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              {mode === "jobseeker"
                ? "Meet Your AI Team"
                : "Your AI Recruiting Squad"}
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              {mode === "jobseeker"
                ? "Each agent specializes in a specific task. Together, they deliver results that surpass any single-shot AI."
                : "Six specialized agents work in harmony to transform your recruiting process—from sourcing to hiring."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {agents.map((agent, index) => (
              <AgentCard
                key={`${mode}-${agent.id}`}
                agent={agent}
                delay={index * 0.1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Model Selection Explainer */}
      <section className="py-16 md:py-24 px-6 md:px-12 bg-[#F5F5F0] border-y border-black/10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              Smart Model Selection
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              We use the right model for each task—powerful reasoning for
              strategy, high-speed execution for writing.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-black/10">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-gray-400" />
                <span className="font-bold text-lg">Free Tier</span>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3">
                  <Brain className="w-4 h-4 text-blue-600" />
                  <span>
                    <strong>All 5 Agents:</strong> Gemini 2.5 Flash Lite
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    Fast
                  </span>
                </li>
              </ul>
              <p className="text-xs text-gray-500 mt-4">
                5 free agent runs included
              </p>
            </div>
            <div className="bg-black text-white p-6 rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-lg">Premium Tier</span>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3">
                  <Brain className="w-4 h-4 text-blue-400" />
                  <span>
                    <strong>All 5 Agents:</strong> Gemini 2.5 Flash
                  </span>
                  <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded">
                    Smart
                  </span>
                </li>
              </ul>
              <p className="text-xs text-gray-400 mt-4">
                Unlimited runs + priority processing
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Multi-Agent */}
      <section className="py-16 md:py-24 px-6 md:px-12 bg-black text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">
            {mode === "jobseeker"
              ? "Why Six Agents Beat One"
              : "Why AI-Powered Recruiting Wins"}
          </h2>
          <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
            {mode === "jobseeker"
              ? "Single-shot AI often produces generic results. Our specialized 6-agent team works like a professional career firm—each focused on what they do best."
              : "Manual recruiting is slow and inconsistent. Our 6-agent system works like having a full recruiting team—available 24/7 and getting smarter every day."}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            {mode === "jobseeker" ? (
              <>
                <div className="p-6 border border-white/20 rounded-lg">
                  <h3 className="font-bold text-lg mb-2">
                    🧠 Smarter Strategy
                  </h3>
                  <p className="text-sm text-gray-400">
                    The Planning Agent uses Gemini 2.5 to deeply understand the
                    job requirements before any writing begins.
                  </p>
                </div>
                <div className="p-6 border border-white/20 rounded-lg">
                  <h3 className="font-bold text-lg mb-2">
                    ⚡ Faster Execution
                  </h3>
                  <p className="text-sm text-gray-400">
                    The Execution Agent follows a clear plan, producing focused
                    results without wandering off-track.
                  </p>
                </div>
                <div className="p-6 border border-white/20 rounded-lg">
                  <h3 className="font-bold text-lg mb-2">🎯 Better Results</h3>
                  <p className="text-sm text-gray-400">
                    Multi-stage processing catches opportunities a single pass
                    would miss. Research + Strategy + Execution =
                    Interview-ready.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-6 border border-white/20 rounded-lg">
                  <h3 className="font-bold text-lg mb-2">🔍 Faster Sourcing</h3>
                  <p className="text-sm text-gray-400">
                    The Discovery Agent finds qualified candidates in seconds,
                    not hours. Semantic search understands context, not just
                    keywords.
                  </p>
                </div>
                <div className="p-6 border border-white/20 rounded-lg">
                  <h3 className="font-bold text-lg mb-2">
                    💬 Better Response Rates
                  </h3>
                  <p className="text-sm text-gray-400">
                    The Outreach Agent writes messages that get replies.
                    Personalized at scale means 3x higher engagement.
                  </p>
                </div>
                <div className="p-6 border border-white/20 rounded-lg">
                  <h3 className="font-bold text-lg mb-2">
                    📊 Data-Driven Decisions
                  </h3>
                  <p className="text-sm text-gray-400">
                    Match Analysis provides objective scoring. No more gut
                    feelings— just data-backed hiring decisions.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 px-6 md:px-12">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-serif font-bold mb-6">
            {mode === "jobseeker"
              ? "Ready to Transform Your Resume?"
              : "Ready to Supercharge Your Recruiting?"}
          </h2>
          <p className="text-gray-600 mb-8">
            {mode === "jobseeker"
              ? "Your first 5 AI agent runs are free. See the difference for yourself."
              : "Start finding better candidates faster. Free tier includes 10 AI-powered searches."}
          </p>
          <Link
            href={
              mode === "jobseeker"
                ? "/auth?mode=signup"
                : "/auth?mode=signup&role=recruiter"
            }
            className="inline-flex items-center justify-center px-8 py-4 bg-black text-white font-medium text-lg hover:bg-gray-800 transition-colors"
          >
            {mode === "jobseeker"
              ? "Generate Your Resume"
              : "Start Recruiting Smarter"}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/10 py-8 px-6 md:px-12">
        <div className="max-w-6xl mx-auto text-center text-sm text-gray-500">
          © {new Date().getFullYear()} SwitchCV. All rights reserved.
        </div>
      </footer>
    </main>
  );
}

function AgentCard({
  agent,
  delay,
}: {
  agent: (typeof jobseekerAgents)[0];
  delay: number;
}) {
  const Icon = agent.icon;
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600 border-blue-200",
    amber: "bg-amber-100 text-amber-600 border-amber-200",
    purple: "bg-purple-100 text-purple-600 border-purple-200",
    green: "bg-green-100 text-green-600 border-green-200",
    rose: "bg-rose-100 text-rose-600 border-rose-200",
    indigo: "bg-indigo-100 text-indigo-600 border-indigo-200",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + delay }}
      className="bg-white border border-black/10 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center border ${colorClasses[agent.color as keyof typeof colorClasses]}`}
        >
          <Icon className="w-6 h-6" />
        </div>
        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
          {agent.modelFree}
        </span>
      </div>
      <h3 className="font-serif font-bold text-xl mb-1">{agent.name}</h3>
      <span className="text-sm text-blue-600 font-medium block mb-3">
        {agent.nickname}
      </span>
      <p className="text-gray-600 text-sm mb-4 leading-relaxed">
        {agent.description}
      </p>
      <div className="border-t border-black/5 pt-4">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-2">
          What it does
        </span>
        <ul className="space-y-2">
          {agent.whatItDoes.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-gray-500"
            >
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

function AnimatedFlowDiagram({ mode }: { mode: UserMode }) {
  const [currentStep, setCurrentStep] = useState(0);
  const prevModeRef = useRef(mode);

  const jobseekerSteps = [
    {
      label: "Your Resume",
      sublabel: "+ Job Description",
      icon: <Target className="w-4 h-4" />,
      isFirst: true,
    },
    {
      label: "Research",
      sublabel: "Context",
      icon: <Target className="w-4 h-4" />,
      color: "purple",
    },
    {
      label: "Planning",
      sublabel: "Strategy",
      icon: <Brain className="w-4 h-4" />,
      color: "blue",
    },
    {
      label: "Execution",
      sublabel: "Rewriting",
      icon: <Zap className="w-4 h-4" />,
      color: "amber",
    },
    {
      label: "Validation",
      sublabel: "Auditing",
      icon: <Sparkles className="w-4 h-4" />,
      color: "green",
    },
    {
      label: "Polish",
      sublabel: "Editing",
      icon: <Users className="w-4 h-4" />,
      color: "rose",
    },
    {
      label: "Template",
      sublabel: "Styling",
      icon: <Palette className="w-4 h-4" />,
      color: "indigo",
    },
    {
      label: "Enhanced Resume",
      sublabel: "Interview Ready",
      icon: <Sparkles className="w-4 h-4" />,
      isLast: true,
    },
  ];

  const recruiterSteps = [
    {
      label: "Job Opening",
      sublabel: "+ Requirements",
      icon: <Briefcase className="w-4 h-4" />,
      isFirst: true,
    },
    {
      label: "Requirement",
      sublabel: "Understanding",
      icon: <MessageSquare className="w-4 h-4" />,
      color: "blue",
    },
    {
      label: "Smart Search",
      sublabel: "Matching",
      icon: <Search className="w-4 h-4" />,
      color: "purple",
    },
    {
      label: "Hired!",
      sublabel: "Success",
      icon: <UserCheck className="w-4 h-4" />,
      isLast: true,
    },
  ];

  const steps = mode === "jobseeker" ? jobseekerSteps : recruiterSteps;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [steps.length]);

  // Reset step when mode changes
  useEffect(() => {
    if (prevModeRef.current !== mode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentStep(0);
      prevModeRef.current = mode;
    }
  }, [mode]);

  return (
    <section className="py-12 px-6 md:px-12 border-y border-black/10 bg-[#F5F5F0]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-serif font-bold mb-2">
            Watch the AI Workflow in Action
          </h2>
          <p className="text-sm text-gray-600">
            Your resume flows through {steps.length - 2} specialized agents
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4">
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              <AnimatedFlowStep {...step} isActive={currentStep === index} />
              {index < steps.length - 1 && (
                <AnimatedFlowArrow isActive={currentStep >= index} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

function AnimatedFlowStep({
  label,
  sublabel,
  color,
  isFirst,
  isLast,
  icon,
  isActive,
}: {
  label: string;
  sublabel: string;
  color?: string;
  isFirst?: boolean;
  isLast?: boolean;
  icon?: React.ReactNode;
  isActive?: boolean;
}) {
  const bgClass =
    isFirst || isLast
      ? "bg-black text-white"
      : color === "blue"
        ? "bg-blue-600 text-white"
        : color === "amber"
          ? "bg-amber-500 text-white"
          : color === "rose"
            ? "bg-rose-500 text-white"
            : color === "green"
              ? "bg-green-600 text-white"
              : color === "purple"
                ? "bg-purple-600 text-white"
                : color === "indigo"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-black";

  return (
    <motion.div
      className="text-center"
      animate={{
        scale: isActive ? [1, 1.1, 1] : 1,
      }}
      transition={{
        duration: 0.5,
        ease: "easeInOut",
      }}
    >
      <motion.div
        className={`px-4 py-2.5 rounded-lg font-medium text-sm ${bgClass} flex items-center gap-2 justify-center shadow-md relative overflow-hidden`}
        animate={{
          boxShadow: isActive
            ? "0 10px 25px -5px rgba(0, 0, 0, 0.2)"
            : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        }}
      >
        {isActive && (
          <motion.div
            className="absolute inset-0 bg-white/20"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              duration: 0.8,
              ease: "easeInOut",
            }}
          />
        )}
        {icon}
        {label}
      </motion.div>
      <span className="text-xs text-gray-500 mt-1 block">{sublabel}</span>
    </motion.div>
  );
}

function AnimatedFlowArrow({ isActive }: { isActive?: boolean }) {
  return (
    <>
      <div className="hidden md:block">
        <motion.div
          animate={{
            x: isActive ? [0, 5, 0] : 0,
            opacity: isActive ? [0.4, 1, 0.4] : 0.4,
          }}
          transition={{
            duration: 0.8,
            repeat: isActive ? Infinity : 0,
            ease: "easeInOut",
          }}
        >
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </motion.div>
      </div>
      <div className="md:hidden">
        <motion.div
          animate={{
            y: isActive ? [0, 5, 0] : 0,
            opacity: isActive ? [0.4, 1, 0.4] : 0.4,
          }}
          transition={{
            duration: 0.8,
            repeat: isActive ? Infinity : 0,
            ease: "easeInOut",
          }}
        >
          <ArrowRight className="w-5 h-5 rotate-90 text-gray-400" />
        </motion.div>
      </div>
    </>
  );
}

function DemoResumeCarousel() {
  const [isPaused, setIsPaused] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const demoResumes = [
    { id: "1", title: "Senior Software Engineer", color: "blue" },
    { id: "4", title: "Full Stack Engineer", color: "indigo" },
    { id: "23", title: "Product Manager", color: "purple" },
    { id: "24", title: "Executive", color: "rose" },
  ];

  return (
    <motion.div
      className="mt-12 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <h3 className="text-2xl md:text-3xl font-serif font-bold mb-4 text-center">
        See Live Examples
      </h3>
      <p className="text-gray-600 mb-8 text-center text-lg">
        Explore how our AI transforms different types of resumes
      </p>
      <div
        className="relative"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <motion.div
          className="flex gap-6"
          animate={
            prefersReducedMotion || isPaused ? {} : { x: ["-0%", "-50%"] }
          }
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 25,
              ease: "linear",
            },
          }}
          style={{ width: "fit-content" }}
        >
          {/* First set */}
          {demoResumes.map((resume) => (
            <DemoResumeCard key={resume.id} {...resume} />
          ))}
          {/* Duplicate set for seamless loop */}
          {demoResumes.map((resume) => (
            <DemoResumeCard key={`${resume.id}-dup`} {...resume} />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

function DemoResumeCard({
  id,
  title,
  color,
}: {
  id: string;
  title: string;
  color: string;
}) {
  const colorMap = {
    blue: {
      bg: "bg-blue-500",
      gradient: "from-blue-400 to-blue-600",
      text: "text-white",
      light: "bg-blue-50",
      border: "border-blue-200",
    },
    indigo: {
      bg: "bg-indigo-500",
      gradient: "from-indigo-400 to-indigo-600",
      text: "text-white",
      light: "bg-indigo-50",
      border: "border-indigo-200",
    },
    purple: {
      bg: "bg-purple-500",
      gradient: "from-purple-400 to-purple-600",
      text: "text-white",
      light: "bg-purple-50",
      border: "border-purple-200",
    },
    rose: {
      bg: "bg-rose-500",
      gradient: "from-rose-400 to-rose-600",
      text: "text-white",
      light: "bg-rose-50",
      border: "border-rose-200",
    },
  }[color] || {
    bg: "bg-gray-500",
    gradient: "from-gray-400 to-gray-600",
    text: "text-white",
    light: "bg-gray-50",
    border: "border-gray-200",
  };

  return (
    <Link href={`/demo-resumes/${id}`}>
      <motion.div
        className={`relative rounded-2xl overflow-hidden cursor-pointer min-w-[212px] h-[120px] group shadow-xl border-2 border-white/20`}
        whileHover={{ y: -8, scale: 1.03 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Gradient background */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${colorMap.gradient}`}
        />

        {/* Animated shine effect on hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: "-100%" }}
          whileHover={{ x: "100%" }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-between p-4">
          {/* Top section */}
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/70 opacity-90">
              Demo #{id}
            </span>
            <h4 className="font-serif font-bold text-lg text-white leading-tight mt-1">
              {title}
            </h4>
          </div>

          {/* Bottom section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
              </div>
              <span className="text-[9px] font-bold text-white/70 uppercase tracking-wider">
                AI
              </span>
            </div>
            <div className="flex items-center gap-0.5 text-white font-semibold group-hover:gap-1.5 transition-all">
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>

        {/* Decorative corner element */}
        <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-all" />
      </motion.div>
    </Link>
  );
}

function FlowStep({
  label,
  sublabel,
  color,
  isFirst,
  isLast,
  icon,
}: {
  label: string;
  sublabel: string;
  color?: string;
  isFirst?: boolean;
  isLast?: boolean;
  icon?: React.ReactNode;
}) {
  const bgClass =
    isFirst || isLast
      ? "bg-black text-white"
      : color === "blue"
        ? "bg-blue-600 text-white"
        : color === "amber"
          ? "bg-amber-500 text-white"
          : color === "rose"
            ? "bg-rose-500 text-white"
            : color === "green"
              ? "bg-green-600 text-white"
              : color === "purple"
                ? "bg-purple-600 text-white"
                : "bg-gray-200 text-black";

  return (
    <div className="text-center">
      <div
        className={`px-4 py-2.5 rounded-lg font-medium text-sm ${bgClass} flex items-center gap-2 justify-center`}
      >
        {icon}
        {label}
      </div>
      <span className="text-xs text-gray-500 mt-1 block">{sublabel}</span>
    </div>
  );
}

function FlowArrow() {
  return (
    <>
      <div className="text-gray-400 hidden md:block">
        <ArrowRight className="w-5 h-5" />
      </div>
      <div className="text-gray-400 md:hidden">
        <ArrowRight className="w-5 h-5 rotate-90" />
      </div>
    </>
  );
}

function RecruiterDemoCard({
  title,
  description,
  icon,
  color,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}) {
  const colorMap = {
    purple: {
      bg: "bg-purple-500",
      gradient: "from-purple-400 to-purple-600",
      iconBg: "bg-purple-100",
      iconText: "text-purple-600",
    },
    amber: {
      bg: "bg-amber-500",
      gradient: "from-amber-400 to-amber-600",
      iconBg: "bg-amber-100",
      iconText: "text-amber-600",
    },
    green: {
      bg: "bg-green-500",
      gradient: "from-green-400 to-green-600",
      iconBg: "bg-green-100",
      iconText: "text-green-600",
    },
    blue: {
      bg: "bg-blue-500",
      gradient: "from-blue-400 to-blue-600",
      iconBg: "bg-blue-100",
      iconText: "text-blue-600",
    },
  }[color] || {
    bg: "bg-gray-500",
    gradient: "from-gray-400 to-gray-600",
    iconBg: "bg-gray-100",
    iconText: "text-gray-600",
  };

  return (
    <motion.div
      className="bg-white rounded-xl border border-black/10 p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer group"
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div
        className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${colorMap.iconBg} ${colorMap.iconText} group-hover:scale-110 transition-transform`}
      >
        {icon}
      </div>
      <h4 className="font-serif font-bold text-lg mb-2">{title}</h4>
      <p className="text-gray-600 text-sm">{description}</p>
      <div className="mt-4 flex items-center text-sm font-medium text-gray-400 group-hover:text-black transition-colors">
        <span>Learn more</span>
        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
      </div>
    </motion.div>
  );
}
