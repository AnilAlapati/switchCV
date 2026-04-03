"use client";

/**
 * Velocity Resume Renderer
 *
 * Bold full-width dark header band + timeline with left accent markers.
 * High-contrast, modern tech aesthetic — great for software engineers, DevOps, data.
 * Tier: premium
 */

import React from "react";
import { ResumeProfile, ResumeTemplate } from "@/types";
import {
  normalizeSkills,
  normalizeTimelineItems,
} from "./templateRendererUtils";

interface VelocityResumeRendererProps {
  template: ResumeTemplate;
  data: ResumeProfile;
  isAuthenticated?: boolean;
  onRequestAccess?: () => void;
}

const ACCENT = "#22C55E"; // green-500

export const VelocityResumeRenderer: React.FC<VelocityResumeRendererProps> = ({
  data,
}) => {
  const personalInfo = data.personalInfo || {};
  const heroName = personalInfo.name || data.title || "Candidate";
  const heroTitle = personalInfo.title || "";

  const skills = normalizeSkills(data.skills);
  const experience = normalizeTimelineItems(data.experience);
  const education = normalizeTimelineItems(data.education);

  return (
    <div className="mx-auto max-w-5xl bg-[#0F172A] shadow-2xl">
      {/* HEADER BAND */}
      <header
        className="px-8 py-10 md:px-12"
        style={{
          background: "linear-gradient(135deg,#0F172A 0%,#1E293B 100%)",
        }}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <span
              className="mb-2 inline-block text-xs font-mono font-bold uppercase tracking-[0.25em]"
              style={{ color: ACCENT }}
            >
              Velocity
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
              {heroName}
            </h1>
            {heroTitle && (
              <p className="mt-1 text-base font-medium text-slate-400">
                {heroTitle}
              </p>
            )}
          </div>
          <div className="text-right text-sm text-slate-400 space-y-1">
            {personalInfo.email && (
              <a
                href={`mailto:${personalInfo.email}`}
                className="block hover:text-white"
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
            {personalInfo.github && (
              <a
                href={personalInfo.github}
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:text-white"
              >
                {personalInfo.github.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
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
        </div>
      </header>

      {/* BODY */}
      <div className="bg-[#F8FAFC] px-8 py-8 md:px-12 space-y-8">
        {/* Summary */}
        {data.summary && (
          <section>
            <h2
              className="mb-3 text-xs font-bold uppercase tracking-widest"
              style={{
                color: "#0F172A",
                borderLeft: `3px solid ${ACCENT}`,
                paddingLeft: "12px",
              }}
            >
              About
            </h2>
            <p className="text-sm leading-7 text-gray-700 pl-4">
              {data.summary}
            </p>
          </section>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <section>
            <h2
              className="mb-3 text-xs font-bold uppercase tracking-widest"
              style={{
                color: "#0F172A",
                borderLeft: `3px solid ${ACCENT}`,
                paddingLeft: "12px",
              }}
            >
              Tech Stack
            </h2>
            <div className="flex flex-wrap gap-2 pl-4">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-sm bg-[#0F172A] px-2.5 py-0.5 font-mono text-xs text-[#22C55E]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Experience — timeline */}
        {experience.length > 0 && (
          <section>
            <h2
              className="mb-5 text-xs font-bold uppercase tracking-widest"
              style={{
                color: "#0F172A",
                borderLeft: `3px solid ${ACCENT}`,
                paddingLeft: "12px",
              }}
            >
              Experience
            </h2>
            <div className="relative pl-6 space-y-6">
              {/* Vertical line */}
              <div
                className="absolute left-0 top-1 h-full w-[2px]"
                style={{ background: ACCENT, opacity: 0.25 }}
              />
              {experience.map((entry, i) => (
                <article key={i} className="relative">
                  {/* Timeline dot */}
                  <span
                    className="absolute -left-[25px] top-1.5 h-3 w-3 rounded-full border-2 border-white"
                    style={{ background: ACCENT }}
                  />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-bold text-[#0F172A]">
                      {entry.headline}
                    </h3>
                    {entry.meta && (
                      <span className="font-mono text-xs text-gray-400">
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
          <section>
            <h2
              className="mb-4 text-xs font-bold uppercase tracking-widest"
              style={{
                color: "#0F172A",
                borderLeft: `3px solid ${ACCENT}`,
                paddingLeft: "12px",
              }}
            >
              Education
            </h2>
            <div className="space-y-3 pl-4">
              {education.map((entry, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-baseline justify-between gap-2"
                >
                  <div>
                    <h3 className="text-base font-semibold text-[#0F172A]">
                      {entry.headline}
                    </h3>
                    {entry.subline && (
                      <p className="text-sm text-gray-500">{entry.subline}</p>
                    )}
                  </div>
                  {entry.meta && (
                    <span className="font-mono text-xs text-gray-400">
                      {entry.meta}
                    </span>
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
