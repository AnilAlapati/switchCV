"use client";

import { useRouter } from "next/navigation";
import type { ResumeProfile } from "@/types";
import { ResumeContactSection } from "./ResumeContactSection";
import { ResumeExperienceSection } from "./ResumeExperienceSection";
import { ResumeEducationSection } from "./ResumeEducationSection";
import { ResumeSkillsSection } from "./ResumeSkillsSection";
import { ResumeProjectsSection } from "./ResumeProjectsSection";

type EnhancedContent = {
  enhancedSummary?: string;
  enhancedExperience?: Array<{ enhancedDescription?: string }>;
  skillSuggestions?: string[];
};

interface ResumePageLayoutProps {
  resume: ResumeProfile;
  enhancedContent: EnhancedContent;
  requestOnlyFields: boolean;
}

export function ResumePageLayout({
  resume,
  enhancedContent,
  requestOnlyFields,
}: ResumePageLayoutProps) {
  const router = useRouter();

  // Handle missing or malformed title gracefully
  const getTitleText = () => {
    if (!resume.title || resume.title.includes("undefined")) {
      return "Professional Resume";
    }
    return resume.title;
  };

  const title = getTitleText();

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-blue-900/20 via-transparent to-transparent rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-purple-900/20 via-transparent to-transparent rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10">
        {/* Sticky Nav */}
        <nav className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-sm font-medium"
            >
              ← Back
            </button>
          </div>
        </nav>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-6 py-16">
          {/* Header */}
          <div className="mb-20">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent leading-tight">
              {title}
            </h1>

            <div className="flex flex-col md:flex-row md:items-center md:gap-8 mb-8">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                  Last Updated
                </p>
                <p className="text-slate-300">
                  {new Date(resume.lastUpdatedAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            {requestOnlyFields && (
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-900/40 border border-blue-700 text-blue-200 text-sm font-medium">
                <span>🔒</span> Some information available upon request
              </div>
            )}
          </div>

          {/* Main Content - Two Column */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            {/* Left Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-32 p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm">
                <ResumeContactSection resume={resume} />
              </div>
            </div>

            {/* Right Content */}
            <div className="lg:col-span-2 space-y-16">
              {/* Experience */}
              <ResumeExperienceSection
                experience={resume.experience ?? []}
                enhancedExperience={enhancedContent.enhancedExperience as any}
              />

              {/* Education */}
              <ResumeEducationSection education={resume.education ?? []} />

              {/* Skills */}
              <ResumeSkillsSection
                skills={resume.skills ?? []}
                skillSuggestions={enhancedContent.skillSuggestions}
              />

              {/* Projects */}
              <ResumeProjectsSection projects={resume.projects ?? []} />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-24 pt-12 border-t border-slate-800 text-center">
            <p className="text-slate-400 text-sm">
              Crafted with <span className="text-red-500">♥</span> using{" "}
              <span className="text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text font-semibold">
                SwitchCV
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
