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
    <section className="space-y-4">
      <h3 className="text-2xl font-semibold text-cyan-400">Projects</h3>
      <div className="space-y-4">
        {publicProjects.length > 0 ? (
          publicProjects.map((project, index) => (
            <div key={index} className="border-l-4 border-pink-500 pl-6">
              <h4 className="text-xl font-semibold text-white">
                {project.name}
              </h4>
              {project.url && (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-400 hover:text-pink-300 font-medium"
                >
                  🔗 View Project
                </a>
              )}
              <p className="text-slate-300 mt-2 leading-relaxed">
                {project.description}
              </p>
            </div>
          ))
        ) : (
          <p className="text-slate-400 text-sm">Projects are kept private.</p>
        )}
      </div>
      {hasRequests && (
        <p className="text-amber-200 text-sm">
          Additional project details are available upon request.
        </p>
      )}
    </section>
  );
}
