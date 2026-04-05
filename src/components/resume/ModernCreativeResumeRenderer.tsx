"use client";

/**
 * Modern Creative Resume Renderer
 *
 * Two-column asymmetric layout: bold indigo left bar with contact+skills,
 * white right panel with timeline experience. Strong typographic contrast
 * between name (display-weight) and body.
 * Tier: free  |  Best for: tech, product, design, startups
 */

import React from "react";
import { ResumeProfile, ResumeTemplate } from "@/types";
import {
  normalizeSkills,
  normalizeTimelineItems,
  normalizeProjects,
} from "./templateRendererUtils";

interface ModernCreativeResumeRendererProps {
  template: ResumeTemplate;
  data: ResumeProfile;
  isAuthenticated?: boolean;
  onRequestAccess?: () => void;
}

const INDIGO = "#4F46E5";
const INDIGO_DARK = "#312E81";
const INDIGO_MID = "#6366F1";
const INDIGO_PALE = "#EEF2FF";

export const ModernCreativeResumeRenderer: React.FC<
  ModernCreativeResumeRendererProps
> = ({ data }) => {
  const personalInfo = data.personalInfo || {};
  const heroName = personalInfo.name || data.title || "Candidate";
  const heroTitle = personalInfo.title || "";

  const skills = normalizeSkills(data.skills);
  const experience = normalizeTimelineItems(data.experience);
  const education = normalizeTimelineItems(data.education);
  const projects = normalizeProjects(data.projects);

  return (
    <div
      className="mx-auto flex max-w-5xl overflow-hidden shadow-2xl"
      style={{ minHeight: "960px" }}
    >
      {/* ── LEFT SIDEBAR ── */}
      <aside
        className="w-[240px] shrink-0 px-6 py-10"
        style={{
          background: `linear-gradient(180deg, ${INDIGO_DARK} 0%, ${INDIGO} 100%)`,
        }}
      >
        {/* Name block */}
        <div className="mb-8 pb-6 border-b border-indigo-600">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300 mb-3">
            Modern Creative
          </p>
          <h1 className="text-2xl font-extrabold leading-tight text-white">
            {heroName}
          </h1>
          {heroTitle && (
            <p className="mt-2 text-sm font-medium text-indigo-200">
              {heroTitle}
            </p>
          )}
        </div>

        {/* Contact */}
        <div className="mb-8">
          <SidebarHeading>Contact</SidebarHeading>
          <div className="space-y-2 text-sm text-indigo-100">
            {personalInfo.email && (
              <a
                href={`mailto:${personalInfo.email}`}
                className="block break-all hover:text-white transition-colors"
              >
                {personalInfo.email}
              </a>
            )}
            {personalInfo.phone && (
              <span className="block">{personalInfo.phone}</span>
            )}
            {personalInfo.location && (
              <span className="block">{personalInfo.location}</span>
            )}
            {personalInfo.linkedin && (
              <a
                href={personalInfo.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="block break-all hover:text-white transition-colors"
              >
                {personalInfo.linkedin.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
            )}
            {personalInfo.github && (
              <a
                href={personalInfo.github}
                target="_blank"
                rel="noopener noreferrer"
                className="block break-all hover:text-white transition-colors"
              >
                {personalInfo.github.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
            )}
          </div>
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="mb-8">
            <SidebarHeading>Skills</SidebarHeading>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium text-indigo-100"
                  style={{ background: "rgba(255,255,255,0.12)" }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {education.length > 0 && (
          <div>
            <SidebarHeading>Education</SidebarHeading>
            <div className="space-y-4 text-sm">
              {education.map((entry, i) => (
                <div key={i}>
                  <p className="font-bold leading-tight text-white">
                    {entry.headline}
                  </p>
                  {entry.subline && (
                    <p className="text-indigo-200">{entry.subline}</p>
                  )}
                  {entry.meta && (
                    <p className="text-xs text-indigo-400">{entry.meta}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* ── RIGHT CONTENT ── */}
      <main className="flex-1 bg-white px-8 py-10 space-y-8">
        {/* Summary */}
        {data.summary && (
          <section>
            <RightHeading accent={INDIGO}>About</RightHeading>
            <p className="text-sm leading-7 text-gray-700 mt-3">
              {data.summary}
            </p>
          </section>
        )}

        {/* Experience */}
        {experience.length > 0 && (
          <section>
            <RightHeading accent={INDIGO}>Experience</RightHeading>
            <div
              className="mt-3 space-y-6 border-l-2 ml-1 pl-5"
              style={{ borderColor: INDIGO_PALE }}
            >
              {experience.map((entry, i) => (
                <article key={i} className="relative">
                  {/* Timeline dot */}
                  <span
                    className="absolute -left-[25px] top-1.5 h-3 w-3 rounded-full border-2 border-white"
                    style={{ background: INDIGO_MID }}
                  />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-bold text-gray-900">
                      {entry.headline}
                    </h3>
                    {entry.meta && (
                      <span
                        className="text-xs font-semibold rounded-full px-2 py-0.5"
                        style={{ background: INDIGO_PALE, color: INDIGO }}
                      >
                        {entry.meta}
                      </span>
                    )}
                  </div>
                  {entry.subline && (
                    <p
                      className="text-sm font-semibold mt-0.5"
                      style={{ color: INDIGO }}
                    >
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

        {/* Projects */}
        {projects.length > 0 && (
          <section>
            <RightHeading accent={INDIGO}>Projects</RightHeading>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {projects.map((p, i) => (
                <article
                  key={i}
                  className="rounded-lg border border-indigo-100 p-4"
                  style={{ background: INDIGO_PALE }}
                >
                  <h3 className="text-sm font-bold text-gray-900">
                    {p.headline}
                  </h3>
                  {p.description && (
                    <p className="mt-1.5 text-sm leading-6 text-gray-600">
                      {p.description}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

/* ─── Sidebar heading ─── */
const SidebarHeading: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-indigo-300">
    {children}
  </h2>
);

/* ─── Right-panel heading with ruled line ─── */
const RightHeading: React.FC<{ accent: string; children: React.ReactNode }> = ({
  accent,
  children,
}) => (
  <div className="flex items-center gap-3">
    <h2
      className="text-xs font-bold uppercase tracking-widest"
      style={{ color: accent }}
    >
      {children}
    </h2>
    <div className="flex-1 border-t" style={{ borderColor: "#EEF2FF" }} />
  </div>
);
