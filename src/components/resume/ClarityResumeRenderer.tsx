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
    <div className="mx-auto max-w-3xl bg-white shadow-xl">
      {/* ── TOP ACCENT BAR + HEADER ── */}
      <div className="h-1.5 bg-[#2563EB]" />
      <header className="px-10 py-9 pb-7">
        <h1
          className="text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl"
          style={{ letterSpacing: "-0.5px" }}
        >
          {heroName}
        </h1>
        {heroTitle && (
          <p className="mt-2 text-base font-semibold text-[#2563EB]">
            {heroTitle}
          </p>
        )}
        {contacts.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-gray-500">
            {contacts.map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="select-none text-gray-200">·</span>}
                {c.href ? (
                  <a
                    href={c.href}
                    target={c.href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="hover:text-[#2563EB] transition-colors"
                  >
                    {c.label}
                  </a>
                ) : (
                  <span>{c.label}</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
        <div className="mt-6 border-t border-gray-100" />
      </header>

      <div className="px-10 pb-10 space-y-8">
        {/* Summary */}
        {data.summary && (
          <section>
            <ClarityHeading>Profile</ClarityHeading>
            <p className="mt-3 text-sm leading-7 text-gray-700">
              {data.summary}
            </p>
          </section>
        )}

        {/* Experience */}
        {experience.length > 0 && (
          <section>
            <ClarityHeading>Experience</ClarityHeading>
            <div className="mt-4 space-y-7">
              {experience.map((entry, i) => (
                <article key={i}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-bold text-gray-900">
                      {entry.headline}
                    </h3>
                    {entry.meta && (
                      <span className="text-xs font-medium text-gray-400">
                        {entry.meta}
                      </span>
                    )}
                  </div>
                  {entry.subline && (
                    <p className="text-sm font-semibold text-[#2563EB]">
                      {entry.subline}
                    </p>
                  )}
                  {entry.description && (
                    <p className="mt-1.5 text-sm leading-7 text-gray-600">
                      {entry.description}
                    </p>
                  )}
                  {Array.isArray(entry.bullets) && entry.bullets.length > 0 && (
                    <ul className="mt-2 space-y-1.5 pl-4">
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
          <section>
            <ClarityHeading>Education</ClarityHeading>
            <div className="mt-4 space-y-5">
              {education.map((entry, i) => (
                <article key={i}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-bold text-gray-900">
                      {entry.headline}
                    </h3>
                    {entry.meta && (
                      <span className="text-xs font-medium text-gray-400">
                        {entry.meta}
                      </span>
                    )}
                  </div>
                  {entry.subline && (
                    <p className="text-sm text-gray-500">{entry.subline}</p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <section>
            <ClarityHeading>Skills</ClarityHeading>
            <div className="mt-3 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

/* ─── Section heading: solid left bar + spaced caps ─── */
const ClarityHeading: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="flex items-center gap-3 mb-1">
    <div className="h-4 w-1 rounded-full bg-[#2563EB]" />
    <h2 className="text-xs font-bold uppercase tracking-widest text-[#1D4ED8]">
      {children}
    </h2>
    <div className="flex-1 border-t border-gray-100" />
  </div>
);
