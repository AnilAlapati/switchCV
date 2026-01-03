"use client";

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
}: CreateResumeWelcomeProps) {
  const agents = [
    {
      icon: <MessageSquare className="w-5 h-5 text-blue-500" />,
      title: "Conversational Agent",
      description:
        "Interviews you naturally to understand your experience, skills, and career goals through friendly conversation.",
      role: "Information Gathering",
    },
    {
      icon: <Brain className="w-5 h-5 text-purple-500" />,
      title: "Strategy Agent",
      description:
        "Analyzes your background and target roles to determine the best resume structure, tone, and positioning strategy.",
      role: "Strategic Planning",
    },
    {
      icon: <Sparkles className="w-5 h-5 text-amber-500" />,
      title: "Content Agent",
      description:
        "Crafts compelling, ATS-optimized content with powerful action verbs and quantified achievements that stand out.",
      role: "Content Creation",
    },
    {
      icon: <FileCheck className="w-5 h-5 text-emerald-500" />,
      title: "Quality Agent",
      description:
        "Reviews and refines every section for clarity, impact, consistency, and alignment with industry best practices.",
      role: "Quality Assurance",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[32vh] px-4 pt-6 pb-4 text-center animate-in fade-in zoom-in duration-700">
      <div className="flex flex-col items-center gap-3 mb-4">
        <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-md flex items-center justify-center">
          <Bot className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl md:text-[34px] font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 tracking-tight">
          Your AI Career Agent
        </h1>
        <p className="text-base md:text-lg text-muted-foreground max-w-3xl leading-relaxed">
          Powered by an{" "}
          <span className="font-semibold text-foreground">
            Agentic AI System
          </span>{" "}
          — a team of specialized AI agents working together to create your
          perfect resume.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm font-medium text-primary shadow-sm">
          <Users className="w-4 h-4" />
          <span>4 AI Agents • Collaborative Intelligence</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl w-full mb-6">
        {agents.map((agent, index) => (
          <div
            key={index}
            className="group flex flex-col items-start p-5 bg-card/50 backdrop-blur-sm border border-white/20 rounded-2xl text-left transition-all hover:bg-card hover:border-primary/30 hover:shadow-lg"
          >
            <div className="flex items-start justify-between w-full mb-4">
              <div className="p-3 bg-white/10 rounded-xl group-hover:scale-110 transition-transform">
                {agent.icon}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 bg-muted/50 px-2 py-1 rounded-full">
                {agent.role}
              </span>
            </div>
            <h3 className="text-lg font-bold mb-2 text-foreground">
              {agent.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {agent.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Ready to get started?
        </p>
        <button
          onClick={() =>
            onSuggestionClick(
              "I want to create a professional resume. Let's get started!"
            )
          }
          className="group inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-full shadow-lg transition-all hover:scale-105 hover:shadow-emerald-600/25"
        >
          <Bot className="w-5 h-5" />
          <span>Start Building Your Resume</span>
          <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
        </button>
      </div>
    </div>
  );
}
