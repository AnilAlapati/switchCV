"use client";

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
import { MasonryResumeRenderer } from "./MasonryResumeRenderer";
import { BentoResumeRenderer } from "./BentoResumeRenderer";
import { TerminalResumeRenderer } from "./TerminalResumeRenderer";
import { EditorialResumeRenderer } from "./EditorialResumeRenderer";
import { NoirResumeRenderer } from "./NoirResumeRenderer";
import { CREATIVE_TEMPLATES_ENABLED } from "@/lib/features/creativeTemplates";
import { SignalResumeRenderer } from "./SignalResumeRenderer";
import { AtlasResumeRenderer } from "./AtlasResumeRenderer";
import { ClarityResumeRenderer } from "./ClarityResumeRenderer";
import { VelocityResumeRenderer } from "./VelocityResumeRenderer";
import { NarrativeResumeRenderer } from "./NarrativeResumeRenderer";
import { StudioResumeRenderer } from "./StudioResumeRenderer";

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

const buildContactHref = (field: ContactField, value: string) => {
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
  // Route to specialized renderers for premium templates
  if (template.id === "masonry-v1") {
    return (
      <MasonryResumeRenderer
        template={template}
        data={data}
        isAuthenticated={isAuthenticated}
        onRequestAccess={onRequestAccess}
      />
    );
  }

  if (template.id === "bento-v1") {
    return (
      <BentoResumeRenderer
        template={template}
        data={data}
        isAuthenticated={isAuthenticated}
        onRequestAccess={onRequestAccess}
      />
    );
  }

  if (template.id === "terminal-v1") {
    return (
      <TerminalResumeRenderer
        template={template}
        data={data}
        isAuthenticated={isAuthenticated}
        onRequestAccess={onRequestAccess}
      />
    );
  }

  if (template.id === "signal-v1") {
    return (
      <SignalResumeRenderer
        template={template}
        data={data}
        isAuthenticated={isAuthenticated}
        onRequestAccess={onRequestAccess}
      />
    );
  }

  if (template.id === "atlas-v1") {
    return (
      <AtlasResumeRenderer
        template={template}
        data={data}
        isAuthenticated={isAuthenticated}
        onRequestAccess={onRequestAccess}
      />
    );
  }

  if (template.id === "clarity-v1") {
    return (
      <ClarityResumeRenderer
        template={template}
        data={data}
        isAuthenticated={isAuthenticated}
        onRequestAccess={onRequestAccess}
      />
    );
  }

  if (template.id === "velocity-v1") {
    return (
      <VelocityResumeRenderer
        template={template}
        data={data}
        isAuthenticated={isAuthenticated}
        onRequestAccess={onRequestAccess}
      />
    );
  }

  if (template.id === "narrative-v1") {
    return (
      <NarrativeResumeRenderer
        template={template}
        data={data}
        isAuthenticated={isAuthenticated}
        onRequestAccess={onRequestAccess}
      />
    );
  }

  if (template.id === "studio-v1") {
    return (
      <StudioResumeRenderer
        template={template}
        data={data}
        isAuthenticated={isAuthenticated}
        onRequestAccess={onRequestAccess}
      />
    );
  }

  // Enterprise templates (only if feature enabled)
  if (CREATIVE_TEMPLATES_ENABLED && template.id === "editorial-v1") {
    return (
      <EditorialResumeRenderer
        template={template}
        data={data}
        isAuthenticated={isAuthenticated}
        onRequestAccess={onRequestAccess}
      />
    );
  }

  if (CREATIVE_TEMPLATES_ENABLED && template.id === "noir-v1") {
    return (
      <NoirResumeRenderer
        template={template}
        data={data}
        isAuthenticated={isAuthenticated}
        onRequestAccess={onRequestAccess}
      />
    );
  }

  const personalInfo = data.personalInfo || {};
  const viewerAccess = (data.viewerAccess as ViewerAccessMeta) || {};
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
      const valueToMask = entryValue || personalValue;
      if (valueToMask) {
        return { label: renderContactField(valueToMask, "masked", field) };
      }
      return { label: "Available upon request" };
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
        return (data as unknown as Record<string, unknown>)[fieldId] || null;
    }
  };

  const orderedSections = template.sections
    .slice()
    .sort((a, b) => a.order - b.order);

  const heroName = personalInfo.name || data.title || "Untitled";
  const heroTitle = personalInfo.title || data.summary?.split(".")[0] || "";

  const isSnapshot = viewerAccess.isSnapshot === true;

  return (
    <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-8 text-black">
      <section className="relative overflow-hidden border border-black/10 bg-[#F5F5F0] p-10 shadow-2xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-gray-400">
              {template.name}
            </p>
            <h1 className="mt-4 text-4xl font-serif font-bold tracking-tight text-black md:text-5xl">
              {heroName}
            </h1>
            {heroTitle && (
              <p className="mt-2 text-lg text-gray-600">{heroTitle}</p>
            )}
            {data.summary && (
              <p className="mt-4 max-w-2xl text-base text-gray-600 leading-relaxed">
                {data.summary}
              </p>
            )}
          </div>
          {contactItems.length > 0 && (
            <div className="flex flex-wrap gap-3 text-sm text-gray-700">
              {contactItems.map((item, idx) => (
                <a
                  key={`${item.label}-${idx}`}
                  href={item.href}
                  target={item.href ? "_blank" : undefined}
                  rel={item.href ? "noreferrer" : undefined}
                  className="group inline-flex items-center gap-2 border border-black/10 bg-white px-4 py-2 transition hover:border-blue-600 hover:text-blue-600"
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
                renderTemplateField(field, getFieldValue(field.id)),
              )}
            </SectionCard>
          ))}

        {isSnapshot && (
          <div className="relative overflow-hidden border border-black/10 bg-gradient-to-r from-gray-50 to-blue-50 p-8 text-center">
            <h3 className="mb-2 text-xl font-serif font-bold text-black">
              Want to see the full resume?
            </h3>
            <p className="mb-6 text-gray-600">
              {isAuthenticated
                ? "Request access to view detailed work experience, education, and projects."
                : "Sign in or request access to view detailed work experience, education, and projects."}
            </p>
            {isAuthenticated ? (
              <button
                onClick={onRequestAccess}
                className="group relative inline-flex items-center justify-center overflow-hidden px-8 py-3 bg-black text-white transition-all hover:bg-white hover:text-black border border-black text-sm font-medium tracking-wide"
              >
                Request Access
                <div className="absolute inset-0 bg-white transform translate-x-full group-hover:translate-x-0 transition-transform duration-300 mix-blend-difference" />
              </button>
            ) : (
              <a
                href="/auth"
                className="group relative inline-flex items-center justify-center overflow-hidden px-8 py-3 bg-black text-white transition-all hover:bg-white hover:text-black border border-black text-sm font-medium tracking-wide"
              >
                Sign in to View Full Profile
                <div className="absolute inset-0 bg-white transform translate-x-full group-hover:translate-x-0 transition-transform duration-300 mix-blend-difference" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
