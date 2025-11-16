// src/lib/resumeGenerator.ts
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generateUniqueSlug } from "@/lib/slugGenerator";
import { generateNumericResumeId } from "@/lib/numericIdGenerator";
import { logger } from "@/lib/logger";
import type { ResumeData } from "@/hooks/useAIConversation";

export interface EnhancedResumeContent {
  enhancedSummary: string;
  enhancedExperience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
    achievements: string[];
    enhancedDescription: string;
  }>;
  skillSuggestions: string[];
  improvementTips: string[];
}

export interface ResumeProfile {
  userId: string;
  numericId?: number; // New: numeric ID for public resume URL
  title: string;
  summary: string;
  skills: Array<{
    name: string;
    level: string;
    visibility: "public" | "private";
  }>;
  experience: Array<{
    company: string;
    role: string;
    startDate: string;
    description: string;
    visibility: "public" | "private";
  }>;
  education: Array<{
    institution: string;
    degree: string;
    startDate: string;
    visibility: "public" | "private";
  }>;
  contact: {
    email: { value: string; visibility: "public" | "private" };
    phone: { value: string; visibility: "public" | "private" };
  };
  projects: Array<any>;
  generatedText: {
    draft: string;
    polished: string;
    lastGeneratedAt: string;
  };
  slug: string; // Keep for backward compatibility
  published: boolean;
  lastUpdatedAt: string;
}

export const buildResumeProfile = async (
  userId: string,
  resumeData: ResumeData,
  enhancedContent: EnhancedResumeContent
): Promise<ResumeProfile> => {
  const personalInfo = resumeData.personalInfo || {};
  const structuredData = {
    personalInfo: {
      name: personalInfo.name,
      email: personalInfo.email,
      location: personalInfo.location,
    },
    summary: `Seeking ${resumeData.jobTarget || "new opportunities"}`,
    experience: [
      {
        title: "Professional Experience",
        company: "Previous Company",
        duration: "Recent",
        description: resumeData.experience || "",
        achievements: [],
      },
    ],
    education: [
      {
        degree: resumeData.education || "",
        institution: "",
        year: "",
      },
    ],
    skills: resumeData.skills
      ? resumeData.skills.split(",").map((s) => s.trim())
      : [],
  };

  const slug = generateUniqueSlug(personalInfo.name || "resume");

  // Generate numeric ID for the resume
  const numericId = await generateNumericResumeId();

  // Build title safely - avoid "undefined" in title
  const personName = personalInfo.name?.trim() || "Professional";
  const jobTarget = resumeData.jobTarget?.trim() || "Resume";
  const titleText = `${personName}'s ${jobTarget}`;

  return {
    userId,
    title: titleText,
    summary: enhancedContent.enhancedSummary,
    skills: (resumeData.skills
      ? resumeData.skills.split(",").map((s) => s.trim())
      : []
    )
      .concat(enhancedContent.skillSuggestions || [])
      .map((skill) => ({
        name: skill,
        level: "intermediate",
        visibility: "public" as const,
      })),
    experience: enhancedContent.enhancedExperience.map(
      (exp: (typeof enhancedContent.enhancedExperience)[0]) => ({
        company: exp.company,
        role: exp.title,
        startDate: exp.duration,
        description: exp.enhancedDescription,
        visibility: "public" as const,
      })
    ),
    education: [
      {
        institution: "",
        degree: resumeData.education || "",
        startDate: "",
        visibility: "public" as const,
      },
    ],
    contact: {
      email: {
        value: personalInfo.email || "",
        visibility: "public" as const,
      },
      phone: { value: "", visibility: "public" as const },
    },
    projects: [],
    generatedText: {
      draft: JSON.stringify(structuredData),
      polished: JSON.stringify(enhancedContent),
      lastGeneratedAt: new Date().toISOString(),
    },
    slug,
    numericId, // Add numeric ID
    published: true,
    lastUpdatedAt: new Date().toISOString(),
  };
};

export const saveResumeToDB = async (
  resumeProfile: ResumeProfile,
  authToken?: string
): Promise<string> => {
  try {
    logger.log("📝 Attempting to save resume profile to Firestore...", {
      userId: resumeProfile.userId,
      title: resumeProfile.title,
      published: resumeProfile.published,
      numericId: resumeProfile.numericId,
    });

    const docRef = await addDoc(collection(db, "resumeProfiles"), {
      ...resumeProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    logger.log("✅ Resume saved successfully with Firestore ID:", docRef.id);

    // Map the numeric ID to the Firestore document ID for easy lookups
    if (resumeProfile.numericId && authToken) {
      try {
        // Call the API endpoint to create the ID mapping
        // This avoids importing firebase-admin in client code
        const response = await fetch("/api/resume/map-id", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            resumeId: resumeProfile.numericId,
            documentId: docRef.id,
          }),
        });

        if (!response.ok) {
          logger.warn(
            "⚠️ Failed to create resume ID mapping via API:",
            await response.text()
          );
        } else {
          const result = await response.json();
          logger.log("✅ Resume ID mapping created:", result);
        }
      } catch (mappingError) {
        logger.warn(
          "⚠️ Failed to create resume ID mapping, but resume was saved:",
          {
            error: mappingError,
            numericId: resumeProfile.numericId,
            documentId: docRef.id,
          }
        );
        // Don't throw - resume is already saved, mapping is just for convenience
      }
    } else if (resumeProfile.numericId && !authToken) {
      logger.warn("⚠️ No auth token provided for resume ID mapping");
    } else {
      logger.warn("⚠️ No numeric ID available for resume mapping");
    }

    return docRef.id;
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown error occurred while saving resume";

    logger.error("❌ Error saving resume to Firestore:", {
      error: errorMessage,
      errorDetails: error,
      profileData: {
        userId: resumeProfile.userId,
        title: resumeProfile.title,
      },
    });

    throw new Error(`Failed to save resume: ${errorMessage}`);
  }
};
