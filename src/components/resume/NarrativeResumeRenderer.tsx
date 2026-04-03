"use client";

/**
 * Narrative Resume Renderer
 *
 * Leadership & product-manager focused layout. Large serif-style name,
 * prominent career arc paragraph, ownership-language experience bullets.
 * Tier: premium
 */

import React from "react";
import { ResumeProfile, ResumeTemplate } from "@/types";
import {
  normalizeSkills,
  normalizeTimelineItems,
} from "./templateRendererUtils";

interface NarrativeResumeRendererProps {
  template: ResumeTemplate;
  data: ResumeProfile;
  isAuthenticated?: boolean;
  onRequestAccess?: () => void;
}

const DIVIDER = "#92400E"; // amber-800 — warm ink feel

export const NarrativeResumeRenderer: React.FC<
  NarrativeResumeRendererProps
> = ({ data }) => {
  const personalInfo = data.personalInfo || {};
  const heroName = personalInfo.name || data.title || "Candidate";

  const skills = normalizeSkills(data.skills);
  const experience = normalizeTimelineItems(data.experience);
  const education = normalizeTimelineItems(data.education);

  return (
    <div className="mx-auto max-w-4xl bg-[#FFFBF5] px-8 py-12 shadow-lg md:px-16">
      {/* NAME — large, tracked, centered */}
      <header className="mb-8 text-center">
        <h1
          className="text-4xl font-extrabold tracking-wide text-[#1C1917] md:text-5xl"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          {heroName}
        </h1>
        {personalInfo.title && (
          <p className="mt-2 text-base font-semibold uppercase tracking-[0.2em] text-amber-800">
            {personalInfo.title}
          </p>
        )}
        <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-[#57534E]">
          {personalInfo.email && (
            <a
              href={`mailto:${personalInfo.email}`}
              className="hover:text-amber-800"
            >
              {personalInfo.email}
            </a>
          )}
          {personalInfo.phone && <span>{personalInfo.phone}</span>}
          {personalInfo.location && <span>{personalInfo.location}</span>}
          {personalInfo.linkedin && (
            <a
              href={personalInfo.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-800"
            >
              {personalInfo.linkedin.replace(/^https?:\/\/(www\.)?/, "")}
            </a>
          )}
        </div>
        <div
          className="mx-auto mt-6 h-[2px] w-24 rounded-full"
          style={{ background: DIVIDER }}
        />
      </header>

      {/* STORY / SUMMARY */}
      {data.summary && (
        <section className="mb-8">
          <p
            className="mx-auto max-w-2xl text-center text-base leading-8 text-[#44403C]"
            style={{
              fontFamily: "'Georgia', 'Times New Roman', serif",
              fontStyle: "italic",
            }}
          >
            {data.summary}
          </p>
        </section>
      )}

      {/* LEADERSHIP EXPERIENCE */}
      {experience.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-5 text-xs font-bold uppercase tracking-widest text-amber-800 text-center">
            Career
          </h2>
          <div className="space-y-6">
            {experience.map((entry, i) => (
              <article key={i}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-amber-100 pb-2">
                  <h3 className="text-base font-bold text-[#1C1917]">
                    {entry.headline}
                  </h3>
                  {entry.meta && (
                    <span className="text-sm text-[#78716C]">{entry.meta}</span>
                  )}
                </div>
                {entry.subline && (
                  <p className="mt-1 text-sm font-semibold text-amber-800">
                    {entry.subline}
                  </p>
                )}
                {entry.description && (
                  <p className="mt-2 text-sm leading-7 text-[#44403C]">
                    {entry.description}
                  </p>
                )}
                {Array.isArray(entry.bullets) && entry.bullets.length > 0 && (
                  <ul className="mt-2 space-y-1 pl-5">
                    {entry.bullets.map((b: string, bi: number) => (
                      <li
                        key={bi}
                        className="list-disc text-sm leading-6 text-[#44403C]"
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

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Skills */}
        {skills.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-amber-800">
              Core Competencies
            </h2>
            <ul className="space-y-1.5">
              {skills.map((skill) => (
                <li
                  key={skill}
                  className="flex items-center gap-2 text-sm text-[#44403C]"
                >
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: DIVIDER }}
                  />
                  {skill}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Education */}
        {education.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-amber-800">
              Education
            </h2>
            <div className="space-y-3">
              {education.map((entry, i) => (
                <div key={i}>
                  <h3 className="text-base font-semibold text-[#1C1917]">
                    {entry.headline}
                  </h3>
                  {entry.subline && (
                    <p className="text-sm text-[#78716C]">{entry.subline}</p>
                  )}
                  {entry.meta && (
                    <p className="text-xs text-[#A8A29E]">{entry.meta}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
