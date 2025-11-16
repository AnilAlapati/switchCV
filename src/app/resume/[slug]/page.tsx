// src/app/resume/[slug]/page.tsx
/**
 * Public Resume Page
 * Supports both legacy slug-based URLs and new numeric ID URLs
 *
 * Legacy: /resume/name-slug-abc123
 * New: /resume/12345 (numeric ID only)
 */

import { collection, getDocs, query, where } from "firebase/firestore";
import { notFound } from "next/navigation";
import { db } from "@/lib/firebase";
import type { ResumeProfile } from "@/types";
import {
  parseEnhancedContent,
  countVisibility,
} from "@/lib/utils/resumeVisibility";
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

const fetchResumeByNumericId = async (
  numericId: number
): Promise<ResumeProfile | null> => {
  // Skip if numericId is NaN (invalid number)
  if (isNaN(numericId) || numericId === null || numericId === undefined) {
    console.warn("⚠️ Invalid numeric ID:", numericId);
    return null;
  }

  try {
    const resumesRef = collection(db, "resumeProfiles");
    const query_obj = query(
      resumesRef,
      where("numericId", "==", numericId),
      where("published", "==", true)
    );
    const snapshot = await getDocs(query_obj);
    if (snapshot.empty) {
      console.log(`📭 No resume found with numericId: ${numericId}`);
      return null;
    }
    console.log(`✅ Found resume with numericId: ${numericId}`);
    return snapshot.docs[0].data() as ResumeProfile;
  } catch (error) {
    console.error("❌ Error fetching resume by numericId:", error);
    return null;
  }
};

const fetchResumeBySlug = async (
  slug: string
): Promise<ResumeProfile | null> => {
  if (!slug || slug.trim() === "") {
    console.warn("⚠️ Empty slug provided");
    return null;
  }

  try {
    const resumesRef = collection(db, "resumeProfiles");
    const slugQuery = query(
      resumesRef,
      where("slug", "==", slug),
      where("published", "==", true)
    );
    const snapshot = await getDocs(slugQuery);
    if (snapshot.empty) {
      console.log(`📭 No resume found with slug: ${slug}`);
      return null;
    }
    console.log(`✅ Found resume with slug: ${slug}`);
    return snapshot.docs[0].data() as ResumeProfile;
  } catch (error) {
    console.error("❌ Error fetching resume by slug:", error);
    return null;
  }
};

const fetchResumeByDocId = async (
  docId: string
): Promise<ResumeProfile | null> => {
  // Try to fetch by Firestore document ID (fallback for resumes without numericId)
  const { getDoc, doc } = await import("firebase/firestore");
  const docRef = doc(db, "resumeProfiles", docId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    return null;
  }
  const data = docSnap.data() as ResumeProfile;
  // Only return if published
  if (data.published) {
    return data;
  }
  return null;
};

interface ResumePageProps {
  params: {
    slug: string;
  };
}

export default async function ResumePage({ params }: ResumePageProps) {
  const { slug } = params;

  console.log("🔍 Loading resume with slug/id:", slug);

  let resume: ResumeProfile | null = null;

  // Check if slug is numeric (new format: /resume/12345)
  const isNumeric = /^\d+$/.test(slug);

  if (isNumeric) {
    console.log("📊 Detected numeric format, trying numericId lookup...");
    const numericId = parseInt(slug, 10);
    resume = await fetchResumeByNumericId(numericId);

    // Fallback: if no numericId found, try as Firestore document ID
    if (!resume) {
      console.log("📭 No numeric ID match, trying document ID fallback...");
      resume = await fetchResumeByDocId(slug);
    }
  } else {
    console.log("📝 Detected slug format, trying slug lookup...");
    // Legacy format: /resume/name-slug-abc123
    // Or could be a Firestore document ID
    resume = await fetchResumeBySlug(slug);

    // Fallback: if no slug found, try as Firestore document ID
    if (!resume) {
      console.log("📭 No slug match, trying document ID fallback...");
      resume = await fetchResumeByDocId(slug);
    }
  }

  if (!resume) {
    console.error("❌ Resume not found for:", slug);
    notFound();
  }

  console.log("✅ Resume found, rendering...", {
    title: resume.title,
    published: resume.published,
  });

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
