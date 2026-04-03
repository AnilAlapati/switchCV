"use client";

/**
 * Atlas Resume Renderer
 *
 * Two-column layout: fixed navy sidebar (left) + clean content area (right).
 * Tier: free  |  Best for: traditional roles, corporate, government
 */

import React from "react";
import { ResumeProfile, ResumeTemplate } from "@/types";
import {
  normalizeSkills,
  normalizeTimelineItems,
} from "./templateRendererUtils";

interface AtlasResumeRendererProps {
  template: ResumeTemplate;
  data: ResumeProfile;
  isAuthenticated?: boolean;
  onRequestAccess?: () => void;
}

export const AtlasResumeRenderer: React.FC<AtlasResumeRendererProps> = ({
  data,
}) => {
  const personalInfo = data.personalInfo || {};
  const heroName = personalInfo.name || data.title || "Candidate";
  const heroTitle = personalInfo.title || "";

  const skills = normalizeSkills(data.skills);
  const experience = normalizeTimelineItems(data.experience);
  const education = normalizeTimelineItems(data.education);

  return (
    <div
      className="mx-auto flex max-w-5xl shadow-2xl"
      style={{ minHeight: "1000px" }}
    >
      {/* LEFT SIDEBAR */}
      <aside className="w-[260px] shrink-0 bg-[#1B2A4A] px-6 py-8 text-white">
        {/* Name block */}
        <div className="mb-7 border-b border-[#2E4270] pb-6">
          <h1 className="text-2xl font-bold leading-tight tracking-tight">
            {heroName}
          </h1>
          {heroTitle && (
            <p className="mt-1 text-sm font-medium text-[#7E9DCE]">
              {heroTitle}
            </p>
          )}
        </div>

        {/* Contact */}
        <div className="mb-7 space-y-2 text-sm text-[#BFD1EE]">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#5B7DB1]">
            Contact
          </p>
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
              className="block break-all hover:text-white"
            >
              {personalInfo.linkedin.replace(/^https?:\/\/(www\.)?/, "")}
            </a>
          )}
          {personalInfo.github && (
            <a
              href={personalInfo.github}
              target="_blank"
              rel="noopener noreferrer"
              className="block break-all hover:text-white"
            >
              {personalInfo.github.replace(/^https?:\/\/(www\.)?/, "")}
            </a>
          )}
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="mb-7">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#5B7DB1]">
              Skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-sm bg-[#243660] px-2 py-0.5 text-xs text-[#C8DBF5]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Education (in sidebar) */}
        {education.length > 0 && (
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#5B7DB1]">
              Education
            </p>
            <div className="space-y-4 text-sm">
              {education.map((entry, i) => (
                <div key={i}>
                  <p className="font-semibold leading-tight text-white">
                    {entry.headline}
                  </p>
                  {entry.subline && (
                    <p className="text-[#9AB8D9]">{entry.subline}</p>
                  )}
                  {entry.meta && (
                    <p className="text-xs text-[#5B7DB1]">{entry.meta}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* RIGHT CONTENT */}
      <main className="flex-1 bg-white px-8 py-8 space-y-7">
        {/* Summary */}
        {data.summary && (
          <section>
            <h2 className="mb-2 border-b border-[#1B2A4A] pb-1 text-xs font-bold uppercase tracking-widest text-[#1B2A4A]">
              Professional Summary
            </h2>
            <p className="text-sm leading-7 text-gray-700">{data.summary}</p>
          </section>
        )}

        {/* Experience */}
        {experience.length > 0 && (
          <section>
            <h2 className="mb-4 border-b border-[#1B2A4A] pb-1 text-xs font-bold uppercase tracking-widest text-[#1B2A4A]">
              Experience
            </h2>
            <div className="space-y-5">
              {experience.map((entry, i) => (
                <article key={i}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-bold text-[#1B2A4A]">
                      {entry.headline}
                    </h3>
                    {entry.meta && (
                      <span className="text-xs font-medium text-gray-500">
                        {entry.meta}
                      </span>
                    )}
                  </div>
                  {entry.subline && (
                    <p className="text-sm font-semibold text-[#4A6FA5]">
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
                      {entry.bullets.map((bullet: string, bi: number) => (
                        <li
                          key={bi}
                          className="list-disc text-sm leading-6 text-gray-600"
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
      </main>
    </div>
  );
};
