"use client";

/**
 * Studio Resume Renderer
 *
 * Creative/visual asymmetric layout with bold color blocks.
 * For designers, creative directors, brand strategists, UX leads.
 * Tier: premium
 */

import React from "react";
import { ResumeProfile, ResumeTemplate } from "@/types";
import {
  normalizeSkills,
  normalizeTimelineItems,
} from "./templateRendererUtils";

interface StudioResumeRendererProps {
  template: ResumeTemplate;
  data: ResumeProfile;
  isAuthenticated?: boolean;
  onRequestAccess?: () => void;
}

export const StudioResumeRenderer: React.FC<StudioResumeRendererProps> = ({
  data,
}) => {
  const personalInfo = data.personalInfo || {};
  const heroName = personalInfo.name || data.title || "Candidate";

  const skills = normalizeSkills(data.skills);
  const experience = normalizeTimelineItems(data.experience);
  const education = normalizeTimelineItems(data.education);

  return (
    <div className="mx-auto max-w-5xl overflow-hidden shadow-2xl">
      {/* TOP BAND — bold color block with overlapping name */}
      <div className="relative flex min-h-[200px] flex-col justify-end bg-[#7C3AED] px-8 pb-8 pt-12 md:px-12">
        {/* Decorative square */}
        <div className="absolute right-8 top-8 h-24 w-24 rounded-sm bg-[#A78BFA] opacity-30 md:right-16" />
        <div className="relative z-10">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
            Portfolio
          </p>
          <h1 className="text-4xl font-black leading-tight text-white md:text-6xl">
            {heroName}
          </h1>
          {personalInfo.title && (
            <p className="mt-1 text-base font-medium text-violet-200">
              {personalInfo.title}
            </p>
          )}
        </div>
      </div>

      {/* CONTENT AREA — two-column on md+ */}
      <div className="flex flex-col md:flex-row">
        {/* LEFT STRIP — contact + skills */}
        <aside className="bg-[#2E1065] px-6 py-8 text-sm text-violet-200 md:w-64 md:shrink-0">
          {/* Contact */}
          <div className="mb-8 space-y-2">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-violet-400">
              Contact
            </h2>
            {personalInfo.email && (
              <a
                href={`mailto:${personalInfo.email}`}
                className="block break-all hover:text-white"
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
                className="block hover:text-white"
              >
                {personalInfo.linkedin.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
            )}
          </div>

          {/* Skills */}
          {skills.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-violet-400">
                Expertise
              </h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-[#4C1D95] px-2.5 py-0.5 text-xs font-medium text-violet-200"
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
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-violet-400">
                Education
              </h2>
              <div className="space-y-3">
                {education.map((entry, i) => (
                  <div key={i}>
                    <p className="font-semibold text-white">{entry.headline}</p>
                    {entry.subline && (
                      <p className="text-xs text-violet-300">{entry.subline}</p>
                    )}
                    {entry.meta && (
                      <p className="text-xs text-violet-400">{entry.meta}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* RIGHT — summary + experience */}
        <main className="flex-1 bg-white px-8 py-8 md:px-10">
          {data.summary && (
            <section className="mb-8">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#7C3AED]">
                Vision
              </h2>
              <p className="text-sm leading-7 text-gray-700">{data.summary}</p>
            </section>
          )}

          {experience.length > 0 && (
            <section>
              <h2 className="mb-5 text-xs font-bold uppercase tracking-widest text-[#7C3AED]">
                Work
              </h2>
              <div className="space-y-7">
                {experience.map((entry, i) => (
                  <article key={i}>
                    {/* accent bar */}
                    <div
                      className="mb-2 h-[3px] w-8 rounded-full"
                      style={{
                        background: i % 2 === 0 ? "#7C3AED" : "#A78BFA",
                      }}
                    />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-base font-bold text-[#1e1b4b]">
                        {entry.headline}
                      </h3>
                      {entry.meta && (
                        <span className="text-xs text-gray-400">
                          {entry.meta}
                        </span>
                      )}
                    </div>
                    {entry.subline && (
                      <p className="text-sm font-semibold text-violet-600">
                        {entry.subline}
                      </p>
                    )}
                    {entry.description && (
                      <p className="mt-1.5 text-sm leading-6 text-gray-600">
                        {entry.description}
                      </p>
                    )}
                    {Array.isArray(entry.bullets) &&
                      entry.bullets.length > 0 && (
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
        </main>
      </div>
    </div>
  );
};
