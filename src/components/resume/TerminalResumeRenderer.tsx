"use client";

import React, { useState, useEffect } from "react";
import { ResumeProfile, ResumeTemplate } from "@/types";
import {
  normalizeSkills,
  normalizeTimelineItems,
  normalizeProjects,
} from "./templateRendererUtils";

interface TerminalResumeRendererProps {
  template: ResumeTemplate;
  data: ResumeProfile;
  isAuthenticated?: boolean;
  onRequestAccess?: () => void;
}

/**
 * TERMINAL Template - Developer's Code Editor Theme
 *
 * Premium template featuring:
 * - VS Code / GitHub dark theme aesthetic
 * - Monospace typography
 * - Syntax highlighting colors
 * - File tree navigation
 * - Typing animation effect
 */
export const TerminalResumeRenderer: React.FC<TerminalResumeRendererProps> = ({
  data,
}) => {
  const [activeSection, setActiveSection] = useState("about");
  const [isTyping, setIsTyping] = useState(true);

  const personalInfo = data.personalInfo || {};
  const heroName = personalInfo.name || data.title || "developer";
  const heroTitle = personalInfo.title || "Software Engineer";

  const skills = normalizeSkills(data.skills);
  const experience = normalizeTimelineItems(data.experience);
  const projects = normalizeProjects(data.projects);
  const education = normalizeTimelineItems(data.education);

  // Simulate typing effect on load
  useEffect(() => {
    const timer = setTimeout(() => setIsTyping(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const sections = [
    { id: "about", icon: "📄", label: "README.md" },
    { id: "experience", icon: "💼", label: "experience.json" },
    { id: "skills", icon: "⚡", label: "package.json" },
    { id: "projects", icon: "📁", label: "projects/" },
    { id: "education", icon: "🎓", label: "education.md" },
  ];

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#C9D1D9] font-mono">
      {/* Window Chrome */}
      <div className="bg-[#161B22] border-b border-[#30363D] px-4 py-2 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56] hover:bg-[#FF5F56]/80 cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:bg-[#FFBD2E]/80 cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-[#27C93F] hover:bg-[#27C93F]/80 cursor-pointer" />
          </div>
          <span className="text-xs text-[#8B949E] ml-4">
            {heroName.toLowerCase().replace(/\s+/g, "-")}.dev — zsh — 80×24
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/dashboard"
            className="text-xs text-[#8B949E] hover:text-white transition-colors flex items-center gap-1"
          >
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Dashboard
          </a>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-41px)]">
        {/* Sidebar - File Explorer */}
        <div className="w-56 bg-[#0D1117] border-r border-[#30363D] flex-shrink-0 hidden md:block">
          <div className="p-3 text-xs text-[#8B949E] uppercase tracking-wider font-semibold">
            Explorer
          </div>

          {/* Project folder */}
          <div className="px-2">
            <div className="flex items-center gap-2 px-2 py-1 text-sm text-[#C9D1D9]">
              <svg
                className="w-4 h-4 text-[#8B949E]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
              <span className="font-semibold">
                {heroName.split(" ")[0].toLowerCase()}
              </span>
            </div>

            {/* File list */}
            <div className="ml-4 border-l border-[#30363D]">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                    activeSection === section.id
                      ? "bg-[#1F6FEB]/20 text-white"
                      : "text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#161B22]"
                  }`}
                >
                  <span>{section.icon}</span>
                  <span>{section.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Git status */}
          <div className="absolute bottom-0 left-0 w-56 p-3 bg-[#0D1117] border-t border-r border-[#30363D]">
            <div className="flex items-center gap-2 text-xs text-[#8B949E]">
              <div className="w-2 h-2 rounded-full bg-[#27C93F]" />
              <span>main</span>
              <span className="ml-auto">✓ up to date</span>
            </div>
          </div>
        </div>

        {/* Main Content - Code Editor */}
        <div className="flex-1 overflow-auto">
          {/* Tabs */}
          <div className="bg-[#161B22] border-b border-[#30363D] flex items-center">
            {sections
              .filter((s) => s.id === activeSection)
              .map((section) => (
                <div
                  key={section.id}
                  className="px-4 py-2 bg-[#0D1117] border-r border-[#30363D] text-sm flex items-center gap-2"
                >
                  <span>{section.icon}</span>
                  <span>{section.label}</span>
                  <button className="ml-2 text-[#8B949E] hover:text-white">
                    ×
                  </button>
                </div>
              ))}
          </div>

          {/* Editor Content */}
          <div className="p-6 md:p-8">
            {/* Line numbers + content */}
            <div className="flex gap-6">
              {/* Line numbers */}
              <div className="text-[#6E7681] text-right text-sm select-none hidden md:block">
                {Array.from({ length: 50 }, (_, i) => (
                  <div key={i} className="leading-6">
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 text-sm leading-6">
                {activeSection === "about" && (
                  <div className="space-y-2">
                    <div>
                      <span className="text-[#FF7B72]"># </span>
                      <span className="text-[#C9D1D9] text-2xl font-bold">
                        {heroName}
                      </span>
                    </div>
                    <div className="h-2" />
                    <div className="text-[#8B949E]">
                      {">"} {heroTitle}
                    </div>
                    <div className="h-4" />
                    <div>
                      <span className="text-[#FF7B72]">## </span>
                      <span className="text-[#C9D1D9] text-lg">About</span>
                    </div>
                    <div className="h-2" />
                    <div className="text-[#C9D1D9] max-w-2xl">
                      {data.summary || "No summary available."}
                    </div>
                    <div className="h-6" />
                    <div>
                      <span className="text-[#FF7B72]">## </span>
                      <span className="text-[#C9D1D9] text-lg">Contact</span>
                    </div>
                    <div className="h-2" />
                    <div className="bg-[#161B22] rounded-lg p-4 inline-block">
                      <div className="text-[#7EE787]">
                        <span className="text-[#FF7B72]">const</span> contact ={" "}
                        {"{"}
                      </div>
                      {personalInfo.email && (
                        <div className="pl-4">
                          <span className="text-[#79C0FF]">email</span>:{" "}
                          <span className="text-[#A5D6FF]">
                            "{personalInfo.email}"
                          </span>
                          ,
                        </div>
                      )}
                      {personalInfo.location && (
                        <div className="pl-4">
                          <span className="text-[#79C0FF]">location</span>:{" "}
                          <span className="text-[#A5D6FF]">
                            "{personalInfo.location}"
                          </span>
                          ,
                        </div>
                      )}
                      {personalInfo.github && (
                        <div className="pl-4">
                          <span className="text-[#79C0FF]">github</span>:{" "}
                          <span className="text-[#A5D6FF]">
                            "{personalInfo.github}"
                          </span>
                          ,
                        </div>
                      )}
                      {personalInfo.linkedin && (
                        <div className="pl-4">
                          <span className="text-[#79C0FF]">linkedin</span>:{" "}
                          <span className="text-[#A5D6FF]">
                            "{personalInfo.linkedin}"
                          </span>
                          ,
                        </div>
                      )}
                      <div className="text-[#7EE787]">{"}"}</div>
                    </div>
                  </div>
                )}

                {activeSection === "experience" && (
                  <div className="space-y-2">
                    <div>
                        <span className="text-[#8B949E]">{"// experience.json"}</span>
                    </div>
                    <div className="h-2" />
                    <div className="text-[#7EE787]">{"["}</div>
                    {experience.map((exp, idx) => (
                      <div key={idx} className="pl-4 my-4">
                        <div className="text-[#7EE787]">{"{"}</div>
                        <div className="pl-4">
                          <span className="text-[#79C0FF]">"role"</span>:{" "}
                          <span className="text-[#A5D6FF]">
                            "{exp.headline}"
                          </span>
                          ,
                        </div>
                        <div className="pl-4">
                          <span className="text-[#79C0FF]">"company"</span>:{" "}
                          <span className="text-[#A5D6FF]">
                            "{exp.subline?.split("•")[0]?.trim()}"
                          </span>
                          ,
                        </div>
                        <div className="pl-4">
                          <span className="text-[#79C0FF]">"period"</span>:{" "}
                          <span className="text-[#A5D6FF]">
                            "{exp.subline?.split("•")[1]?.trim() || "Present"}"
                          </span>
                          ,
                        </div>
                        <div className="pl-4">
                          <span className="text-[#79C0FF]">"description"</span>:{" "}
                          <span className="text-[#A5D6FF]">
                            "{exp.description?.substring(0, 100)}..."
                          </span>
                        </div>
                        <div className="text-[#7EE787]">
                          {"}"}
                          {idx < experience.length - 1 ? "," : ""}
                        </div>
                      </div>
                    ))}
                    <div className="text-[#7EE787]">{"]"}</div>
                  </div>
                )}

                {activeSection === "skills" && (
                  <div className="space-y-2">
                    <div>
                      <span className="text-[#8B949E]">
                        {"// package.json - dependencies"}
                      </span>
                    </div>
                    <div className="h-2" />
                    <div className="bg-[#161B22] rounded-lg p-4">
                      <div className="text-[#7EE787]">{"{"}</div>
                      <div className="pl-4">
                        <span className="text-[#79C0FF]">"name"</span>:{" "}
                        <span className="text-[#A5D6FF]">
                          "@{heroName.toLowerCase().replace(/\s+/g, "-")}
                          /skills"
                        </span>
                        ,
                      </div>
                      <div className="pl-4">
                        <span className="text-[#79C0FF]">"version"</span>:{" "}
                        <span className="text-[#A5D6FF]">"1.0.0"</span>,
                      </div>
                      <div className="pl-4">
                        <span className="text-[#79C0FF]">"dependencies"</span>:{" "}
                        {"{"}
                        {skills.map((skill, idx) => (
                          <div key={idx} className="pl-4">
                            <span className="text-[#79C0FF]">
                              "{skill.toLowerCase().replace(/\s+/g, "-")}"
                            </span>
                            : <span className="text-[#A5D6FF]">"^latest"</span>
                            {idx < skills.length - 1 ? "," : ""}
                          </div>
                        ))}
                        {"}"}
                      </div>
                      <div className="text-[#7EE787]">{"}"}</div>
                    </div>
                    <div className="h-4" />
                    <div className="flex flex-wrap gap-2 mt-4">
                      {skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-[#238636]/20 text-[#7EE787] rounded-full text-xs border border-[#238636]/40"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {activeSection === "projects" && (
                  <div className="space-y-2">
                    <div>
                      <span className="text-[#FF7B72]"># </span>
                      <span className="text-[#C9D1D9] text-lg">Projects</span>
                    </div>
                    <div className="h-4" />
                    {projects.map((project, idx) => (
                      <div
                        key={idx}
                        className="mb-6 p-4 bg-[#161B22] rounded-lg border border-[#30363D]"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[#58A6FF]">📦</span>
                          <span className="font-semibold text-[#C9D1D9]">
                            {project.headline}
                          </span>
                          {project.url && (
                            <a
                              href={project.url}
                              className="text-[#8B949E] hover:text-[#58A6FF] ml-auto text-xs"
                            >
                              🔗 View
                            </a>
                          )}
                        </div>
                        <p className="text-[#8B949E] text-sm mb-3">
                          {project.description}
                        </p>
                        {project.technologies && (
                          <div className="flex flex-wrap gap-2">
                            {project.technologies.map((tech, techIdx) => (
                              <span
                                key={techIdx}
                                className="text-xs px-2 py-0.5 bg-[#0D1117] text-[#8B949E] rounded"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {projects.length === 0 && (
                      <div className="text-[#8B949E]">
                        No projects found. Run `git init` to start a new
                        project.
                      </div>
                    )}
                  </div>
                )}

                {activeSection === "education" && (
                  <div className="space-y-2">
                    <div>
                      <span className="text-[#FF7B72]"># </span>
                      <span className="text-[#C9D1D9] text-lg">Education</span>
                    </div>
                    <div className="h-4" />
                    <div className="text-[#8B949E]">```plaintext</div>
                    {education.map((edu, idx) => (
                      <div
                        key={idx}
                        className="my-4 pl-2 border-l-2 border-[#30363D]"
                      >
                        <div className="text-[#C9D1D9] font-semibold">
                          {edu.headline}
                        </div>
                        <div className="text-[#8B949E]">{edu.subline}</div>
                        {edu.description && (
                          <div className="text-[#8B949E] mt-1 text-sm">
                            {edu.description}
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="text-[#8B949E]">```</div>
                  </div>
                )}

                {/* Cursor */}
                {isTyping && (
                  <span className="inline-block w-2 h-5 bg-[#C9D1D9] animate-pulse ml-1" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1F6FEB] text-white text-xs flex items-center justify-between px-4 py-1">
        <div className="flex items-center gap-4">
          <span>⎇ main</span>
          <span>✓ 0 problems</span>
        </div>
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>LF</span>
          <span>TypeScript</span>
          <span>Ln 1, Col 1</span>
        </div>
      </div>
    </div>
  );
};
