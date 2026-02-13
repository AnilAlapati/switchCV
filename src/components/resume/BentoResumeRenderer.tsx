/* eslint-disable max-lines */
"use client";

import React from "react";
import { ResumeProfile, ResumeTemplate } from "@/types";
import {
  normalizeSkills,
  normalizeTimelineItems,
  normalizeProjects,
} from "./templateRendererUtils";

interface BentoResumeRendererProps {
  template: ResumeTemplate;
  data: ResumeProfile;
  isAuthenticated?: boolean;
  onRequestAccess?: () => void;
}

/**
 * BENTO Template - Apple-Inspired Modular Grid
 *
 * Premium template featuring:
 * - Rounded cards with varying sizes
 * - Subtle shadows with hover lift animations
 * - Clean SF Pro-like typography
 * - Staggered animation on load
 */
export const BentoResumeRenderer: React.FC<BentoResumeRendererProps> = ({
  data,
}) => {
  const personalInfo = data.personalInfo || {};
  const heroName = personalInfo.name || data.title || "Your Name";
  const heroTitle = personalInfo.title || "Professional Title";

  const skills = normalizeSkills(data.skills);
  const experience = normalizeTimelineItems(data.experience);
  const projects = normalizeProjects(data.projects);
  const education = normalizeTimelineItems(data.education);

  // Calculate years of experience
  const yearsExp = experience.length > 0 ? `${experience.length}+` : "—";

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-[#F5F5F7] via-white to-[#E8E8ED]" />

      <div className="max-w-6xl mx-auto">
        {/* Back navigation */}
        <div className="mb-6">
          <a
            href="/dashboard"
            className="inline-flex items-center text-gray-500 hover:text-gray-900 font-medium transition-colors group text-sm"
          >
            <span className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center mr-2 group-hover:bg-black/10 transition-colors">
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </span>
            Back
          </a>
        </div>

        {/* BENTO GRID */}
        <div className="grid grid-cols-4 md:grid-cols-6 gap-4 auto-rows-[120px]">
          {/* === ROW 1: Hero Card (spans 4 cols, 2 rows) === */}
          <div
            className="col-span-4 row-span-2 rounded-3xl bg-gradient-to-br from-gray-900 to-black p-8 text-white relative overflow-hidden group hover:scale-[1.01] transition-all duration-500 shadow-xl hover:shadow-2xl"
            style={{ animationDelay: "0ms" }}
          >
            {/* Animated gradient orbs */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-colors duration-700" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-colors duration-700" />

            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <p className="text-xs font-medium text-white/50 uppercase tracking-widest mb-2">
                  {heroTitle}
                </p>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                  {heroName}
                </h1>
              </div>

              {data.summary && (
                <p className="text-white/70 text-base md:text-lg leading-relaxed max-w-xl">
                  {data.summary.length > 150
                    ? data.summary.substring(0, 150) + "..."
                    : data.summary}
                </p>
              )}
            </div>
          </div>

          {/* === Skills Card (spans 2 cols, 2 rows) === */}
          <div
            className="col-span-2 row-span-2 rounded-3xl bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden"
            style={{ animationDelay: "100ms" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h2 className="font-semibold text-gray-900">Skills</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.slice(0, 8).map((skill, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full hover:bg-gray-200 transition-colors cursor-default"
                >
                  {skill}
                </span>
              ))}
              {skills.length > 8 && (
                <span className="px-3 py-1.5 bg-purple-50 text-purple-600 text-xs font-medium rounded-full">
                  +{skills.length - 8} more
                </span>
              )}
            </div>
          </div>

          {/* === Contact Card (small, 2 cols) === */}
          <div
            className="col-span-2 rounded-3xl bg-white p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            style={{ animationDelay: "200ms" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                <svg
                  className="w-3.5 h-3.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 text-sm">Contact</h3>
            </div>
            <div className="space-y-1 text-xs text-gray-600">
              {personalInfo.email && (
                <a
                  href={`mailto:${personalInfo.email}`}
                  className="block truncate hover:text-blue-600 transition-colors"
                >
                  {personalInfo.email}
                </a>
              )}
              {personalInfo.location && (
                <p className="truncate">{personalInfo.location}</p>
              )}
            </div>
          </div>

          {/* === Years Experience (small, 1 col) === */}
          <div
            className="col-span-1 rounded-3xl bg-gradient-to-br from-orange-400 to-rose-500 p-5 text-white shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-center items-center"
            style={{ animationDelay: "250ms" }}
          >
            <span className="text-3xl font-bold">{yearsExp}</span>
            <span className="text-[10px] font-medium uppercase tracking-wider opacity-80">
              Years
            </span>
          </div>

          {/* === GitHub/LinkedIn (small, 1 col) === */}
          <div
            className="col-span-1 rounded-3xl bg-gray-900 p-5 text-white shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-center items-center"
            style={{ animationDelay: "300ms" }}
          >
            {personalInfo.github ? (
              <a
                href={personalInfo.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center hover:opacity-80 transition-opacity"
              >
                <svg
                  className="w-6 h-6 mb-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <span className="text-[10px] font-medium">GitHub</span>
              </a>
            ) : (
              <div className="flex flex-col items-center opacity-50">
                <svg
                  className="w-6 h-6 mb-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                <span className="text-[10px] font-medium">LinkedIn</span>
              </div>
            )}
          </div>

          {/* === Experience Timeline (spans full width, auto rows) === */}
          {experience.length > 0 && (
            <div
              className="col-span-4 md:col-span-6 row-span-3 rounded-3xl bg-white p-6 md:p-8 shadow-sm hover:shadow-lg transition-all duration-300"
              style={{ animationDelay: "400ms" }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Experience
                </h2>
              </div>

              {/* Responsive grid layout - no overlap */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {experience.slice(0, 6).map((exp, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors group border border-transparent hover:border-blue-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-lg font-bold text-gray-400 group-hover:text-blue-500 transition-colors">
                        {idx + 1}
                      </div>
                      <span className="text-xs font-medium text-gray-400 bg-white px-2 py-1 rounded-full">
                        {exp.meta || "Present"}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                      {exp.headline}
                    </h3>
                    <p className="text-sm text-blue-600 font-medium mb-2 line-clamp-1">
                      {exp.subline?.split("•")[0]?.trim()}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-3">
                      {exp.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === Projects Grid === */}
          {projects.length > 0 &&
            projects.slice(0, 2).map((project, idx) => (
              <div
                key={idx}
                className={`${idx === 0 ? "col-span-2 row-span-2" : "col-span-2 md:col-span-4 row-span-2"} rounded-3xl bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col`}
                style={{ animationDelay: `${500 + idx * 100}ms` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Project
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">
                  {project.headline}
                </h3>
                <p className="text-sm text-gray-500 flex-1 line-clamp-3">
                  {project.description}
                </p>
                {project.technologies && project.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {project.technologies.slice(0, 4).map((tech, techIdx) => (
                      <span
                        key={techIdx}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-medium rounded"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

          {/* === Education Card === */}
          {education.length > 0 && (
            <div
              className="col-span-2 md:col-span-3 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: "700ms" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <svg
                  className="w-5 h-5 opacity-80"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"
                  />
                </svg>
                <h2 className="font-semibold">Education</h2>
              </div>
              <div className="space-y-3">
                {education.slice(0, 2).map((edu, idx) => (
                  <div key={idx} className="bg-white/10 rounded-xl p-3">
                    <h3 className="font-medium text-sm">{edu.headline}</h3>
                    <p className="text-xs opacity-80">{edu.subline}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === Download/Share Card === */}
          <div
            className="col-span-2 md:col-span-3 rounded-3xl bg-gray-900 p-6 text-white shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-center items-center"
            style={{ animationDelay: "800ms" }}
          >
            <p className="text-sm text-gray-400 mb-4 text-center">
              Share your professional story
            </p>
            <div className="flex gap-3">
              <button className="px-5 py-2.5 bg-white text-gray-900 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                PDF
              </button>
              <button className="px-5 py-2.5 bg-white/10 text-white rounded-full text-sm font-medium hover:bg-white/20 transition-colors flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                Share
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            Made with <span className="text-red-400">♥</span> using SwitchCV
          </p>
        </div>
      </div>
    </div>
  );
};
