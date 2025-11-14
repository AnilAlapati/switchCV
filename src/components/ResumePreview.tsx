// src/components/ResumePreview.tsx
"use client";

import { ResumeProfile } from "@/types";
import { VisibilityBadge } from "./VisibilityControls";

interface ResumePreviewProps {
  profile: Partial<ResumeProfile>;
  compact?: boolean;
}

/**
 * ResumePreview Component
 *
 * Displays a live preview of the resume being edited.
 * Shows all sections with real-time updates as the user edits.
 */
export const ResumePreview = ({
  profile,
  compact = false,
}: ResumePreviewProps) => {
  if (
    !profile.title &&
    !profile.summary &&
    (profile.experience || []).length === 0
  ) {
    return (
      <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <p className="text-gray-500">
          👀 Your resume preview will appear here as you fill in the form
        </p>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${
        !compact && "shadow-lg"
      }`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-8">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">
          {profile.title || "Resume Title"}
        </h2>
        {profile.summary && (
          <p className="text-indigo-100 text-sm sm:text-base line-clamp-2">
            {profile.summary}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="px-6 py-8 space-y-8">
        {/* Professional Summary */}
        {profile.summary && (
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              📝 Professional Summary
            </h3>
            <p className="text-gray-700 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
              {profile.summary}
            </p>
          </section>
        )}

        {/* Work Experience */}
        {(profile.experience || []).length > 0 && (
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              💼 Work Experience
            </h3>
            <div className="space-y-4">
              {(profile.experience || []).map((exp, index) => (
                <div key={index} className="border-l-4 border-indigo-600 pl-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {exp.role}
                      </h4>
                      <p className="text-purple-600 text-sm">{exp.company}</p>
                    </div>
                    <VisibilityBadge value={exp.visibility} />
                  </div>
                  <p className="text-gray-600 text-xs sm:text-sm mb-2">
                    {exp.startDate} {exp.endDate && `- ${exp.endDate}`}
                  </p>
                  {exp.description && (
                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                      {exp.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {(profile.education || []).length > 0 && (
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              🎓 Education
            </h3>
            <div className="space-y-4">
              {(profile.education || []).map((edu, index) => (
                <div key={index} className="border-l-4 border-purple-600 pl-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {edu.degree}
                      </h4>
                      <p className="text-purple-600 text-sm">
                        {edu.institution}
                      </p>
                    </div>
                    <VisibilityBadge value={edu.visibility} />
                  </div>
                  {edu.startDate && (
                    <p className="text-gray-600 text-xs sm:text-sm mb-2">
                      {edu.startDate} {edu.endDate && `- ${edu.endDate}`}
                    </p>
                  )}
                  {edu.description && (
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {edu.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {(profile.skills || []).length > 0 && (
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              🎯 Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {(profile.skills || []).map((skill, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-full border border-indigo-200"
                >
                  <span className="text-sm font-medium text-indigo-900">
                    {skill.name}
                  </span>
                  {skill.level !== "intermediate" && (
                    <span className="text-xs text-indigo-600 capitalize">
                      ({skill.level})
                    </span>
                  )}
                  <VisibilityBadge value={skill.visibility} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {(profile.projects || []).length > 0 && (
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              🚀 Projects
            </h3>
            <div className="space-y-4">
              {(profile.projects || []).map((project, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900">
                      {project.name}
                    </h4>
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
        )}

        {/* Contact Information */}
        {(profile.contact?.email?.value || profile.contact?.phone?.value) && (
          <section className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              📧 Contact
            </h3>
            <div className="space-y-2 text-sm sm:text-base">
              {profile.contact?.email?.value && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">📧</span>
                  <span className="text-gray-900 flex-1">
                    {profile.contact.email.value}
                  </span>
                  <VisibilityBadge value={profile.contact.email.visibility} />
                </div>
              )}
              {profile.contact?.phone?.value && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">📱</span>
                  <span className="text-gray-900 flex-1">
                    {profile.contact.phone.value}
                  </span>
                  <VisibilityBadge value={profile.contact.phone.visibility} />
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

/**
 * ResumePreviewPanel Component
 *
 * Displays the resume preview in a two-column layout.
 * Form on the left, preview on the right (desktop) or stacked (mobile).
 */
export const ResumePreviewPanel = ({
  profile,
  children,
}: {
  profile: Partial<ResumeProfile>;
  children: React.ReactNode;
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <div className="lg:max-h-screen lg:overflow-y-auto">{children}</div>

      {/* Preview */}
      <div className="lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4 text-sm font-medium text-gray-700">
            👁️ Live Preview
          </div>
          <ResumePreview profile={profile} />
        </div>
      </div>
    </div>
  );
};
