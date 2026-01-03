"use client";

import { Bot, Sparkles, FileText, Target, Zap } from "lucide-react";

interface CreateResumeWelcomeProps {
  onSuggestionClick: (suggestion: string) => void;
}

export function CreateResumeWelcome({
  onSuggestionClick,
}: CreateResumeWelcomeProps) {
  const suggestions = [
    {
      icon: <Sparkles className="w-5 h-5 text-amber-500" />,
      title: "Build from scratch",
      description:
        "I'll guide you through every section to create a winning resume.",
      text: "I want to build a new resume from scratch. Can you help me?",
    },
    {
      icon: <Target className="w-5 h-5 text-blue-500" />,
      title: "Target a specific job",
      description:
        "Paste a job description and I'll tailor your resume to match.",
      text: "I have a job description and I want to tailor my resume for it.",
    },
    {
      icon: <Zap className="w-5 h-5 text-emerald-500" />,
      title: "Quick optimization",
      description: "Improve your existing bullet points for better impact.",
      text: "I want to optimize my existing resume bullet points.",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] px-4 py-8 text-center animate-in fade-in zoom-in duration-700">
      <div className="mb-6 relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-emerald-600 rounded-3xl shadow-2xl mb-4 transform -rotate-6 transition-transform hover:rotate-0 duration-500">
          <Bot className="w-10 h-10 text-white" />
        </div>
      </div>

      <h1 className="text-3xl md:text-4xl font-extrabold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 tracking-tight">
        Your AI Career Agent
      </h1>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
        I'm here to help you build a professional, high-impact resume that gets
        you noticed. What would you like to do today?
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl w-full mb-8">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion.text)}
            className="group flex flex-col items-start p-6 bg-card/50 backdrop-blur-sm border border-white/20 rounded-2xl text-left transition-all hover:bg-card hover:border-primary/50 hover:shadow-xl hover:-translate-y-1"
          >
            <div className="p-3 bg-white/10 rounded-xl mb-4 group-hover:scale-110 transition-transform">
              {suggestion.icon}
            </div>
            <h3 className="text-lg font-bold mb-2 text-foreground group-hover:text-primary transition-colors">
              {suggestion.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {suggestion.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
