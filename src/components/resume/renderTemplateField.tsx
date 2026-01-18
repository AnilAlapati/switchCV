import React from "react";
import { TimelineItem } from "./ResumeVisualPrimitives";

interface TemplateField {
  id: string;
  type?: string;
}

export const renderTemplateField = (field: TemplateField, value: unknown) => {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;

  if (field.id === "summary") {
    return (
      <p key={field.id} className="text-lg leading-relaxed text-gray-700">
        {value as React.ReactNode}
      </p>
    );
  }

  if (field.id === "skills") {
    const skills = value as string[];
    return (
      <div key={field.id} className="flex flex-wrap gap-2" aria-label="Skills">
        {skills.map((skill: string) => (
          <span
            key={skill}
            className="border border-black/10 bg-black px-4 py-1 text-sm font-medium text-white"
          >
            {skill}
          </span>
        ))}
      </div>
    );
  }

  if (field.id === "projects") {
    const projects = value as TimelineItem[];
    return (
      <div key={field.id} className="grid gap-4">
        {projects.map((project: TimelineItem, index: number) => (
          <article
            key={`${project.headline}-${index}`}
            className="border border-black/5 bg-[#F5F5F0] p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h4 className="text-lg font-serif font-bold text-black">
                  {project.headline}
                </h4>
                {project.subline && (
                  <p className="text-sm text-gray-500">{project.subline}</p>
                )}
              </div>
              {project.meta && (
                <span className="text-xs font-mono font-bold uppercase tracking-wide text-gray-400">
                  {project.meta}
                </span>
              )}
            </div>
            {project.description && (
              <p className="mt-3 text-sm text-gray-700">
                {project.description}
              </p>
            )}
            {project.technologies && project.technologies.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {project.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="bg-black/5 px-3 py-1 text-xs uppercase tracking-wide text-gray-700"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}
            {project.url && (
              <a
                href={project.url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                View project
                <span aria-hidden>&rarr;</span>
              </a>
            )}
          </article>
        ))}
      </div>
    );
  }

  if (field.type === "complex_list") {
    const items = value as TimelineItem[];
    return (
      <div key={field.id} className="space-y-5">
        {items.map((item: TimelineItem, index: number) => (
          <article
            key={`${item.headline}-${index}`}
            className="border border-black/5 bg-[#F5F5F0] p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h4 className="text-lg font-serif font-bold text-black">
                  {item.headline}
                </h4>
                {item.subline && (
                  <p className="text-sm text-gray-500">{item.subline}</p>
                )}
              </div>
              {item.meta && (
                <span className="text-xs font-mono font-bold uppercase tracking-wide text-gray-400">
                  {item.meta}
                </span>
              )}
            </div>
            {item.description && (
              <p className="mt-3 text-sm text-gray-700">{item.description}</p>
            )}
            {item.bullets && item.bullets.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-gray-700">
                {item.bullets.map((bullet, bulletIndex) => (
                  <li key={`${item.headline}-${bulletIndex}`}>{bullet as React.ReactNode}</li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    );
  }

  if (field.type === "list") {
    const items = value as string[];
    return (
      <ul key={field.id} className="space-y-2">
        {items.map((item: string, index: number) => (
          <li
            key={`${field.id}-${index}`}
            className="flex items-center gap-2 text-gray-700"
          >
            <span className="h-2 w-2 bg-blue-600" />
            {item}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p key={field.id} className="text-gray-700">
      {value as React.ReactNode}
    </p>
  );
};

