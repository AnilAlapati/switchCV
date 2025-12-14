/* eslint-disable max-lines */
import React from "react";
import { ResumeProfile, ResumeTemplate } from "@/types";
import {
    MailIcon,
    PhoneIcon,
    LocationIcon,
    LinkIcon,
    CodeIcon,
} from "./ResumeVisualPrimitives";
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

const getIconForContact = (type: string) => {
    switch (type) {
        case 'email': return MailIcon;
        case 'phone': return PhoneIcon;
        case 'location': return LocationIcon;
        case 'linkedin': return LinkIcon;
        case 'github': return CodeIcon;
        default: return LinkIcon;
    }
};

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
        <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
            <div className="max-w-[1600px] mx-auto">
                <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">

                    {/* Profile Card - Always First */}
                    <div className="break-inside-avoid rounded-3xl overflow-hidden relative group shadow-sm hover:shadow-md transition-shadow">
                        <div className="bg-black text-white p-8 text-center min-h-[300px] flex flex-col justify-center items-center relative overflow-hidden">
                            {/* Decorative Background */}
                            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500 rounded-full blur-3xl"></div>
                                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500 rounded-full blur-3xl"></div>
                            </div>

                            <div className="w-24 h-24 rounded-full border-4 border-white/20 mb-6 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-3xl font-bold">
                                {heroName.charAt(0)}
                            </div>
                            <h1 className="text-2xl font-bold leading-tight">{heroName}</h1>
                            <p className="text-gray-400 mt-2 font-medium">{heroTitle}</p>

                            <div className="mt-6 flex gap-3 justify-center">
                                {personalInfo.email && (
                                    <a href={`mailto:${personalInfo.email}`} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                                        <MailIcon />
                                    </a>
                                )}
                                {personalInfo.linkedin && (
                                    <a href={personalInfo.linkedin} target="_blank" rel="noreferrer" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                                        <LinkIcon />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Summary Card */}
                    {data.summary && (
                        <div className="break-inside-avoid bg-white rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group border border-gray-100">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M14 17H4v2h10v-2zm6-8H4v2h16V9zM4 15h16v-2H4v2zM4 5v2h16V5H4z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-4">About</h2>
                            <p className="text-gray-600 leading-relaxed text-lg font-serif">
                                {data.summary}
                            </p>
                        </div>
                    )}

                    {/* Experience Cards */}
                    {experience.length > 0 && (
                        <div className="break-inside-avoid bg-[#E9F5F5] rounded-3xl p-6 relative group shadow-sm">
                            <h2 className="text-xl font-bold text-[#006B6B] mb-6">Experience</h2>
                            <div className="space-y-6">
                                {experience.map((edu, idx) => (
                                    <div key={idx} className="relative pl-4 border-l-2 border-[#006B6B]/20 pb-4 last:pb-0">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#E9F5F5] border-2 border-[#006B6B]"></div>
                                        <h3 className="font-bold text-[#004d4d] text-lg leading-tight">{edu.headline}</h3>
                                        <div className="text-sm font-semibold text-[#006B6B]/70 mb-2">{edu.subline}</div>
                                        <p className="text-[#004d4d]/80 text-sm whitespace-pre-line">{edu.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Skills Card */}
                    {skills.length > 0 && (
                        <div className="break-inside-avoid bg-[#FFF8E1] rounded-3xl p-6 shadow-sm border border-[#FFF8E1] hover:border-orange-200 transition-colors">
                            <h2 className="text-lg font-bold text-[#5D4037] mb-4">Core Stack</h2>
                            <div className="flex flex-wrap gap-2">
                                {skills.map((skill: any, idx: number) => (
                                    <div key={idx} className="px-3 py-2 bg-white rounded-xl font-bold text-[#5D4037] text-sm shadow-sm hover:shadow-md transition-all cursor-default">
                                        {skill.name || skill}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Projects Masonry Items */}
                    {projects.map((project, idx) => (
                        <div key={idx} className="break-inside-avoid rounded-3xl overflow-hidden relative group bg-gray-900 text-white min-h-[250px] flex flex-col justify-end shadow-md hover:shadow-xl transition-all">
                            <div className="p-6 relative z-10 w-full bg-gradient-to-t from-black/90 to-transparent pt-20">
                                <h3 className="text-xl font-bold mb-1">{project.headline}</h3>
                                <p className="text-gray-300 text-sm mb-4 line-clamp-2">{project.description}</p>

                                <div className="flex gap-2 text-xs font-semibold">
                                    {project.url && (
                                        <a href={project.url} target="_blank" rel="noreferrer" className="bg-white text-black px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors">
                                            View Project ↗
                                        </a>
                                    )}
                                </div>
                            </div>
                            {/* Abstract Pattern for Project Card Background */}
                            <div className={`absolute inset-0 opacity-40 bg-gradient-to-br ${idx % 3 === 0 ? 'from-blue-600 to-purple-600' :
                                idx % 3 === 1 ? 'from-emerald-600 to-teal-600' :
                                    'from-orange-600 to-red-600'
                                }`}></div>
                        </div>
                    ))}

                    {/* Education Card */}
                    {education.length > 0 && (
                        <div className="break-inside-avoid bg-slate-100 rounded-3xl p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-800 mb-4">Education</h2>
                            <div className="space-y-4">
                                {education.map((edu, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm">
                                        <div className="font-bold text-slate-900">{edu.headline}</div>
                                        <div className="text-sm text-slate-500">{edu.subline}</div>
                                        <div className="text-xs text-slate-400 mt-1">{edu.meta}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quote Card (Decorative) */}
                    <div className="break-inside-avoid bg-black text-white rounded-3xl p-8 text-center shadow-lg">
                        <p className="font-serif text-xl italic text-gray-300">"Design is not just what it looks like and feels like. Design is how it works."</p>
                    </div>

                </div>
            </div>
        </div>
    );
};
