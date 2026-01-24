import React from "react";
import { RESUME_TEMPLATES } from "@/lib/templates/resumeTemplates";
import { notFound } from "next/navigation";
import { DemoResumeRenderer } from "./DemoResumeRenderer";
import { DIVERSE_DEMO_RESUMES } from "@/lib/data/diverseDemoResumes";
import { selectBestTemplate } from "@/lib/agents/templateSelector/templateSelectorAgent";
import { getSystemConfig } from "@/lib/getSystemConfig";

interface DemoResumePageProps {
  params: Promise<{ id: string }>;
}

export default async function DemoResumePage({
  params,
}: DemoResumePageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const resumeData = DIVERSE_DEMO_RESUMES[id];

  if (!resumeData) {
    notFound();
  }

  // Check if this demo resume ID is allowed in production
  const config = await getSystemConfig();
  const isAllowed = config.demoResumes.allowedIds.includes(id);

  // In production, only show allowed demo resumes
  // Dev mode bypasses this check for testing all templates
  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true";

  if (!isAllowed && !isDevMode) {
    notFound();
  }

  // Use the Template Selector Agent to pick the best template
  const recommendation = selectBestTemplate(resumeData);
  const template =
    RESUME_TEMPLATES.find((t) => t.id === recommendation.recommendedTemplate) ||
    RESUME_TEMPLATES[0];

  return <DemoResumeRenderer template={template} resumeData={resumeData} />;
}
