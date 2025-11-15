// src/components/resume/PreviewProjects.tsx
import { ResumeProfile } from "@/types";
import { VisibilityBadge } from "../VisibilityControls";

interface PreviewProjectsProps {
  profile: Partial<ResumeProfile>;
}

export const PreviewProjects = ({ profile }: PreviewProjectsProps) => {
  if (!profile.projects || profile.projects.length === 0) return null;

  return (
    <section>
      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
        🚀 Projects
      </h3>
      <div className="space-y-4">
        {profile.projects.map((project, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-semibold text-gray-900">{project.name}</h4>
              <VisibilityBadge value={project.visibility} />
            </div>
            {project.url && (
              <p className="text-indigo-600 text-xs sm:text-sm mb-2 truncate">
                🔗{" "}
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {project.url}
                </a>
              </p>
            )}
            {project.description && (
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                {project.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
