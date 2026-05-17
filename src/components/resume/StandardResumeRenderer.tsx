"use client";

/**
 * Standard Professional Resume Renderer
 *
 * Single-column, ATS-friendly layout. Clean horizontal-rule section
 * dividers, name in large weight sans, blue-600 accent on headings.
 * Tier: free  |  Best for: any industry, ATS compatibility, corporate
 */

import React from "react";
import { ResumeProfile, ResumeTemplate } from "@/types";
import {
  normalizeSkills,
  normalizeTimelineItems,
  normalizeProjects,
} from "./templateRendererUtils";

interface StandardResumeRendererProps {
  template: ResumeTemplate;
  data: ResumeProfile;
  isAuthenticated?: boolean;
  onRequestAccess?: () => void;
}

const ACCENT = "#2563EB"; // blue-600

export const StandardResumeRenderer: React.FC<StandardResumeRendererProps> = ({
  data,
  onRequestAccess,
}) => {
  const personalInfo = data.personalInfo || {};
  const viewerAccess = (data as any)?.viewerAccess || {};
  const isMasked = !!viewerAccess.isMasked;

  const heroName = personalInfo.name || data.title || "Candidate";
  const heroTitle = personalInfo.title || "";

  const skills = normalizeSkills(data.skills);
  const experience = normalizeTimelineItems(data.experience);
  const education = normalizeTimelineItems(data.education);
  const projects = normalizeProjects(data.projects);

  const contacts: Array<{ label: string; href?: string; isMasked?: boolean }> =
    [];
  if (personalInfo.email)
    contacts.push({
      label: personalInfo.email,
      href:
        isMasked || personalInfo.email.includes("***")
          ? undefined
          : `mailto:${personalInfo.email}`,
      isMasked: isMasked && personalInfo.email.includes("***"),
    });
  if (personalInfo.phone)
    contacts.push({
      label: personalInfo.phone,
      isMasked: isMasked && personalInfo.phone.includes("***"),
    });
  if (personalInfo.location) contacts.push({ label: personalInfo.location });
  if (personalInfo.linkedin)
    contacts.push({
      label: personalInfo.linkedin.replace(/^https?:\/\/(www\.)?/, ""),
      href: isMasked ? undefined : personalInfo.linkedin,
    });
  if (personalInfo.github)
    contacts.push({
      label: personalInfo.github.replace(/^https?:\/\/(www\.)?/, ""),
      href: isMasked ? undefined : personalInfo.github,
    });

  return (
    <div className="mx-auto max-w-4xl bg-white px-10 py-12 shadow-xl">
      {/* ── HEADER ── */}
      <header className="mb-8 text-center">
        <h1
          className="text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl"
          style={{ letterSpacing: "-0.5px" }}
        >
          {heroName}
        </h1>
        {heroTitle && (
          <p className="mt-2 text-lg font-semibold" style={{ color: ACCENT }}>
            {heroTitle}
          </p>
        )}
        {contacts.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-gray-500">
            {contacts.map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="select-none text-gray-300">|</span>}
                {c.href ? (
                  <a
                    href={c.href}
                    target={c.href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="hover:text-blue-600"
                  >
                    {c.label}
                  </a>
                ) : c.isMasked ? (
                  <button
                    onClick={onRequestAccess}
                    className="text-blue-600 hover:underline font-medium decoration-blue-300"
                    title="Click to request contact access"
                  >
                    {c.label}
                  </button>
                ) : (
                  <span>{c.label}</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </header>

      {/* ── SECTION HELPER ── */}
      {/* Summary */}
      {data.summary && (
        <Section title="Professional Summary" accent={ACCENT}>
          <p className="text-sm leading-7 text-gray-700">{data.summary}</p>
        </Section>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <Section title="Work Experience" accent={ACCENT}>
          <div className="space-y-6">
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
                  <p
                    className="text-sm font-semibold"
                    style={{ color: ACCENT }}
                  >
                    {entry.subline}
                  </p>
                )}
                {entry.description && (
                  <p className="mt-1 text-sm leading-6 text-gray-600">
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
        </Section>
      )}

      {/* Education */}
      {education.length > 0 && (
        <Section title="Education" accent={ACCENT}>
          <div className="space-y-4">
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
                  <p className="text-sm text-gray-600">{entry.subline}</p>
                )}
              </article>
            ))}
          </div>
        </Section>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <Section title="Projects" accent={ACCENT}>
          <div className="space-y-4">
            {projects.map((p, i) => (
              <article key={i}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-bold text-gray-900">
                    {p.headline}
                  </h3>
                  {p.meta && (
                    <span className="text-xs font-medium text-gray-400">
                      {p.meta}
                    </span>
                  )}
                </div>
                {p.description && (
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    {p.description}
                  </p>
                )}
                {Array.isArray(p.bullets) && p.bullets.length > 0 && (
                  <ul className="mt-2 space-y-1 pl-4">
                    {p.bullets.map((b: string, bi: number) => (
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
        </Section>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <Section title="Skills" accent={ACCENT}>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="rounded border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700"
              >
                {skill}
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};

/* ─── Section wrapper ─── */
const Section: React.FC<{
  title: string;
  accent: string;
  children: React.ReactNode;
}> = ({ title, accent, children }) => (
  <section className="mb-7">
    <div className="mb-3 flex items-center gap-3">
      <h2
        className="text-xs font-bold uppercase tracking-widest"
        style={{ color: accent }}
      >
        {title}
      </h2>
      <div className="flex-1 border-t border-gray-200" />
    </div>
    {children}
  </section>
);
