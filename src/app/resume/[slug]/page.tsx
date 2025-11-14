// src/app/resume/[slug]/page.tsx

import { collection, getDocs, query, where } from "firebase/firestore";
import { notFound } from "next/navigation";

import { db } from "@/lib/firebase";
import { ResumeProfile, Visibility } from "@/types";

export const revalidate = 60; // ISR cache 60 seconds to reflect new publishes.

type EnhancedContent = {
  enhancedSummary?: string;
  enhancedExperience?: Array<{ enhancedDescription?: string }>;
  skillSuggestions?: string[];
};

const MASKED_COPY = {
  masked: "Hidden for privacy",
  request: "Request access to view",
};

const DEFAULT_VISIBILITY_MESSAGE = "Hidden for privacy";

const maskEmail = (value: string) => {
  if (!value.includes("@")) {
    return DEFAULT_VISIBILITY_MESSAGE;
  }
  const [local, domain] = value.split("@");
  const safeLocal = local.slice(0, 1) + "•••";
  const safeDomain = domain.startsWith("gmail") ? "gmail.com" : domain;
  return `${safeLocal}@${safeDomain}`;
};

const maskPhone = (value: string) => {
  const lastFour = value.slice(-4);
  return `••• ${lastFour}`;
};

const renderContactField = (
  value: string,
  visibility: Visibility,
  type: "email" | "phone"
) => {
  if (visibility === "public") {
    return value;
  }

  if (visibility === "masked") {
    return type === "email" ? maskEmail(value) : maskPhone(value);
  }

  if (visibility === "request") {
    return `Request access to view ${type}`;
  }

  return DEFAULT_VISIBILITY_MESSAGE;
};

const parseEnhancedContent = (polished?: string) => {
  if (!polished) {
    return {} as EnhancedContent;
  }

  try {
    const parsed = JSON.parse(polished) as EnhancedContent;
    return parsed;
  } catch (error) {
    console.error("Failed to parse enhanced content", error);
    return {} as EnhancedContent;
  }
};

const countVisibility = (items: Array<{ visibility: Visibility }>) => {
  return items.reduce(
    (acc, item) => {
      if (item.visibility === "masked") {
        acc.masked += 1;
      }
      if (item.visibility === "request") {
        acc.request += 1;
      }
      return acc;
    },
    { masked: 0, request: 0 }
  );
};

const fetchResumeBySlug = async (
  slug: string
): Promise<ResumeProfile | null> => {
  const resumesRef = collection(db, "resumeProfiles");
  const slugQuery = query(
    resumesRef,
    where("slug", "==", slug),
    where("published", "==", true)
  );
  const snapshot = await getDocs(slugQuery);
  if (snapshot.empty) {
    return null;
  }
  return snapshot.docs[0].data() as ResumeProfile;
};

interface ResumePageProps {
  params: {
    slug: string;
  };
}

export default async function ResumePage({ params }: ResumePageProps) {
  const resume = await fetchResumeBySlug(params.slug);

  if (!resume) {
    notFound();
  }

  const enhancedContent = parseEnhancedContent(resume.generatedText?.polished);
  const skillVisibility = countVisibility(resume.skills ?? []);
  const experienceVisibility = countVisibility(resume.experience ?? []);
  const educationVisibility = countVisibility(resume.education ?? []);
  const projectVisibility = countVisibility(resume.projects ?? []);

  const requestOnlyFields =
    resume.contact.email.visibility === "request" ||
    resume.contact.phone.visibility === "request" ||
    [
      skillVisibility,
      experienceVisibility,
      educationVisibility,
      projectVisibility,
    ].some((counts) => counts.request > 0);

  const publicSkills = (resume.skills ?? []).filter(
    (skill) => skill.visibility === "public"
  );
  const publicExperience = (resume.experience ?? []).filter(
    (exp) => exp.visibility === "public"
  );
  const publicEducation = (resume.education ?? []).filter(
    (edu) => edu.visibility === "public"
  );
  const publicProjects = (resume.projects ?? []).filter(
    (project) => project.visibility === "public"
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="text-center mb-2 space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            {resume.title}
          </h1>
          <p className="text-slate-400 text-lg">Professional Resume</p>
          {requestOnlyFields && (
            <p className="text-amber-300 text-sm">
              Some information is available upon request to protect privacy.
            </p>
          )}
        </div>

        <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl p-8 space-y-10">
          <div>
            <div className="text-center mb-4">
              <h2 className="text-3xl font-semibold text-white">
                {resume.contact.email.visibility === "public"
                  ? resume.contact.email.value.split("@")[0]
                  : "Private Candidate"}
              </h2>
              <div className="flex flex-wrap justify-center gap-4 text-slate-300">
                <span>
                  📧{" "}
                  {renderContactField(
                    resume.contact.email.value,
                    resume.contact.email.visibility,
                    "email"
                  )}
                </span>
                {resume.contact.phone.value && (
                  <span>
                    📱{" "}
                    {renderContactField(
                      resume.contact.phone.value,
                      resume.contact.phone.visibility,
                      "phone"
                    )}
                  </span>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-semibold text-cyan-400 mb-4">
                Professional Summary
              </h3>
              <p className="text-slate-300 leading-relaxed">
                {enhancedContent.enhancedSummary || resume.summary}
              </p>
            </div>
          </div>

          {(publicExperience.length > 0 ||
            experienceVisibility.masked > 0 ||
            experienceVisibility.request > 0) && (
            <section className="space-y-6">
              <h3 className="text-2xl font-semibold text-cyan-400">
                Experience
              </h3>
              <div className="space-y-6">
                {publicExperience.length > 0 ? (
                  publicExperience.map((exp, index) => (
                    <div
                      key={index}
                      className="border-l-4 border-cyan-500 pl-6"
                    >
                      <h4 className="text-xl font-semibold text-white">
                        {exp.role}
                      </h4>
                      <p className="text-purple-400 font-medium">
                        {exp.company}
                      </p>
                      <p className="text-slate-400 text-sm mb-2">
                        {exp.startDate} - {exp.endDate || "Present"}
                      </p>
                      <p className="text-slate-300 leading-relaxed">
                        {enhancedContent.enhancedExperience?.[index]
                          ?.enhancedDescription || exp.description}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm">
                    Experience entries are protected for privacy.
                  </p>
                )}
              </div>
              {experienceVisibility.request > 0 && (
                <p className="text-amber-200 text-sm">
                  Additional experience details are available upon request.
                </p>
              )}
              {experienceVisibility.masked > 0 && (
                <p className="text-slate-400 text-sm">
                  Some experience entries are hidden to protect sensitive work.
                </p>
              )}
            </section>
          )}

          {(publicEducation.length > 0 ||
            educationVisibility.masked > 0 ||
            educationVisibility.request > 0) && (
            <section className="space-y-4">
              <h3 className="text-2xl font-semibold text-cyan-400">
                Education
              </h3>
              <div className="space-y-4">
                {publicEducation.length > 0 ? (
                  publicEducation.map((edu, index) => (
                    <div
                      key={index}
                      className="border-l-4 border-purple-500 pl-6"
                    >
                      <h4 className="text-xl font-semibold text-white">
                        {edu.degree}
                      </h4>
                      <p className="text-purple-400 font-medium">
                        {edu.institution}
                      </p>
                      <p className="text-slate-400 text-sm">
                        {edu.startDate} - {edu.endDate || "Present"}
                      </p>
                      {edu.description && (
                        <p className="text-slate-300 mt-2">{edu.description}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm">
                    Education history is kept private.
                  </p>
                )}
              </div>
              {educationVisibility.request > 0 && (
                <p className="text-amber-200 text-sm">
                  Some education details require access approval.
                </p>
              )}
            </section>
          )}

          {(publicSkills.length > 0 ||
            skillVisibility.masked > 0 ||
            skillVisibility.request > 0) && (
            <section>
              <h3 className="text-2xl font-semibold text-cyan-400 mb-4">
                Skills
              </h3>
              <div className="flex flex-wrap gap-3">
                {publicSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 rounded-full text-cyan-300 font-medium"
                  >
                    {skill.name} • {skill.level}
                  </span>
                ))}
                {(skillVisibility.masked > 0 ||
                  skillVisibility.request > 0) && (
                  <span className="px-4 py-2 border border-slate-500 rounded-full text-slate-400 text-sm">
                    Additional skills are protected
                  </span>
                )}
                {enhancedContent.skillSuggestions?.map((skill, index) => (
                  <span
                    key={`suggested-${index}`}
                    className="px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-full text-green-300 font-medium"
                  >
                    {skill} (Suggested)
                  </span>
                ))}
              </div>
            </section>
          )}

          {(publicProjects.length > 0 ||
            projectVisibility.masked > 0 ||
            projectVisibility.request > 0) && (
            <section className="space-y-4">
              <h3 className="text-2xl font-semibold text-cyan-400">Projects</h3>
              <div className="space-y-4">
                {publicProjects.length > 0 ? (
                  publicProjects.map((project, index) => (
                    <div
                      key={index}
                      className="border-l-4 border-pink-500 pl-6"
                    >
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
                  <p className="text-slate-400 text-sm">
                    Projects are kept private.
                  </p>
                )}
              </div>
              {projectVisibility.request > 0 && (
                <p className="text-amber-200 text-sm">
                  Additional project details are available upon request.
                </p>
              )}
            </section>
          )}

          <div className="text-center">
            <p className="text-slate-400 text-sm">
              Created with ❤️ using SwitchCV
            </p>
            <p className="text-slate-500 text-xs mt-2">
              Last updated:{" "}
              {new Date(resume.lastUpdatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
