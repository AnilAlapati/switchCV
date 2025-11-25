import React from "react";
import { TimelineItem } from "./ResumeVisualPrimitives";

export const renderTemplateField = (field: any, value: any) => {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;

  if (field.id === "summary") {
    return (
      <p key={field.id} className="text-lg leading-relaxed text-slate-200">
        {value}
      </p>
    );
  }

  if (field.id === "skills") {
    return (
      <div key={field.id} className="flex flex-wrap gap-2" aria-label="Skills">
        {value.map((skill: string) => (
          <span
            key={skill}
            className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1 text-sm font-medium text-cyan-100"
          >
            {skill}
          </span>
        ))}
      </div>
    );
  }

  if (field.id === "projects") {
    return (
      <div key={field.id} className="grid gap-4">
        {value.map((project: TimelineItem, index: number) => (
          <article
            key={`${project.headline}-${index}`}
            className="rounded-2xl border border-white/5 bg-slate-900/40 p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold text-white">
                  {project.headline}
                </h4>
                {project.subline && (
                  <p className="text-sm text-slate-400">{project.subline}</p>
                )}
              </div>
              {project.meta && (
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {project.meta}
                </span>
              )}
            </div>
            {project.description && (
              <p className="mt-3 text-sm text-slate-200">
                {project.description}
              </p>
            )}
            {project.technologies && project.technologies.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {project.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-slate-200"
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
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300"
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
    return (
      <div key={field.id} className="space-y-5">
        {value.map((item: TimelineItem, index: number) => (
          <article
            key={`${item.headline}-${index}`}
            className="rounded-2xl border border-white/5 bg-slate-900/40 p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold text-white">
                  {item.headline}
                </h4>
                {item.subline && (
                  <p className="text-sm text-slate-400">{item.subline}</p>
                )}
              </div>
              {item.meta && (
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {item.meta}
                </span>
              )}
            </div>
            {item.description && (
              <p className="mt-3 text-sm text-slate-200">{item.description}</p>
            )}
            {item.bullets && item.bullets.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-slate-200/90">
                {item.bullets.map((bullet, bulletIndex) => (
                  <li key={`${item.headline}-${bulletIndex}`}>{bullet}</li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    );
  }

  if (field.type === "list") {
    return (
      <ul key={field.id} className="space-y-2">
        {value.map((item: string, index: number) => (
          <li
            key={`${field.id}-${index}`}
            className="flex items-center gap-2 text-slate-200"
          >
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            {item}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p key={field.id} className="text-slate-200">
      {value}
    </p>
  );
};
