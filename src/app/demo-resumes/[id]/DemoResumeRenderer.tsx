"use client";

import React from "react";
import { TemplateRenderer } from "@/components/resume/TemplateRenderer";
import { DashboardResume, ResumeTemplate } from "@/types";
import Link from "next/link";

interface DemoResumeRendererProps {
  template: ResumeTemplate;
  resumeData: DashboardResume;
}

export function DemoResumeRenderer({
  template,
  resumeData,
}: DemoResumeRendererProps) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Floating Demo Notice - Sleek Glass Style */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-black/80 backdrop-blur-xl text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4 text-sm">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-white/90">
            <span className="font-medium text-white">Demo Profile</span>
            <span className="mx-2 text-white/30">•</span>
            Real resumes require recruiter permission
          </span>
          <Link
            href="/dashboard"
            className="ml-2 px-4 py-1.5 bg-white text-black text-xs font-semibold rounded-full hover:bg-white/90 transition-all hover:scale-105"
          >
            Create Yours
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div>
        <TemplateRenderer
          template={template}
          data={resumeData}
          isAuthenticated={true}
          onRequestAccess={() => {}}
        />
      </div>
    </div>
  );
}
