"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  jobseekerAgents,
  recruiterAgents,
  jobseekerBeforeAfterExamples,
  recruiterBeforeAfterExamples,
} from "./content";
import type { UserMode } from "./types";
import { ModeToggleSection } from "./_components/ModeToggleSection";
import { HeroSection } from "./_components/HeroSection";
import { AnimatedFlowDiagram } from "./_components/AnimatedFlowDiagram";
import { BeforeAfterSection } from "./_components/BeforeAfterSection";
import { RecruiterSearchDemoSection } from "./_components/RecruiterSearchDemoSection";
import { AgentCardsSection } from "./_components/AgentCardsSection";
import { ModelSelectionSection } from "./_components/ModelSelectionSection";
import { WhyMultiAgentSection } from "./_components/WhyMultiAgentSection";
import { CtaSection } from "./_components/CtaSection";

export default function HowItWorksPage() {
  const [mode, setMode] = useState<UserMode>("jobseeker");
  const agents = mode === "jobseeker" ? jobseekerAgents : recruiterAgents;
  const examples =
    mode === "jobseeker"
      ? jobseekerBeforeAfterExamples
      : recruiterBeforeAfterExamples;

  return (
    <main className="min-h-screen bg-[var(--background)]">
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
            Try it Free -&gt;
          </Link>
        </div>
      </header>

      <ModeToggleSection mode={mode} setMode={setMode} />
      <HeroSection mode={mode} />
      <AnimatedFlowDiagram mode={mode} />

      {mode === "jobseeker" ? (
        <BeforeAfterSection mode={mode} examples={examples} />
      ) : (
        <RecruiterSearchDemoSection />
      )}

      <AgentCardsSection mode={mode} agents={agents} />
      <ModelSelectionSection />
      <WhyMultiAgentSection mode={mode} />
      <CtaSection mode={mode} />

      <footer className="border-t border-black/10 py-8 px-6 md:px-12">
        <div className="max-w-6xl mx-auto text-center text-sm text-gray-500">
          © {new Date().getFullYear()} SwitchCV. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
