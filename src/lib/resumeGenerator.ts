// src/lib/resumeGenerator.ts
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generateUniqueSlug } from "@/lib/slugGenerator";
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
  slug: string;
  published: boolean;
  lastUpdatedAt: string;
}

export const buildResumeProfile = (
  userId: string,
  resumeData: ResumeData,
  enhancedContent: EnhancedResumeContent
): ResumeProfile => {
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

  return {
    userId,
    title: `${personalInfo.name}'s Resume - ${
      resumeData.jobTarget || "Professional"
    }`,
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
    published: true,
    lastUpdatedAt: new Date().toISOString(),
  };
};

export const saveResumeToDB = async (
  resumeProfile: ResumeProfile
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, "resumeProfiles"), {
      ...resumeProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log("Resume saved with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error saving resume:", error);
    throw error;
  }
};
