// src/app/resume/[slug]/page.tsx
/**
 * Public Resume Page (Client-side rendered)
 * Supports both legacy slug-based URLs and new numeric ID URLs
 *
 * Legacy: /resume/name-slug-abc123
 * New: /resume/12345 (numeric ID only)
 *
 * Client-side rendering is necessary because Firestore security rules
 * require proper authentication context, which server-side requests don't have.
 */

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ResumeProfile } from "@/types";
import {
  parseEnhancedContent,
  countVisibility,
} from "@/lib/utils/resumeVisibility";
import { ResumePageLayout } from "@/components/resume/ResumePageLayout";

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
    console.error("Error details:", {
      numericId,
      message: error instanceof Error ? error.message : "Unknown error",
    });
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

export default function ResumePage() {
  const params = useParams();
  const slug = params?.slug as string | undefined;
  const router = useRouter();

  const [resume, setResume] = useState<ResumeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadResume = async () => {
      if (!slug) {
        console.warn("⚠️ No slug provided");
        setError("Invalid resume URL");
        setLoading(false);
        return;
      }

      console.log("🔍 Loading resume with slug/id:", slug);

      let resumeData: ResumeProfile | null = null;

      // Check if slug is numeric (new format: /resume/12345)
      const isNumeric = /^\d+$/.test(slug);

      if (isNumeric) {
        console.log("📊 Detected numeric format, trying numericId lookup...");
        const numericId = parseInt(slug, 10);
        resumeData = await fetchResumeByNumericId(numericId);

        // Fallback: if no numericId found, try as slug
        if (!resumeData) {
          console.log("📭 No numeric ID match, trying slug lookup...");
          resumeData = await fetchResumeBySlug(slug);
        }
      } else {
        console.log("📝 Detected slug format, trying slug lookup...");
        // Legacy format: /resume/name-slug-abc123
        resumeData = await fetchResumeBySlug(slug);
      }

      if (!resumeData) {
        console.error("❌ Resume not found for:", slug);
        setError("Resume not found");
      } else {
        console.log("✅ Resume found, rendering...", {
          title: resumeData.title,
          published: resumeData.published,
        });
        setResume(resumeData);
      }

      setLoading(false);
    };

    loadResume();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-500 mx-auto"></div>
          <p className="text-slate-400">Loading resume...</p>
        </div>
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400 text-xl font-semibold">
            {error || "Resume not found"}
          </p>
          <p className="text-slate-400">
            This resume may have been deleted or is not publicly available.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
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
    <ResumePageLayout
      resume={resume}
      enhancedContent={enhancedContent}
      requestOnlyFields={requestOnlyFields}
    />
  );
}
