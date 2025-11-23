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
    <div className="min-h-screen bg-gray-900 text-white px-4 py-16">
      <div className="mx-auto flex max-w-xl flex-col items-center justify-center gap-6 rounded-2xl border border-white/10 bg-slate-900/80 p-10 text-center shadow-xl">
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <p className="text-sm text-slate-300">{description}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {primaryAction && (
            <a
              href={primaryAction.href}
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow hover:bg-blue-500"
            >
              {primaryAction.label}
            </a>
          )}
          {secondaryAction && (
            <a
              href={secondaryAction.href}
              className="rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-slate-200 hover:border-white/40"
            >
              {secondaryAction.label}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
