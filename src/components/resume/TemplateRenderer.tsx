import React, { useMemo } from "react";
import { ResumeProfile, ResumeTemplate } from "@/types";
import {
  SectionCard,
  TimelineItem,
  MailIcon,
  PhoneIcon,
  LocationIcon,
  LinkIcon,
  CodeIcon,
} from "./ResumeVisualPrimitives";
import {
  normalizeSkills,
  normalizeTimelineItems,
  normalizeProjects,
} from "./templateRendererUtils";
interface TemplateRendererProps {
  template: ResumeTemplate;
  data: ResumeProfile;
}
export const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  template,
  data,
}) => {
  const personalInfo = data.personalInfo || {};
  const contactItems = useMemo(() => {
    const email = personalInfo.email || data.contact?.email?.value;
    const phone = personalInfo.phone || data.contact?.phone?.value;
    return [
      email && {
        label: email,
        href: `mailto:${email}`,
        icon: MailIcon,
      },
      phone && {
        label: phone,
        href: `tel:${phone}`,
        icon: PhoneIcon,
      },
      personalInfo.location && {
        label: personalInfo.location,
        icon: LocationIcon,
      },
      personalInfo.linkedin && {
        label: personalInfo.linkedin.replace(/^https?:\/\//, ""),
        href: personalInfo.linkedin,
        icon: LinkIcon,
      },
      personalInfo.github && {
        label: personalInfo.github.replace(/^https?:\/\//, ""),
        href: personalInfo.github,
        icon: CodeIcon,
      },
    ].filter(Boolean);
  }, [personalInfo, data.contact]);
  const getFieldValue = (fieldId: string) => {
    switch (fieldId) {
      case "name":
        return personalInfo.name || data.title;
      case "title":
        return personalInfo.title || data.title;
      case "email":
        return personalInfo.email || data.contact?.email?.value;
      case "phone":
        return personalInfo.phone || data.contact?.phone?.value;
      case "location":
        return personalInfo.location;
      case "summary":
        return data.summary;
      case "skills":
        return normalizeSkills(data.skills);
      case "experience":
        return normalizeTimelineItems(data.experience);
      case "education":
        return normalizeTimelineItems(data.education);
      case "projects":
        return normalizeProjects(data.projects);
      default:
        return null;
    }
  };
  const renderField = (field: any, value: any) => {
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
        <div
          key={field.id}
          className="flex flex-wrap gap-2"
          aria-label="Skills"
        >
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
                <p className="mt-3 text-sm text-slate-200">
                  {item.description}
                </p>
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

  const orderedSections = template.sections
    .slice()
    .sort((a, b) => a.order - b.order);

  const heroName = personalInfo.name || data.title || "Untitled";
  const heroTitle = personalInfo.title || data.summary?.split(".")[0] || "";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 text-white">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-900/40 p-10 shadow-[0_30px_80px_rgba(2,6,23,0.75)]">
        <div className="absolute inset-0 -z-10 opacity-40">
          <div className="absolute -left-20 top-10 h-80 w-80 rounded-full bg-cyan-500 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-blue-600 blur-[120px]" />
        </div>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-slate-300">
              {template.name}
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
              {heroName}
            </h1>
            {heroTitle && (
              <p className="mt-2 text-lg text-slate-200">{heroTitle}</p>
            )}
            {data.summary && (
              <p className="mt-4 max-w-2xl text-base text-slate-200/80">
                {data.summary}
              </p>
            )}
          </div>
          {contactItems.length > 0 && (
            <div className="flex flex-wrap gap-3 text-sm text-slate-200">
              {contactItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.href ? "_blank" : undefined}
                  rel={item.href ? "noreferrer" : undefined}
                  className="group inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 transition hover:border-cyan-400/60 hover:text-white"
                >
                  <item.icon />
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-6">
        {orderedSections
          .filter((section) => section.id !== "personal_info")
          .map((section) => (
            <SectionCard key={section.id} title={section.title}>
              {section.fields.map((field) =>
                renderField(field, getFieldValue(field.id))
              )}
            </SectionCard>
          ))}
      </div>
    </div>
  );
};
