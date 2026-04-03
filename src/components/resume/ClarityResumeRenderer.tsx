"use client";

/**
 * Clarity Resume Renderer
 *
 * Clean single-column layout with left-border accent bars on section headings.
 * Minimal, highly readable — great for academia, research, and content roles.
 * Tier: free
 */

import React from "react";
import { ResumeProfile, ResumeTemplate } from "@/types";
import {
  normalizeSkills,
  normalizeTimelineItems,
} from "./templateRendererUtils";

interface ClarityResumeRendererProps {
  template: ResumeTemplate;
  data: ResumeProfile;
  isAuthenticated?: boolean;
  onRequestAccess?: () => void;
}

export const ClarityResumeRenderer: React.FC<ClarityResumeRendererProps> = ({
  data,
}) => {
  const personalInfo = data.personalInfo || {};
  const heroName = personalInfo.name || data.title || "Candidate";
  const heroTitle = personalInfo.title || "";

  const skills = normalizeSkills(data.skills);
  const experience = normalizeTimelineItems(data.experience);
  const education = normalizeTimelineItems(data.education);

  const contacts: Array<{ label: string; href?: string }> = [];
  if (personalInfo.email)
    contacts.push({
      label: personalInfo.email,
      href: `mailto:${personalInfo.email}`,
    });
  if (personalInfo.phone) contacts.push({ label: personalInfo.phone });
  if (personalInfo.location) contacts.push({ label: personalInfo.location });
  if (personalInfo.linkedin)
    contacts.push({
      label: personalInfo.linkedin.replace(/^https?:\/\/(www\.)?/, ""),
      href: personalInfo.linkedin,
    });
  if (personalInfo.github)
    contacts.push({
      label: personalInfo.github.replace(/^https?:\/\/(www\.)?/, ""),
      href: personalInfo.github,
    });

  return (
    <div className="mx-auto max-w-3xl bg-white px-10 py-10 shadow-xl">
      {/* Header */}
      <header className="mb-8 border-l-4 border-[#2563EB] pl-5">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
          {heroName}
        </h1>
        {heroTitle && (
          <p className="mt-1 text-base font-medium text-[#2563EB]">
            {heroTitle}
          </p>
        )}
        {contacts.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            {contacts.map((c, i) =>
              c.href ? (
                <a
                  key={i}
                  href={c.href}
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="hover:text-[#2563EB]"
                >
                  {c.label}
                </a>
              ) : (
                <span key={i}>{c.label}</span>
              ),
            )}
          </div>
        )}
      </header>

      {/* Summary */}
      {data.summary && (
        <section className="mb-7">
          <h2 className="mb-3 border-l-4 border-[#BFDBFE] pl-3 text-xs font-bold uppercase tracking-widest text-[#1D4ED8]">
            Profile
          </h2>
          <p className="text-sm leading-7 text-gray-700">{data.summary}</p>
        </section>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <section className="mb-7">
          <h2 className="mb-4 border-l-4 border-[#BFDBFE] pl-3 text-xs font-bold uppercase tracking-widest text-[#1D4ED8]">
            Experience
          </h2>
          <div className="space-y-6">
            {experience.map((entry, i) => (
              <article key={i} className="pl-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-semibold text-gray-900">
                    {entry.headline}
                  </h3>
                  {entry.meta && (
                    <span className="text-xs text-gray-400">{entry.meta}</span>
                  )}
                </div>
                {entry.subline && (
                  <p className="text-sm font-medium text-[#2563EB]">
                    {entry.subline}
                  </p>
                )}
                {entry.description && (
                  <p className="mt-1.5 text-sm leading-6 text-gray-600">
                    {entry.description}
                  </p>
                )}
                {Array.isArray(entry.bullets) && entry.bullets.length > 0 && (
                  <ul className="mt-2 space-y-1 pl-4">
                    {entry.bullets.map((b: string, bi: number) => (
                      <li
                        key={bi}
                        className="list-disc text-sm leading-6 text-gray-600"
                      >
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {education.length > 0 && (
        <section className="mb-7">
          <h2 className="mb-4 border-l-4 border-[#BFDBFE] pl-3 text-xs font-bold uppercase tracking-widest text-[#1D4ED8]">
            Education
          </h2>
          <div className="space-y-4 pl-3">
            {education.map((entry, i) => (
              <div key={i}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-semibold text-gray-900">
                    {entry.headline}
                  </h3>
                  {entry.meta && (
                    <span className="text-xs text-gray-400">{entry.meta}</span>
                  )}
                </div>
                {entry.subline && (
                  <p className="text-sm text-gray-600">{entry.subline}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <section>
          <h2 className="mb-3 border-l-4 border-[#BFDBFE] pl-3 text-xs font-bold uppercase tracking-widest text-[#1D4ED8]">
            Skills
          </h2>
          <div className="flex flex-wrap gap-2 pl-3">
            {skills.map((skill) => (
              <span
                key={skill}
                className="rounded border border-[#BFDBFE] bg-[#EFF6FF] px-2 py-0.5 text-xs text-[#1D4ED8]"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
