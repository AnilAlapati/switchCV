"use client";

import React, { useState } from "react";
import { TemplateRenderer } from "@/components/resume/TemplateRenderer";
import { RESUME_TEMPLATES } from "@/lib/templates/resumeTemplates";
import { TEMPLATE_TIERS } from "@/lib/features/creativeTemplates";
import { ResumeProfile } from "@/types";

const SAMPLE_RESUME = {
  title: "Alex Rivera",
  summary:
    "Product-focused software engineer with 8 years of experience building scalable systems and leading cross-functional teams. Delivered features used by 2M+ users across fintech and SaaS verticals.",
  personalInfo: {
    name: "Alex Rivera",
    title: "Senior Software Engineer",
    email: "alex@example.com",
    phone: "+1 (555) 234-5678",
    location: "San Francisco, CA",
    linkedin: "https://linkedin.com/in/alexrivera",
    github: "https://github.com/alexrivera",
  },
  skills: [
    { name: "TypeScript", level: "expert", visibility: "public" },
    { name: "React", level: "expert", visibility: "public" },
    { name: "Node.js", level: "advanced", visibility: "public" },
    { name: "PostgreSQL", level: "advanced", visibility: "public" },
    { name: "AWS", level: "intermediate", visibility: "public" },
    { name: "Docker", level: "intermediate", visibility: "public" },
    { name: "GraphQL", level: "intermediate", visibility: "public" },
  ],
  experience: [
    {
      company: "Stripe",
      role: "Senior Software Engineer",
      startDate: "2021",
      endDate: "Present",
      description:
        "Led redesign of payment dispute resolution flow, reducing manual review time by 40%. Shipped fraud-detection ML pipeline serving 500K requests/day. Mentored 4 junior engineers.",
      visibility: "public" as const,
    },
    {
      company: "Brex",
      role: "Software Engineer",
      startDate: "2019",
      endDate: "2021",
      description:
        "Built spend analytics dashboard from scratch using React + GraphQL. Reduced dashboard load time by 60% via query batching. Shipped real-time notifications feature.",
      visibility: "public" as const,
    },
  ],
  education: [
    {
      institution: "UC Berkeley",
      degree: "B.S. Computer Science",
      startDate: "2015",
      endDate: "2019",
      visibility: "public" as const,
    },
  ],
};

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  premium: "Premium",
  enterprise: "Enterprise",
};

const TIER_COLORS: Record<string, string> = {
  free: "bg-green-100 text-green-800",
  premium: "bg-purple-100 text-purple-800",
  enterprise: "bg-amber-100 text-amber-800",
};

export default function DesignGalleryPage() {
  const [activeId, setActiveId] = useState<string>(
    RESUME_TEMPLATES[0]?.id ?? "",
  );

  const activeTemplate = RESUME_TEMPLATES.find((t) => t.id === activeId);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-gray-200 bg-white px-4 py-6">
        <h1 className="mb-6 text-lg font-bold text-gray-900">
          Template Gallery
        </h1>
        <nav className="space-y-1">
          {RESUME_TEMPLATES.map((tmpl) => {
            const tier = TEMPLATE_TIERS[tmpl.id] ?? "free";
            const isActive = tmpl.id === activeId;
            return (
              <button
                key={tmpl.id}
                onClick={() => setActiveId(tmpl.id)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? "bg-indigo-50 font-semibold text-indigo-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span>{tmpl.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${TIER_COLORS[tier] ?? TIER_COLORS.free}`}
                >
                  {TIER_LABELS[tier] ?? tier}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Preview */}
      <main className="flex-1 overflow-auto p-8">
        {activeTemplate ? (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {activeTemplate.name}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {activeTemplate.description}
              </p>
            </div>
            <div className="origin-top-left scale-90 overflow-hidden rounded-xl border border-gray-200 shadow-xl">
              <TemplateRenderer
                template={activeTemplate}
                data={SAMPLE_RESUME as ResumeProfile}
                isAuthenticated={true}
              />
            </div>
          </div>
        ) : (
          <p className="text-gray-400">Select a template from the sidebar.</p>
        )}
      </main>
    </div>
  );
}
