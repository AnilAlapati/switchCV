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
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);

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
        <div className="fixed top-6 right-6 z-50 flex flex-col items-end gap-2 print:hidden">
          {/* Trigger Button */}
          <button
            onClick={() => setShowPrivacyMenu(!showPrivacyMenu)}
            className={`flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium shadow-lg backdrop-blur-md transition-all hover:border-white/20 ${
              resume.isPublic
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-slate-800/80 text-slate-400"
            }`}
          >
            {resume.isPublic ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path
                  fillRule="evenodd"
                  d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                  clipRule="evenodd"
                />
                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.742L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
              </svg>
            )}
            <span>{resume.isPublic ? "Public" : "Private"}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-4 w-4 transition-transform ${
                showPrivacyMenu ? "rotate-180" : ""
              }`}
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showPrivacyMenu && (
            <div className="flex w-80 flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/90 p-5 shadow-2xl backdrop-blur-xl transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      resume.isPublic
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-slate-700/50 text-slate-400"
                    }`}
                  >
                    {resume.isPublic ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                      >
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path
                          fillRule="evenodd"
                          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                          clipRule="evenodd"
                        />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.742L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      {resume.isPublic ? "Public Profile" : "Private Profile"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {resume.isPublic
                        ? "Visible to everyone"
                        : "Only you can see"}
                    </p>
                  </div>
                </div>

                {viewerIsOwner && (
                  <button
                    onClick={toggleVisibility}
                    disabled={isUpdating}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                      resume.isPublic ? "bg-emerald-500" : "bg-slate-600"
                    }`}
                  >
                    <span
                      className={`${
                        resume.isPublic ? "translate-x-6" : "translate-x-1"
                      } inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform`}
                    />
                  </button>
                )}
              </div>

              {isPublicPreview && (
                <div className="rounded-xl bg-amber-500/10 p-3 border border-amber-500/20">
                  <div className="flex gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-5 w-5 shrink-0 text-amber-400"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-xs leading-relaxed text-amber-200/90">
                      <span className="font-medium text-amber-200">
                        Public Preview:
                      </span>{" "}
                      Recruiters can search this resume, but contact details
                      stay masked until you approve access.
                    </p>
                  </div>
                </div>
              )}

              {!viewerIsOwner && (
                <div className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4 text-slate-500"
                  >
                    <path
                      fillRule="evenodd"
                      d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-xs text-slate-400">
                    View-only mode. Only the owner can edit.
                  </p>
                </div>
              )}
            </div>
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
