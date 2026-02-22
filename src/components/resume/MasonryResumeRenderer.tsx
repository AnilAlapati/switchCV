"use client";

import React from "react";
import { ResumeProfile, ResumeTemplate } from "@/types";
import {
  normalizeSkills,
  normalizeTimelineItems,
  normalizeProjects,
} from "./templateRendererUtils";

interface MasonryResumeRendererProps {
  template: ResumeTemplate;
  data: ResumeProfile;
  isAuthenticated?: boolean;
  onRequestAccess?: () => void;
}

export const MasonryResumeRenderer: React.FC<MasonryResumeRendererProps> = ({
  data,
}) => {
  const personalInfo = data.personalInfo || {};
  const heroName = personalInfo.name || data.title || "Untitled";
  const heroTitle = personalInfo.title || "Professional";

  // Prepare ordered sections
  const skills = normalizeSkills(data.skills);
  const experience = normalizeTimelineItems(data.experience);
  const projects = normalizeProjects(data.projects);
  const education = normalizeTimelineItems(data.education);

  return (
    <div className="min-h-screen p-4 md:p-8 relative bg-slate-50">
      {/* 1. Premium Dawn Background */}
      <div className="fixed inset-0 -z-20 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200" />
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-100/40 rounded-full blur-[100px] mix-blend-multiply" />
        <div className="absolute bottom-[-10%] left-[-20%] w-[800px] h-[800px] bg-blue-100/40 rounded-full blur-[100px] mix-blend-multiply" />
      </div>

      <div className="max-w-[1600px] mx-auto">
        <div className="mb-8">
          <a
            href="/dashboard"
            className="inline-flex items-center text-slate-500 hover:text-slate-900 font-medium transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center mr-3 group-hover:border-slate-400 group-hover:bg-slate-50 transition-all shadow-sm">
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
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </div>
            <span className="tracking-tight text-sm uppercase font-bold">
              Back to Dashboard
            </span>
          </a>
        </div>

        {/* Hero Row: Profile + About */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-start">
          {/* Profile Card - Compact Anchor (Left) */}
          <div className="lg:col-span-1">
            <div className="rounded-[2rem] overflow-hidden relative group shadow-2xl hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)] transition-all duration-500 hover:-translate-y-1">
              <div className="bg-[#0A0A0A] text-white p-5 text-center flex flex-col justify-center items-center relative overflow-hidden">
                {/* Profile Background Energy */}
                <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
                  <div className="absolute -top-32 -right-32 w-80 h-80 bg-blue-600 rounded-full blur-[80px] animate-pulse-slow"></div>
                  <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-violet-600 rounded-full blur-[80px] animate-pulse-slow delay-1000"></div>
                </div>

                <div className="relative z-10 w-16 h-16 rounded-full border border-white/10 mb-3 p-1 shadow-2xl">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-800 to-[#111] flex items-center justify-center text-2xl font-bold font-serif shadow-inner border border-white/5">
                    {heroName.charAt(0)}
                  </div>
                </div>

                <h1 className="relative z-10 text-xl font-bold leading-tight font-serif tracking-tight mb-1">
                  {heroName}
                </h1>
                <div className="relative z-10 inline-block px-2.5 py-0.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-md mb-3">
                  <p className="text-white/70 text-[9px] font-bold tracking-widest uppercase">
                    {heroTitle}
                  </p>
                </div>

                {/* Location + Experience Row */}
                <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 mb-3 text-white/50 text-[10px]">
                  {personalInfo.location && (
                    <span className="flex items-center gap-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-2.5 h-2.5"
                      >
                        <path
                          fillRule="evenodd"
                          d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {personalInfo.location}
                    </span>
                  )}
                  {experience.length > 0 && (
                    <>
                      {personalInfo.location && (
                        <span className="text-white/30">•</span>
                      )}
                      <span>{experience.length}+ Roles</span>
                    </>
                  )}
                </div>

                {/* Contact Details */}
                <div className="relative z-10 flex flex-col gap-2.5 text-sm text-white/70">
                  {/* Email Row */}
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4 text-white/50 flex-shrink-0"
                    >
                      <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
                      <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
                    </svg>
                    <a
                      href={`mailto:${personalInfo.email || "contact@example.com"}`}
                      className="truncate hover:text-white transition-colors flex-1"
                    >
                      {personalInfo.email || "contact@example.com"}
                    </a>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        navigator.clipboard.writeText(
                          personalInfo.email || "contact@example.com",
                        );
                      }}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      title="Copy email"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-3.5 h-3.5 text-white/40 hover:text-white/80"
                      >
                        <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
                        <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
                      </svg>
                    </button>
                  </div>
                  {/* Phone Row */}
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4 text-white/50 flex-shrink-0"
                    >
                      <path
                        fillRule="evenodd"
                        d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 006.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 012.43 8.326 13.019 13.019 0 012 5V3.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <a
                      href={`tel:${personalInfo.phone || "+91 90000 00000"}`}
                      className="hover:text-white transition-colors flex-1"
                    >
                      {personalInfo.phone || "+91 90000 00000"}
                    </a>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        navigator.clipboard.writeText(
                          personalInfo.phone || "+91 90000 00000",
                        );
                      }}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      title="Copy phone"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-3.5 h-3.5 text-white/40 hover:text-white/80"
                      >
                        <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
                        <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* About Card - Context (Right - Spans 2) */}
          <div className="lg:col-span-2">
            {data.summary && (
              <div className="rounded-[2rem] p-8 md:p-10 shadow-lg hover:shadow-xl transition-all duration-500 relative overflow-hidden group bg-white border border-slate-200 flex flex-col justify-center">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    The Synopsis
                  </h2>
                </div>
                <p className="text-slate-600 leading-relaxed text-lg md:text-xl font-serif relative z-10 max-w-3xl">
                  {data.summary}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Masonry Grid: Evidence (Experience, Skills, Projects, etc) */}
        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
          {/* Experience Cards - The "Teal Hotspot" */}
          {experience.length > 0 && (
            <div className="break-inside-avoid rounded-[2rem] p-6 relative group shadow-sm hover:shadow-xl transition-all duration-500 bg-white/80 backdrop-blur-2xl border border-white/60">
              <div className="flex items-center gap-3 mb-6">
                {/* Glowing Icon Box */}
                <div className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-lg shadow-teal-500/30">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-5 h-5"
                  >
                    <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-slate-900">Experience</h2>
              </div>

              <div className="space-y-10 pl-2">
                {experience.map((edu, idx) => (
                  <div
                    key={idx}
                    className="relative pl-8 border-l border-slate-200 pb-2 last:pb-0 last:border-0"
                  >
                    <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-teal-500 ring-4 ring-white shadow-sm"></div>
                    <h3 className="font-bold text-slate-900 text-lg leading-tight group-hover:text-teal-900 transition-colors">
                      {edu.headline}
                    </h3>
                    <div className="text-xs font-bold text-teal-600 mb-3 mt-1 uppercase tracking-wider">
                      {edu.subline}
                    </div>
                    <p className="text-slate-600 text-sm whitespace-pre-line leading-relaxed font-medium">
                      {edu.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills Card - The "Purple Hotspot" */}
          {skills.length > 0 && (
            <div className="break-inside-avoid rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all duration-500 bg-white/80 backdrop-blur-2xl border border-white/60">
              <div className="flex items-center gap-3 mb-6">
                {/* Glowing Icon Box */}
                <div className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/30">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-5 h-5"
                  >
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-slate-900">Core Stack</h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {skills.map((skill: string | { name: string }, idx: number) => (
                  <div
                    key={idx}
                    className="px-3 py-1.5 bg-slate-100/80 rounded-lg font-semibold text-slate-700 text-sm shadow-sm border border-slate-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition-all cursor-default"
                  >
                    {typeof skill === "object" ? skill.name : skill}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects Masonry Items - High End Dark */}
          {projects.map((project, idx) => (
            <div
              key={idx}
              className="break-inside-avoid rounded-[2rem] overflow-hidden relative group bg-[#0A0A0A] text-white min-h-[300px] flex flex-col justify-end shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
            >
              {/* Internal Glow Effect */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

              <div className="p-8 relative z-10 w-full pt-32 bg-gradient-to-t from-black via-black/80 to-transparent">
                <div className="mb-4">
                  <span className="inline-block px-2 py-1 rounded-md bg-white/10 text-[10px] font-bold uppercase tracking-widest text-white/80 border border-white/5 backdrop-blur-sm">
                    Featured
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-2 font-serif leading-tight">
                  {project.headline}
                </h3>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed font-medium line-clamp-3 group-hover:line-clamp-none transition-all">
                  {project.description}
                </p>

                <div className="flex gap-2">
                  {project.url && (
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-bold text-white hover:text-white/80 transition-colors uppercase tracking-wider"
                    >
                      View Project <span className="text-white/50">↗</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Education Card - The "Blue Hotspot" */}
          {education.length > 0 && (
            <div className="break-inside-avoid rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all duration-500 bg-white/80 backdrop-blur-2xl border border-white/60">
              <div className="flex items-center gap-3 mb-6">
                {/* Glowing Icon Box */}
                <div className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-lg shadow-blue-500/30">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-5 h-5"
                  >
                    <path d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-slate-900">Education</h2>
              </div>

              <div className="space-y-4">
                {education.map((edu, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 group-hover:bg-blue-50/30 group-hover:border-blue-100 transition-colors"
                  >
                    <div className="font-bold text-slate-900 text-lg">
                      {edu.headline}
                    </div>
                    <div className="text-sm text-slate-600 font-bold mb-1">
                      {edu.subline}
                    </div>
                    <div className="text-xs text-blue-600/80 uppercase tracking-wide font-bold">
                      {edu.meta}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quote Card - Clean Typography */}
          <div className="break-inside-avoid bg-[#111] text-white rounded-[2rem] p-10 text-center shadow-2xl hover:scale-[1.02] transition-transform duration-500 flex flex-col justify-center border border-white/5">
            <svg
              className="w-8 h-8 text-white/20 mx-auto mb-6"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M14.017 21L14.017 18C14.017 16.082 14.076 15.018 15.017 14.286C15.957 13.5539 17.584 13.0649 20 13V10C17.701 10 16.29 9.38896 15.659 8.243C15.029 7.09704 14.929 7 14.929 5L12 5C12 9 12 13 12 17C12 19 13.017 21 14.017 21ZM5.01732 21L5.01732 18C5.01732 16.082 5.07632 15.018 6.01732 14.286C6.95832 13.5539 8.58432 13.0649 11.0003 13V10C8.70132 10 7.29032 9.38896 6.65932 8.243C6.02832 7.09704 5.92932 7 5.92832 5L3.00032 5C3.00032 9 3.00032 13 3.00032 17C3.00032 19 4.01732 21 5.01732 21Z" />
            </svg>
            <p className="font-serif text-2xl italic text-gray-200 leading-relaxed">
              "Design is not just what it looks like and feels like. Design is
              how it works."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
