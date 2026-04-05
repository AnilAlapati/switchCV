"use client";

import React from "react";
import { ResumeProfile, ResumeTemplate } from "@/types";
import {
  normalizeProjects,
  normalizeSkills,
  normalizeTimelineItems,
} from "./templateRendererUtils";

interface SignalResumeRendererProps {
  template: ResumeTemplate;
  data: ResumeProfile;
  isAuthenticated?: boolean;
  onRequestAccess?: () => void;
}

const TEAL = "#1F9D8E";
const TEAL_PALE = "#E8F4F2";
const RUST = "#C0622A";
const RUST_PALE = "#FFF1EA";

export const SignalResumeRenderer: React.FC<SignalResumeRendererProps> = ({
  data,
}) => {
  const personalInfo = data.personalInfo || {};
  const heroName = personalInfo.name || data.title || "Candidate";
  const heroTitle = personalInfo.title || "Engineering Professional";

  const skills = normalizeSkills(data.skills);
  const experience = normalizeTimelineItems(data.experience);
  const education = normalizeTimelineItems(data.education);
  const projects = normalizeProjects(data.projects);

  const contactLinks: Array<{ label: string; href?: string }> = [];
  if (personalInfo.email)
    contactLinks.push({
      label: personalInfo.email,
      href: `mailto:${personalInfo.email}`,
    });
  if (personalInfo.phone) contactLinks.push({ label: personalInfo.phone });
  if (personalInfo.location)
    contactLinks.push({ label: personalInfo.location });
  if (personalInfo.github)
    contactLinks.push({
      label: personalInfo.github.replace(/^https?:\/\/(www\.)?/, ""),
      href: personalInfo.github,
    });
  if (personalInfo.linkedin)
    contactLinks.push({
      label: personalInfo.linkedin.replace(/^https?:\/\/(www\.)?/, ""),
      href: personalInfo.linkedin,
    });

  return (
    <div className="mx-auto max-w-5xl bg-[#F7F8F4] text-[#101820] shadow-2xl">
      {/* ── HEADER ── */}
      <header className="bg-[#0D1F2D] px-8 py-10 text-white md:px-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#1F9D8E]">
              Signal
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight leading-none md:text-5xl">
              {heroName}
            </h1>
            <p className="mt-2 text-sm font-medium text-[#7FBFB8] md:text-base">
              {heroTitle}
            </p>
          </div>
          {contactLinks.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-[#A8C8D0] md:flex-col md:items-end md:gap-1.5 md:text-right">
              {contactLinks.map((c, i) =>
                c.href ? (
                  <a
                    key={i}
                    href={c.href}
                    target={c.href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    {c.label}
                  </a>
                ) : (
                  <span key={i}>{c.label}</span>
                ),
              )}
            </div>
          )}
        </div>
        {/* Teal accent bar */}
        <div
          className="mt-8 h-[3px] w-16 rounded-full"
          style={{ background: TEAL }}
        />
      </header>

      <div className="grid gap-8 px-8 py-10 md:grid-cols-[2fr_1fr] md:px-12">
        {/* ── MAIN ── */}
        <main className="space-y-8">
          {data.summary && (
            <section>
              <SectionHead color={TEAL}>Impact Summary</SectionHead>
              <p className="mt-3 text-sm leading-7 text-[#2E3A3F] md:text-base">
                {data.summary}
              </p>
            </section>
          )}

          {experience.length > 0 && (
            <section>
              <SectionHead color={TEAL}>Experience</SectionHead>
              <div className="mt-3 space-y-6">
                {experience.map((entry, index) => (
                  <article
                    key={`${entry.headline}-${index}`}
                    className="border-l-2 pl-5"
                    style={{ borderColor: TEAL_PALE }}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-[#101820]">
                          {entry.headline}
                        </h3>
                        {entry.subline && (
                          <p
                            className="text-sm font-semibold"
                            style={{ color: TEAL }}
                          >
                            {entry.subline}
                          </p>
                        )}
                      </div>
                      {entry.meta && (
                        <span
                          className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                          style={{ background: TEAL_PALE, color: "#1D6159" }}
                        >
                          {entry.meta}
                        </span>
                      )}
                    </div>
                    {entry.description && (
                      <p className="mt-2 text-sm leading-6 text-[#2E3A3F]">
                        {entry.description}
                      </p>
                    )}
                    {Array.isArray(entry.bullets) &&
                      entry.bullets.length > 0 && (
                        <ul className="mt-2 space-y-1 pl-4">
                          {entry.bullets
                            .slice(0, 5)
                            .map((bullet, bulletIndex) => (
                              <li
                                key={`${entry.headline}-bullet-${bulletIndex}`}
                                className="list-disc text-sm leading-6 text-[#2E3A3F]"
                              >
                                {bullet}
                              </li>
                            ))}
                        </ul>
                      )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {projects.length > 0 && (
            <section>
              <SectionHead color={TEAL}>Projects</SectionHead>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {projects.slice(0, 4).map((project, index) => (
                  <article
                    key={`${project.headline}-${index}`}
                    className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5"
                  >
                    <h3 className="text-sm font-bold text-[#101820]">
                      {project.headline}
                    </h3>
                    {project.description && (
                      <p className="mt-2 text-sm leading-6 text-[#4A5568]">
                        {project.description}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>

        {/* ── ASIDE ── */}
        <aside className="space-y-7">
          {skills.length > 0 && (
            <section>
              <SectionHead color={RUST}>Core Stack</SectionHead>
              <div className="mt-3 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ background: RUST_PALE, color: RUST }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {education.length > 0 && (
            <section>
              <SectionHead color={RUST}>Education</SectionHead>
              <div className="mt-3 space-y-4">
                {education.map((entry, index) => (
                  <article key={`${entry.headline}-${index}`}>
                    <h3 className="text-sm font-bold text-[#101820]">
                      {entry.headline}
                    </h3>
                    {entry.subline && (
                      <p className="text-sm text-[#56646C]">{entry.subline}</p>
                    )}
                    {entry.meta && (
                      <p className="text-xs font-medium text-[#7B8C94]">
                        {entry.meta}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};

/* ─── Section heading with teal underline ─── */
const SectionHead: React.FC<{ color: string; children: React.ReactNode }> = ({
  color,
  children,
}) => (
  <div className="flex items-center gap-3">
    <h2
      className="text-[10px] font-bold uppercase tracking-[0.22em]"
      style={{ color }}
    >
      {children}
    </h2>
    <div className="flex-1 border-t border-[#D2D8D4]" />
  </div>
);
