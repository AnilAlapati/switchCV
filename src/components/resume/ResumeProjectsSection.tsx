"use client";

import type { ResumeProfile } from "@/types";
import { hasRequestItems } from "@/lib/utils/resumeVisibility";

interface ResumeProjectsSectionProps {
  projects: ResumeProfile["projects"];
}

export function ResumeProjectsSection({
  projects,
}: ResumeProjectsSectionProps) {
  const publicProjects = projects.filter((p) => p.visibility === "public");
  const hasRequests = hasRequestItems(projects);

  if (publicProjects.length === 0 && !hasRequests) {
    return null;
  }

  return (
    <section>
      <div className="space-y-12">
        {publicProjects.length > 0 ? (
          publicProjects.map((project, index) => (
            <div key={project.id || `proj-${index}`} className="group">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-pink-400 transition-colors">
                    {project.name}
                  </h3>
                </div>
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-pink-400 hover:text-pink-300 transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    Visit →
                  </a>
                )}
              </div>
              <p className="text-slate-300 text-sm leading-relaxed font-normal">
                {project.description}
              </p>
            </div>
          ))
        ) : (
          <p className="text-slate-400 text-sm italic">
            Projects are kept private.
          </p>
        )}
      </div>

      {hasRequests && (
        <div className="mt-8 px-4 py-3 rounded-lg bg-pink-900/20 border border-pink-500/30 backdrop-blur">
          <p className="text-pink-300 text-sm font-medium">
            Additional project details are available upon request.
          </p>
        </div>
      )}
    </section>
  );
}
