import React from "react";
import { ResumeProfile, ResumeTemplate } from "@/types";
import {
  SectionCard,
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
import { renderContactField } from "@/lib/utils/resumeVisibility";
import { renderTemplateField } from "./renderTemplateField";

type VisibilityLevel = "public" | "masked" | "request";
type ContactField = "email" | "phone";

interface ViewerAccessMeta {
  scope?: string;
  isOwner?: boolean;
  isMasked?: boolean;
  isSnapshot?: boolean;
}

interface TemplateRendererProps {
  template: ResumeTemplate;
  data: ResumeProfile & {
    viewerAccess?: ViewerAccessMeta;
  };
  isAuthenticated?: boolean;
  onRequestAccess?: () => void;
}

const CONTACT_FULL_VIEW_SCOPES = new Set(["admin-view", "full"]);

interface ContactDisplay {
  label: string;
  href?: string;
}

const buildContactHref = (field: ContactField, value?: string) => {
  if (!value) {
    return undefined;
  }

  if (field === "email") {
    return `mailto:${value}`;
  }

  const digits = value.replace(/\D+/g, "");
  return digits ? `tel:${digits}` : undefined;
};

export const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  template,
  data,
  isAuthenticated = false,
  onRequestAccess,
}) => {
  const personalInfo = data.personalInfo || {};
  const viewerAccess = (data.viewerAccess as ViewerAccessMeta) ?? {};
  const allowsFullContact =
    viewerAccess.isOwner === true ||
    (viewerAccess.scope
      ? CONTACT_FULL_VIEW_SCOPES.has(viewerAccess.scope)
      : false);
  const isMaskedView = viewerAccess.isMasked === true;

  // Determine contact presentation for the current viewer
  const resolveContact = (field: ContactField): ContactDisplay | null => {
    const contactEntry = data.contact?.[field] as
      | { value?: string; visibility?: VisibilityLevel }
      | undefined;

    const personalValue = (personalInfo as Record<string, string | undefined>)[
      field
    ];
    const visibility =
      (contactEntry?.visibility as VisibilityLevel) ?? "public";
    const entryValue =
      typeof contactEntry?.value === "string" ? contactEntry.value : undefined;
    const baseValue = entryValue || personalValue || "";

    if (allowsFullContact) {
      if (!baseValue) {
        return null;
      }

      return {
        label: baseValue,
        href: buildContactHref(field, baseValue),
      };
    }

    if (isMaskedView) {
      const maskedLabel =
        entryValue ||
        personalValue ||
        (visibility === "request"
          ? "Available upon request"
          : baseValue
          ? renderContactField(baseValue, "masked", field)
          : "Available upon request");

      return maskedLabel ? { label: maskedLabel } : null;
    }

    if (visibility === "public") {
      if (!baseValue) {
        return null;
      }

      return {
        label: baseValue,
        href: buildContactHref(field, baseValue),
      };
    }

    if (visibility === "masked") {
      if (!baseValue) {
        return null;
      }

      return {
        label: renderContactField(baseValue, "masked", field),
      };
    }

    return { label: "Available upon request" };
  };

  const emailContact = resolveContact("email");
  const phoneContact = resolveContact("phone");

  const contactItems: Array<{
    label: string;
    href?: string;
    icon: React.ComponentType;
  }> = [];

  if (emailContact?.label) {
    contactItems.push({
      label: emailContact.label,
      href: emailContact.href,
      icon: MailIcon,
    });
  }

  if (phoneContact?.label) {
    contactItems.push({
      label: phoneContact.label,
      href: phoneContact.href,
      icon: PhoneIcon,
    });
  }

  if (personalInfo.location) {
    contactItems.push({
      label: personalInfo.location,
      icon: LocationIcon,
    });
  }

  if (personalInfo.linkedin) {
    contactItems.push({
      label: personalInfo.linkedin.replace(/^https?:\/\//, ""),
      href: personalInfo.linkedin,
      icon: LinkIcon,
    });
  }

  if (personalInfo.github) {
    contactItems.push({
      label: personalInfo.github.replace(/^https?:\/\//, ""),
      href: personalInfo.github,
      icon: CodeIcon,
    });
  }

  const getFieldValue = (fieldId: string) => {
    switch (fieldId) {
      case "name":
        return personalInfo.name || data.title;
      case "title":
        return personalInfo.title || data.title;
      case "email":
        return emailContact?.label || personalInfo.email;
      case "phone":
        return phoneContact?.label || personalInfo.phone;
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

  const orderedSections = template.sections
    .slice()
    .sort((a, b) => a.order - b.order);

  const heroName = personalInfo.name || data.title || "Untitled";
  const heroTitle = personalInfo.title || data.summary?.split(".")[0] || "";

  const isSnapshot = viewerAccess.isSnapshot === true;

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
          .filter((section) => {
            if (section.id === "personal_info") return false;
            if (isSnapshot) {
              // In snapshot mode, we only show the header card (rendered above)
              // All other sections (Skills, Experience, etc.) are hidden
              return false;
            }
            return true;
          })
          .map((section) => (
            <SectionCard key={section.id} title={section.title}>
              {section.fields.map((field) =>
                renderTemplateField(field, getFieldValue(field.id))
              )}
            </SectionCard>
          ))}

        {isSnapshot && (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 p-8 text-center backdrop-blur-sm">
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent to-slate-900/90" />
            <h3 className="mb-2 text-xl font-semibold text-white">
              Want to see the full resume?
            </h3>
            <p className="mb-6 text-slate-400">
              {isAuthenticated
                ? "Request access to view detailed work experience, education, and projects."
                : "Sign in or request access to view detailed work experience, education, and projects."}
            </p>
            {isAuthenticated ? (
              <button
                onClick={onRequestAccess}
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Request Access
              </button>
            ) : (
              <a
                href="/auth"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Sign in to View Full Profile
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
