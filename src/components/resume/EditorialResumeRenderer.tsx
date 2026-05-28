"use client";

import React from "react";
import { ResumeProfile, ResumeTemplate } from "@/types";
import {
  normalizeSkills,
  normalizeTimelineItems,
  normalizeProjects,
} from "./templateRendererUtils";

interface EditorialResumeRendererProps {
  template: ResumeTemplate;
  data: ResumeProfile;
  isAuthenticated?: boolean;
  onRequestAccess?: () => void;
}

/**
 * EDITORIAL Template - Magazine Typography
 *
 * Enterprise template featuring:
 * - Playfair Display serif headings
 * - Multi-column layouts
 * - Pull quotes and drop caps
 * - Sophisticated print-style design
 */
export const EditorialResumeRenderer: React.FC<
  EditorialResumeRendererProps
> = ({ data }) => {
  const personalInfo = data.personalInfo || {};
  const name = personalInfo.name || data.title || "Your Name";
  const title = personalInfo.title || "";
  const summary = data.summary || "";

  const skills = normalizeSkills(data.skills);
  const experience = normalizeTimelineItems(data.experience);
  const projects = normalizeProjects(data.projects);
  const education = normalizeTimelineItems(data.education);

  // Get first letter for drop cap
  const firstLetter = summary.charAt(0).toUpperCase();
  const restOfSummary = summary.slice(1);

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Masthead */}
      <header className="border-b-2 border-black px-8 py-6">
        <div className="max-w-5xl mx-auto flex justify-between items-end">
          <div>
            <h1
              className="text-5xl md:text-6xl font-bold tracking-tight"
              style={{ fontFamily: "Playfair Display, Georgia, serif" }}
            >
              {name}
            </h1>
            <p
              className="text-xl mt-2 text-gray-600 italic"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {title}
            </p>
          </div>
          <div className="text-right text-sm text-gray-500 hidden md:block">
            {personalInfo.location && <p>{personalInfo.location}</p>}
            {personalInfo.email && <p>{personalInfo.email}</p>}
            {personalInfo.linkedin && <p>{personalInfo.linkedin}</p>}
          </div>
        </div>
      </header>

      {/* Main Content - Magazine Layout */}
      <main className="max-w-5xl mx-auto px-8 py-12">
        {/* Lead Section with Drop Cap */}
        {summary && (
          <section className="mb-16">
            <div className="max-w-3xl">
              <p
                className="text-lg leading-relaxed text-gray-700"
                style={{ fontFamily: "Georgia, serif" }}
              >
                <span
                  className="float-left text-7xl font-bold leading-none mr-3 mt-1"
                  style={{
                    fontFamily: "Playfair Display, Georgia, serif",
                    color: "#1A1A1A",
                  }}
                >
                  {firstLetter}
                </span>
                {restOfSummary}
              </p>
            </div>
          </section>
        )}

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-3 gap-12">
          {/* Main Column - Experience */}
          <div className="md:col-span-2">
            {experience.length > 0 && (
              <section className="mb-12">
                <h2
                  className="text-2xl font-bold mb-8 pb-2 border-b border-gray-300"
                  style={{ fontFamily: "Playfair Display, Georgia, serif" }}
                >
                  Career Highlights
                </h2>
                <div className="space-y-8">
                  {experience.map((exp, index) => (
                    <article key={index} className="relative">
                      {/* Pull Quote for first experience */}
                      {index === 0 && exp.description && (
                        <blockquote
                          className="float-right w-48 ml-6 mb-4 pl-4 border-l-4 border-black italic text-gray-600"
                          style={{ fontFamily: "Georgia, serif" }}
                        >
                          &ldquo;
                          {exp.description.split(".")[0] ||
                            "Driving innovation forward"}
                          &rdquo;
                        </blockquote>
                      )}
                      <div className="flex flex-col md:flex-row md:justify-between md:items-baseline mb-2">
                        <h3
                          className="text-xl font-semibold"
                          style={{
                            fontFamily: "Playfair Display, Georgia, serif",
                          }}
                        >
                          {exp.headline || "Role"}
                        </h3>
                        <span className="text-sm text-gray-500 italic">
                          {exp.meta || "Present"}
                        </span>
                      </div>
                      <p
                        className="text-gray-600 font-medium mb-2"
                        style={{ fontFamily: "Georgia, serif" }}
                      >
                        {exp.subline}
                      </p>
                      {exp.description && (
                        <p
                          className="text-gray-700 leading-relaxed"
                          style={{ fontFamily: "Georgia, serif" }}
                        >
                          {exp.description}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Projects as Feature Articles */}
            {projects.length > 0 && (
              <section className="mb-12">
                <h2
                  className="text-2xl font-bold mb-8 pb-2 border-b border-gray-300"
                  style={{ fontFamily: "Playfair Display, Georgia, serif" }}
                >
                  Featured Work
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {projects.map((project, index) => (
                    <article
                      key={index}
                      className="border border-gray-200 p-6 bg-white"
                    >
                      <h3
                        className="text-lg font-semibold mb-2"
                        style={{
                          fontFamily: "Playfair Display, Georgia, serif",
                        }}
                      >
                        {project.headline}
                      </h3>
                      {project.description && (
                        <p
                          className="text-sm text-gray-600 leading-relaxed"
                          style={{ fontFamily: "Georgia, serif" }}
                        >
                          {project.description}
                        </p>
                      )}
                      {project.technologies &&
                        project.technologies.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {project.technologies.map((tech, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-1 bg-gray-100 text-gray-600"
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
          </div>

          {/* Sidebar */}
          <aside className="md:col-span-1">
            {/* Skills as Index */}
            {skills.length > 0 && (
              <section className="mb-10">
                <h2
                  className="text-lg font-bold mb-4 pb-2 border-b border-gray-300"
                  style={{ fontFamily: "Playfair Display, Georgia, serif" }}
                >
                  Expertise Index
                </h2>
                <ul className="space-y-2">
                  {skills.map((skill, index) => (
                    <li
                      key={index}
                      className="flex justify-between items-center text-sm border-b border-dotted border-gray-200 pb-1"
                    >
                      <span style={{ fontFamily: "Georgia, serif" }}>
                        {skill}
                      </span>
                      <span className="text-gray-400 text-xs">•••</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Education */}
            {education.length > 0 && (
              <section className="mb-10">
                <h2
                  className="text-lg font-bold mb-4 pb-2 border-b border-gray-300"
                  style={{ fontFamily: "Playfair Display, Georgia, serif" }}
                >
                  Education
                </h2>
                <div className="space-y-4">
                  {education.map((edu, index) => (
                    <div key={index}>
                      <p
                        className="font-medium text-sm"
                        style={{ fontFamily: "Georgia, serif" }}
                      >
                        {edu.headline}
                      </p>
                      <p className="text-xs text-gray-500">{edu.subline}</p>
                      <p className="text-xs text-gray-400 italic">{edu.meta}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Contact Info - Mobile */}
            <section className="md:hidden mb-10 p-4 bg-gray-50 border border-gray-200">
              <h2
                className="text-lg font-bold mb-3"
                style={{ fontFamily: "Playfair Display, Georgia, serif" }}
              >
                Contact
              </h2>
              <div className="text-sm text-gray-600 space-y-1">
                {personalInfo.email && <p>{personalInfo.email}</p>}
                {personalInfo.phone && <p>{personalInfo.phone}</p>}
                {personalInfo.location && <p>{personalInfo.location}</p>}
              </div>
            </section>
          </aside>
        </div>
      </main>

      {/* Footer - Publication Style */}
      <footer className="border-t border-gray-200 px-8 py-6">
        <div className="max-w-5xl mx-auto flex justify-between items-center text-xs text-gray-400">
          <span style={{ fontFamily: "Georgia, serif" }}>
            © {new Date().getFullYear()} {name}
          </span>
          <span className="italic">Crafted with SwitchCV</span>
        </div>
      </footer>
    </div>
  );
};
