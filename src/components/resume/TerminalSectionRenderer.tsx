import React from "react";
import { ResumeProfile } from "@/types";

interface NormalizedItem {
    headline: string;
    subline: string;
    description: string;
    meta?: string;
    technologies?: string[];
    url?: string;
}

interface TerminalSectionRendererProps {
    activeSection: string;
    heroName: string;
    heroTitle: string;
    data: ResumeProfile;
    personalInfo: Record<string, string | undefined>;
    skills: string[];
    experience: NormalizedItem[];
    projects: NormalizedItem[];
    education: NormalizedItem[];
    isTyping: boolean;
}

export const TerminalSectionRenderer: React.FC<TerminalSectionRendererProps> = ({
    activeSection,
    heroName,
    heroTitle,
    data,
    personalInfo,
    skills,
    experience,
    projects,
    education,
    isTyping,
}) => {
    return (
        <>
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
                        <span className="text-[#8B949E]">
                            {"// experience.json"}
                        </span>
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
                                    {project.technologies.map((tech: string, techIdx: number) => (
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
        </>
    );
};
