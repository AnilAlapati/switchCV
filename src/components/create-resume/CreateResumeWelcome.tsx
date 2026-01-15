"use client";

import type { ReactElement } from "react";
import {
  Bot,
  Brain,
  FileCheck,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react";

interface CreateResumeWelcomeProps {
  onSuggestionClick: (suggestion: string) => void;
}

export function CreateResumeWelcome({
  onSuggestionClick,
}: CreateResumeWelcomeProps): ReactElement {
  const agents = [
    {
      icon: <MessageSquare className="w-5 h-5 text-blue-600" />,
      title: "Conversational Agent",
      description:
        "Interviews you naturally to understand your experience, skills, and career goals through friendly conversation.",
      role: "Information Gathering",
    },
    {
      icon: <Brain className="w-5 h-5 text-gray-600" />,
      title: "Strategy Agent",
      description:
        "Analyzes your background and target roles to determine the best resume structure, tone, and positioning strategy.",
      role: "Strategic Planning",
    },
    {
      icon: <Sparkles className="w-5 h-5 text-blue-600" />,
      title: "Content Agent",
      description:
        "Crafts compelling, ATS-optimized content with powerful action verbs and quantified achievements that stand out.",
      role: "Content Creation",
    },
    {
      icon: <FileCheck className="w-5 h-5 text-black" />,
      title: "Quality Agent",
      description:
        "Reviews and refines every section for clarity, impact, consistency, and alignment with industry best practices.",
      role: "Quality Assurance",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[32vh] px-4 pt-6 pb-4 text-center animate-in fade-in zoom-in duration-700">
      <div className="flex flex-col items-center gap-3 mb-4">
        <div className="w-14 h-14 bg-black flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
          <Bot className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl md:text-[34px] font-serif font-bold text-black tracking-tight">
          Your AI Career Agent
        </h1>
        <p className="text-base md:text-lg text-gray-600 max-w-3xl leading-relaxed font-sans">
          Powered by an{" "}
          <span className="font-bold text-black">
            Agentic AI System
          </span>{" "}
          — a team of specialized AI agents working together to create your
          perfect resume.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-black text-sm font-mono font-bold text-black uppercase tracking-wider">
          <Users className="w-4 h-4" />
          <span>4 AI Agents • Collaborative Intelligence</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl w-full mb-6">
        {agents.map((agent, index) => (
          <div
            key={index}
            className="group flex flex-col items-start p-5 bg-white border-2 border-gray-200 text-left transition-all hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <div className="flex items-start justify-between w-full mb-4">
              <div className="p-3 bg-gray-50 border border-gray-200 group-hover:bg-black group-hover:text-white transition-colors">
                {agent.icon}
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400 bg-gray-100 px-2 py-1 border border-gray-200">
                {agent.role}
              </span>
            </div>
            <h3 className="text-lg font-serif font-bold mb-2 text-black">
              {agent.title}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed font-sans">
              {agent.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500 mb-4 font-sans">
          Ready to get started?
        </p>
        <button
          onClick={() =>
            onSuggestionClick(
              "I want to create a professional resume. Let's get started!"
            )
          }
          className="group inline-flex items-center gap-2 px-8 py-4 bg-black hover:bg-gray-800 text-white font-bold transition-all border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
        >
          <Bot className="w-5 h-5" />
          <span>Start Building Your Resume</span>
          <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
        </button>
      </div>
    </div>
  );
}
