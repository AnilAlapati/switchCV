"use client";

/**
 * Executive Resume Renderer
 *
 * Full-width charcoal header, serif name treatment, gold ruled dividers.
 * Two-column body: experience (65%) + sidebar with strategic areas & edu (35%).
 * Tier: free  |  Best for: VP/C-suite, board advisory, senior directors
 */

import React from "react";
import { ResumeProfile, ResumeTemplate } from "@/types";
import {
  normalizeSkills,
  normalizeTimelineItems,
} from "./templateRendererUtils";

interface ExecutiveResumeRendererProps {
  template: ResumeTemplate;
  data: ResumeProfile;
  isAuthenticated?: boolean;
  onRequestAccess?: () => void;
}

const CHARCOAL = "#1A1A2E";
const GOLD = "#B8860B";
const GOLD_LIGHT = "#FDF6E3";

export const ExecutiveResumeRenderer: React.FC<
  ExecutiveResumeRendererProps
> = ({ data }) => {
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

  return (
    <div className="mx-auto max-w-5xl bg-white shadow-2xl overflow-hidden">
      {/* ── CHARCOAL HEADER ── */}
      <header
        className="px-10 py-12 text-center text-white"
        style={{ background: CHARCOAL }}
      >
        <h1
          className="text-4xl font-bold tracking-tight md:text-5xl"
          style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            letterSpacing: "1px",
          }}
        >
          {heroName}
        </h1>
        {heroTitle && (
          <p
            className="mt-3 text-sm font-semibold uppercase tracking-[0.3em]"
            style={{ color: GOLD }}
          >
            {heroTitle}
          </p>
        )}
        {contacts.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-gray-300">
            {contacts.map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="select-none opacity-40">·</span>}
                {c.href ? (
                  <a
                    href={c.href}
                    target={c.href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
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
        {/* Gold rule */}
        <div
          className="mx-auto mt-7 h-[1px] w-24 opacity-70"
          style={{ background: GOLD }}
        />
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-col md:flex-row">
        {/* LEFT — Experience */}
        <main className="flex-1 px-10 py-9 space-y-8">
          {/* Executive Summary */}
          {data.summary && (
            <section>
              <ExecHeading gold={GOLD}>Executive Summary</ExecHeading>
              <p
                className="mt-3 text-sm leading-8 text-gray-700"
                style={{
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  fontStyle: "italic",
                }}
              >
                {data.summary}
              </p>
            </section>
          )}

          {/* Professional Experience */}
          {experience.length > 0 && (
            <section>
              <ExecHeading gold={GOLD}>Professional Experience</ExecHeading>
              <div className="mt-3 space-y-7">
                {experience.map((entry, i) => (
                  <article key={i}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3
                        className="text-base font-bold tracking-tight text-gray-900"
                        style={{
                          fontFamily: "'Georgia', 'Times New Roman', serif",
                        }}
                      >
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
                        className="mt-0.5 text-sm font-semibold"
                        style={{ color: GOLD }}
                      >
                        {entry.subline}
                      </p>
                    )}
                    {entry.description && (
                      <p className="mt-1.5 text-sm leading-7 text-gray-600">
                        {entry.description}
                      </p>
                    )}
                    {Array.isArray(entry.bullets) &&
                      entry.bullets.length > 0 && (
                        <ul className="mt-2 space-y-1.5 pl-4">
                          {entry.bullets.map((b: string, bi: number) => (
                            <li
                              key={bi}
                              className="text-sm leading-6 text-gray-600"
                              style={{ listStyleType: "disc" }}
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
        </main>

        {/* RIGHT SIDEBAR */}
        <aside
          className="md:w-[220px] md:shrink-0 px-7 py-9 space-y-7 border-t md:border-t-0 md:border-l border-gray-100"
          style={{ background: GOLD_LIGHT }}
        >
          {/* Strategic Areas */}
          {skills.length > 0 && (
            <div>
              <SideHeading gold={GOLD}>Areas of Expertise</SideHeading>
              <ul className="mt-3 space-y-2">
                {skills.map((skill) => (
                  <li
                    key={skill}
                    className="text-sm text-gray-700 flex items-start gap-2"
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: GOLD }}
                    />
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Education */}
          {education.length > 0 && (
            <div>
              <SideHeading gold={GOLD}>Education</SideHeading>
              <div className="mt-3 space-y-4 text-sm">
                {education.map((entry, i) => (
                  <div key={i}>
                    <p
                      className="font-bold leading-snug text-gray-900"
                      style={{
                        fontFamily: "'Georgia', 'Times New Roman', serif",
                      }}
                    >
                      {entry.headline}
                    </p>
                    {entry.subline && (
                      <p className="text-gray-600">{entry.subline}</p>
                    )}
                    {entry.meta && (
                      <p className="text-xs text-gray-400">{entry.meta}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

/* ─── Heading with gold underline ─── */
const ExecHeading: React.FC<{ gold: string; children: React.ReactNode }> = ({
  gold,
  children,
}) => (
  <div>
    <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-900">
      {children}
    </h2>
    <div
      className="mt-1.5 h-[1.5px] w-8 rounded-full"
      style={{ background: gold }}
    />
  </div>
);

/* ─── Sidebar heading ─── */
const SideHeading: React.FC<{ gold: string; children: React.ReactNode }> = ({
  gold,
  children,
}) => (
  <h2
    className="text-xs font-bold uppercase tracking-widest"
    style={{ color: gold }}
  >
    {children}
  </h2>
);
