"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { templateService } from "@/lib/services/templateService";
import { TemplateRenderer } from "@/components/resume/TemplateRenderer";
import { LegacyResumeRenderer } from "@/components/resume/LegacyResumeRenderer";
import {
  ResumeAccessBlock,
  ResumeAccessBlockConfig,
} from "@/components/resume/ResumeAccessBlock";
import {
  ResumeToast,
  ResumeToastOverlay,
} from "@/components/resume/ResumeToastOverlay";
import { ResumeTemplate } from "@/types";
import { useAuth } from "@/hooks/useAuth";

export default function ResumeView() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [resume, setResume] = useState<any>(null);
  const [template, setTemplate] = useState<ResumeTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isUpdating, setIsUpdating] = useState(false);
  const [accessBlock, setAccessBlock] =
    useState<ResumeAccessBlockConfig | null>(null);
  const [toast, setToast] = useState<ResumeToast | null>(null);

  const viewerAccess = (resume?.viewerAccess as Record<string, any>) ?? {};
  const viewerIsOwner = Boolean(viewerAccess?.isOwner);
  const isPublicPreview = viewerAccess?.scope === "public-preview";

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const toggleVisibility = async () => {
    if (!resume || !user || isUpdating) return;

    if (!viewerIsOwner) {
      setToast({
        tone: "warning",
        message: "Only the resume owner can change visibility settings.",
      });
      return;
    }

    setIsUpdating(true);
    const newVisibility = !resume.isPublic;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/resumes/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPublic: newVisibility }),
      });

      if (!response.ok) {
        throw new Error("Failed to update visibility");
      }

      setResume((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          isPublic: newVisibility,
          visibility: newVisibility ? "public" : "private",
          viewerAccess: {
            ...(prev.viewerAccess ?? {}),
            scope: "owner",
            isOwner: true,
          },
        };
      });

      const visibilityMessage = newVisibility
        ? "Resume is now public. Recruiters can discover it, but contact details stay masked until you approve access."
        : "Resume is now private. Only you can view this resume.";
      setToast({ tone: "success", message: visibilityMessage });
    } catch (error) {
      console.error("Error updating visibility:", error);
      setToast({
        tone: "error",
        message: "Failed to update visibility settings. Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    const fetchResumeAndTemplate = async () => {
      if (!id || authLoading) return;

      let handledAccess = false;
      try {
        console.log("Fetching resume", id);
        setAccessBlock(null);
        setError(null);

        // Use API route instead of direct Firestore access to bypass client-side rule issues
        const headers: HeadersInit = {};
        if (user) {
          const token = await user.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/resumes/${id}`, {
          headers,
        });

        if (!response.ok) {
          if (response.status === 401) {
            handledAccess = true;
            setAccessBlock({
              title: "This resume is private",
              description:
                "The owner has restricted access. Sign in or create an account to view the full resume or request access.",
              primaryAction: {
                label: "Sign in to SwitchCV",
                href: `/auth?redirect=/resumes/${id}`,
              },
            });
            setResume(null);
            setTemplate(null);
            return;
          }

          if (response.status === 403) {
            const errorData = await response.json();
            if (errorData.error === "Reserved System ID") {
              throw new Error(errorData.message);
            }
            handledAccess = true;
            setAccessBlock({
              title: "You do not have permission to view this resume",
              description:
                "Ask the owner to share access or request the details you need from your dashboard.",
              primaryAction: {
                label: "Go back to Dashboard",
                href: "/dashboard",
              },
            });
            setResume(null);
            setTemplate(null);
            return;
          }

          if (response.status === 404) {
            throw new Error("Resume not found");
          }

          throw new Error("Failed to fetch resume");
        }

        const resumeData = await response.json();
        setResume(resumeData);

        // Fetch template if ID exists, otherwise default to standard
        const templateId = resumeData.templateId || "standard-v1";
        const fetchedTemplate = await templateService.getTemplateById(
          templateId
        );
        setTemplate(fetchedTemplate);
      } catch (error: any) {
        console.error("Error fetching resume:", error);
        if (!handledAccess) {
          setError(error.message || "Error loading resume");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchResumeAndTemplate();
  }, [id, authLoading, user]);

  if (authLoading)
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        Checking authentication...
      </div>
    );

  if (loading)
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        Loading resume...
      </div>
    );

  if (accessBlock) {
    return <ResumeAccessBlock config={accessBlock} />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white flex-col gap-2">
        <p className="text-red-400 text-xl">Error: {error}</p>
        {user && <p className="text-gray-400 text-sm">User ID: {user.uid}</p>}
      </div>
    );
  }

  if (!resume)
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        Resume not found
      </div>
    );

  // Use the new TemplateRenderer if a template is loaded
  if (template) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 font-sans relative">
        <ResumeToastOverlay toast={toast} onDismiss={() => setToast(null)} />
        {/* Privacy Toggle */}
        <div className="fixed top-4 right-4 z-50 flex max-w-xs flex-col gap-2 rounded-lg border border-gray-700 bg-gray-800 p-3 text-sm shadow-lg print:hidden">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-gray-200">
              {resume.isPublic ? "Public" : "Private"}
            </span>
            {viewerIsOwner && (
              <button
                onClick={toggleVisibility}
                disabled={isUpdating}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                  resume.isPublic ? "bg-green-500" : "bg-gray-600"
                }`}
              >
                <span
                  className={`${
                    resume.isPublic ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </button>
            )}
          </div>
          {isPublicPreview && (
            <p className="text-xs text-yellow-200">
              Public preview: recruiters can search this resume, but contact
              details stay masked until you approve access.
            </p>
          )}
          {!viewerIsOwner && (
            <p className="text-xs text-gray-400">
              Only the owner can update visibility settings.
            </p>
          )}
        </div>

        <TemplateRenderer template={template} data={resume} />
      </div>
    );
  }

  return (
    <>
      <ResumeToastOverlay toast={toast} onDismiss={() => setToast(null)} />
      <LegacyResumeRenderer resume={resume} />
    </>
  );
}
