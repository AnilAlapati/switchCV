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

  return (
    <div className="mx-auto max-w-6xl bg-[#F7F8F4] text-[#101820] shadow-2xl">
      <header className="border-b-4 border-[#1F9D8E] bg-[#0D1F2D] px-6 py-8 text-white md:px-10">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8AD3CC]">
              Signal
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">
              {heroName}
            </h1>
            <p className="mt-2 text-sm font-medium text-[#BFD6E2] md:text-base">
              {heroTitle}
            </p>
          </div>
          <div className="grid gap-1 text-sm text-[#DDEAF0]">
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.phone && <span>{personalInfo.phone}</span>}
            {personalInfo.location && <span>{personalInfo.location}</span>}
            {personalInfo.github && <span>{personalInfo.github}</span>}
            {personalInfo.linkedin && <span>{personalInfo.linkedin}</span>}
          </div>
        </div>
      </header>

      <div className="grid gap-6 px-6 py-8 md:grid-cols-[2fr_1fr] md:px-10">
        <main className="space-y-7">
          {data.summary && (
            <section>
              <h2 className="mb-3 border-b border-[#D2D8D4] pb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#1F9D8E]">
                Impact Summary
              </h2>
              <p className="text-sm leading-7 text-[#263238] md:text-base">
                {data.summary}
              </p>
            </section>
          )}

          {experience.length > 0 && (
            <section>
              <h2 className="mb-3 border-b border-[#D2D8D4] pb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#1F9D8E]">
                Experience
              </h2>
              <div className="space-y-4">
                {experience.map((entry, index) => (
                  <article
                    key={`${entry.headline}-${index}`}
                    className="border border-[#D9DEDA] bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-semibold text-[#101820]">
                          {entry.headline}
                        </h3>
                        {entry.subline && (
                          <p className="text-sm font-medium text-[#56646C]">
                            {entry.subline}
                          </p>
                        )}
                      </div>
                      {entry.meta && (
                        <span className="bg-[#E8F4F2] px-2 py-1 text-xs font-semibold text-[#1D6159]">
                          {entry.meta}
                        </span>
                      )}
                    </div>
                    {entry.description && (
                      <p className="mt-3 text-sm leading-6 text-[#2E3A3F]">
                        {entry.description}
                      </p>
                    )}
                    {Array.isArray(entry.bullets) && entry.bullets.length > 0 && (
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#2E3A3F]">
                        {entry.bullets.slice(0, 5).map((bullet, bulletIndex) => (
                          <li key={`${entry.headline}-${bulletIndex}`}>{bullet}</li>
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
              <h2 className="mb-3 border-b border-[#D2D8D4] pb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#1F9D8E]">
                Projects
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {projects.slice(0, 4).map((project, index) => (
                  <article
                    key={`${project.headline}-${index}`}
                    className="border border-[#D9DEDA] bg-white p-4"
                  >
                    <h3 className="text-sm font-semibold text-[#101820]">
                      {project.headline}
                    </h3>
                    {project.description && (
                      <p className="mt-2 text-sm leading-6 text-[#2E3A3F]">
                        {project.description}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>

        <aside className="space-y-6">
          {skills.length > 0 && (
            <section className="border border-[#D9DEDA] bg-white p-4">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#B55C30]">
                Core Stack
              </h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="bg-[#FFF1EA] px-2 py-1 text-xs font-semibold text-[#9B4D27]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {education.length > 0 && (
            <section className="border border-[#D9DEDA] bg-white p-4">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#B55C30]">
                Education
              </h2>
              <div className="space-y-3">
                {education.map((entry, index) => (
                  <article key={`${entry.headline}-${index}`}>
                    <h3 className="text-sm font-semibold text-[#101820]">
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
