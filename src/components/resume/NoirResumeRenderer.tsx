/* eslint-disable max-lines */
"use client";

import React from "react";
import { ResumeProfile, ResumeTemplate } from "@/types";
import {
  normalizeSkills,
  normalizeTimelineItems,
  normalizeProjects,
} from "./templateRendererUtils";

interface NoirResumeRendererProps {
  template: ResumeTemplate;
  data: ResumeProfile;
  isAuthenticated?: boolean;
  onRequestAccess?: () => void;
}

/**
 * NOIR Template - Dark Luxury Aesthetic
 *
 * Enterprise template featuring:
 * - Pure black background (#000)
 * - Gradient accent glows
 * - Premium typography with Neue Haas Grotesk feel
 * - Subtle animations and hover states
 */
export const NoirResumeRenderer: React.FC<NoirResumeRendererProps> = ({
  data,
}) => {
  const personalInfo = data.personalInfo || {};
  const name = personalInfo.name || data.title || "Your Name";
  const title = personalInfo.title || "Professional Title";

  const skills = normalizeSkills(data.skills);
  const experience = normalizeTimelineItems(data.experience);
  const projects = normalizeProjects(data.projects);
  const education = normalizeTimelineItems(data.education);

  return (
    <div className="min-h-screen bg-[#030303] text-white relative overflow-hidden">
      {/* Animated Gradient Mesh Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Primary gradient orb - animated */}
        <div
          className="absolute w-[800px] h-[800px] rounded-full animate-pulse"
          style={{
            top: "-20%",
            right: "-10%",
            background:
              "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 60%)",
            filter: "blur(80px)",
          }}
        />
        {/* Secondary gradient orb */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            bottom: "-10%",
            left: "-5%",
            background:
              "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 60%)",
            filter: "blur(60px)",
          }}
        />
        {/* Accent orb */}
        <div
          className="absolute w-[400px] h-[400px] rounded-full"
          style={{
            top: "50%",
            left: "30%",
            background:
              "radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 60%)",
            filter: "blur(40px)",
          }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "100px 100px",
          }}
        />
      </div>

      {/* Cinematic letterbox bars */}
      <div className="fixed top-0 left-0 right-0 h-6 bg-black z-50" />
      <div className="fixed bottom-0 left-0 right-0 h-6 bg-black z-50" />

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-20 relative z-10">
        {/* HERO SECTION - Cinematic Introduction */}
        <header className="mb-24 relative">
          {/* Floating accent line */}
          <div className="absolute -left-20 top-1/2 w-16 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div className="space-y-4">
              {/* Title accent */}
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-xs uppercase tracking-[0.4em] text-indigo-400/80 font-medium">
                  {title}
                </span>
              </div>

              {/* Name with gradient */}
              <h1 className="text-6xl md:text-8xl font-extralight tracking-tighter">
                <span
                  className="inline-block"
                  style={{
                    background:
                      "linear-gradient(135deg, #fff 0%, #fff 40%, #818cf8 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {name.split(" ")[0]}
                </span>
                {name.split(" ").slice(1).length > 0 && (
                  <span className="block text-white/40 mt-2">
                    {name.split(" ").slice(1).join(" ")}
                  </span>
                )}
              </h1>
            </div>

            {/* Contact Glass Card */}
            <div className="rounded-2xl p-5 transition-all duration-500 max-w-sm backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/30 hover:bg-white/[0.05]">
              <div className="space-y-3">
                {personalInfo.email && (
                  <a
                    href={`mailto:${personalInfo.email}`}
                    className="flex items-center gap-3 text-white/60 hover:text-indigo-400 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <span className="text-sm">{personalInfo.email}</span>
                  </a>
                )}
                {personalInfo.location && (
                  <div className="flex items-center gap-3 text-white/60">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <span className="text-sm">{personalInfo.location}</span>
                  </div>
                )}
                {personalInfo.linkedin && (
                  <a
                    href={`https://${personalInfo.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-white/60 hover:text-indigo-400 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    </div>
                    <span className="text-sm">LinkedIn</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* SUMMARY - with accent border */}
        {data.summary && (
          <section className="mb-24 relative">
            <div className="absolute -left-4 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/50 via-indigo-500/20 to-transparent" />
            <p className="text-xl md:text-2xl text-white/70 font-light leading-relaxed max-w-4xl pl-8">
              &ldquo;{data.summary}&rdquo;
            </p>
          </section>
        )}

        {/* EXPERIENCE - Stacked Glass Cards */}
        {experience.length > 0 && (
          <section className="mb-20">
            <h2 className="text-xs uppercase tracking-[0.3em] text-white/40 mb-10 flex items-center gap-4">
              <span className="w-8 h-px bg-white/20" />
              Experience
              <span className="flex-1 h-px bg-gradient-to-r from-white/20 via-white/10 to-transparent" />
            </h2>
            <div className="space-y-6">
              {experience.map((exp, index) => (
                <article
                  key={index}
                  className="rounded-2xl p-6 md:p-8 transition-all duration-500 group relative overflow-hidden backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/30 hover:bg-white/[0.05]"
                >
                  {/* Hover gradient effect */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                    style={{
                      background:
                        "radial-gradient(circle at 50% 50%, rgba(99,102,241,0.1) 0%, transparent 70%)",
                    }}
                  />
                  <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                      <div className="flex items-start gap-4">
                        <span className="text-4xl font-extralight text-white/10 group-hover:text-indigo-500/30 transition-colors">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <h3 className="text-xl md:text-2xl font-light text-white/90 group-hover:text-white transition-colors">
                            {exp.headline || "Role"}
                          </h3>
                          <p className="text-indigo-400/80 font-medium mt-1">
                            {exp.subline?.split("•")[0]?.trim()}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-white/30 font-mono bg-white/5 px-3 py-1 rounded-full self-start">
                        {exp.meta || "Present"}
                      </span>
                    </div>
                    {exp.description && (
                      <p className="text-white/50 leading-relaxed pl-16">
                        {exp.description}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* SKILLS - Interactive Pills with Glow */}
        {skills.length > 0 && (
          <section className="mb-24">
            <h2 className="text-xs uppercase tracking-[0.4em] text-white/30 font-medium mb-12 flex items-center gap-4">
              <span className="w-8 h-px bg-white/20" />
              Expertise
              <span className="flex-1 h-px bg-gradient-to-r from-white/20 via-white/10 to-transparent" />
            </h2>
            <div className="flex flex-wrap gap-3">
              {skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-5 py-2.5 rounded-full text-sm font-medium bg-gradient-to-r from-white/[0.08] to-white/[0.04] border border-white/10 text-white/70 hover:text-white hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all duration-300 cursor-default"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* PROJECTS - Asymmetric Grid */}
        {projects.length > 0 && (
          <section className="mb-24">
            <h2 className="text-xs uppercase tracking-[0.4em] text-white/30 font-medium mb-12 flex items-center gap-4">
              <span className="w-8 h-px bg-white/20" />
              Projects
              <span className="flex-1 h-px bg-gradient-to-r from-white/20 via-white/10 to-transparent" />
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {projects.map((project, index) => (
                <article
                  key={index}
                  className={`rounded-2xl p-6 transition-all duration-500 group backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/30 hover:bg-white/[0.05] ${index === 0 ? "md:col-span-2" : ""}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-medium text-white/90 group-hover:text-white transition-colors">
                      {project.headline}
                    </h3>
                    <div className="w-6 h-6 border-t border-r border-white/10 group-hover:border-indigo-500/30 transition-colors" />
                  </div>
                  {project.description && (
                    <p className="text-white/50 text-sm leading-relaxed mb-4">
                      {project.description}
                    </p>
                  )}
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                      {project.technologies.map((tech, i) => (
                        <span
                          key={i}
                          className="text-xs px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400/80 border border-indigo-500/20"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* EDUCATION - Minimal elegant */}
        {education.length > 0 && (
          <section className="mb-24">
            <h2 className="text-xs uppercase tracking-[0.4em] text-white/30 font-medium mb-12 flex items-center gap-4">
              <span className="w-8 h-px bg-white/20" />
              Education
              <span className="flex-1 h-px bg-gradient-to-r from-white/20 via-white/10 to-transparent" />
            </h2>
            <div className="space-y-8">
              {education.map((edu, index) => (
                <div
                  key={index}
                  className="flex flex-col md:flex-row md:items-center md:justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full border border-white/20 group-hover:border-indigo-500 group-hover:bg-indigo-500/20 transition-all" />
                    <div>
                      <h3 className="text-white/80 font-medium group-hover:text-white transition-colors">
                        {edu.headline}
                      </h3>
                      <p className="text-white/40 text-sm">{edu.subline}</p>
                    </div>
                  </div>
                  <span className="text-sm text-white/20 font-mono ml-7 md:ml-0 mt-1 md:mt-0">
                    {edu.meta}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FOOTER - Minimal */}
        <footer className="text-center pt-16 pb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-12 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="w-2 h-2 rounded-full bg-indigo-500/50 animate-pulse" />
            <div className="w-12 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
          <p className="text-xs text-white/20 tracking-widest uppercase">
            Crafted with <span className="text-indigo-400/50">SwitchCV</span>
          </p>
        </footer>
      </div>
    </div>
  );
};
