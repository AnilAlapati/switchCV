import React from "react";

export interface ResumeAccessBlockConfig {
  title: string;
  description: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
}

interface ResumeAccessBlockProps {
  config: ResumeAccessBlockConfig;
}

export const ResumeAccessBlock: React.FC<ResumeAccessBlockProps> = ({
  config,
}) => {
  const { title, description, primaryAction, secondaryAction } = config;

  return (
    <div className="min-h-screen bg-[#FFFFF8] text-black px-4 py-16 relative overflow-hidden selection:bg-black selection:text-white">
      {/* Paper texture overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />

      <div className="relative z-10 mx-auto flex max-w-xl flex-col items-center justify-center gap-6 rounded-none border border-black/10 bg-[#F5F5F0] p-10 text-center shadow-2xl mt-20">
        <h1 className="text-2xl font-serif font-bold text-black">{title}</h1>
        <p className="text-sm text-gray-600 font-sans">{description}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {primaryAction && (
            <a
              href={primaryAction.href}
              className="group relative inline-flex items-center justify-center overflow-hidden px-6 py-3 bg-black text-white transition-all hover:bg-white hover:text-black border border-black text-sm font-medium tracking-wide"
            >
              {primaryAction.label}
              <div className="absolute inset-0 bg-white transform translate-x-full group-hover:translate-x-0 transition-transform duration-300 mix-blend-difference" />
            </a>
          )}
          {secondaryAction && (
            <a
              href={secondaryAction.href}
              className="inline-flex items-center justify-center text-black border-b border-black px-4 py-3 hover:border-blue-600 hover:text-blue-600 transition-colors text-sm font-medium"
            >
              {secondaryAction.label}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
