// src/app/resume/[slug]/page.tsx

import { collection, getDocs, query, where } from "firebase/firestore";
import { notFound } from "next/navigation";
import { db } from "@/lib/firebase";
import type { ResumeProfile, Visibility } from "@/types";
import { renderContactField, parseEnhancedContent, countVisibility } from "@/lib/utils/resumeVisibility";
import { ResumeContactSection } from "@/components/resume/ResumeContactSection";
import { ResumeExperienceSection } from "@/components/resume/ResumeExperienceSection";
import { ResumeEducationSection } from "@/components/resume/ResumeEducationSection";
import { ResumeSkillsSection } from "@/components/resume/ResumeSkillsSection";
import { ResumeProjectsSection } from "@/components/resume/ResumeProjectsSection";

export const revalidate = 60;

type EnhancedContent = {
  enhancedSummary?: string;
  enhancedExperience?: Array<{ enhancedDescription?: string }>;
  skillSuggestions?: string[];
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

  const enhancedContent = parseEnhancedContent(
    resume.generatedText?.polished
  ) as EnhancedContent;
  
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
          <ResumeContactSection resume={resume} />

          <ResumeExperienceSection
            experience={resume.experience ?? []}
            enhancedExperience={enhancedContent.enhancedExperience as any}
          />

          <ResumeEducationSection education={resume.education ?? []} />

          <ResumeSkillsSection
            skills={resume.skills ?? []}
            skillSuggestions={enhancedContent.skillSuggestions}
          />

          <ResumeProjectsSection projects={resume.projects ?? []} />

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
