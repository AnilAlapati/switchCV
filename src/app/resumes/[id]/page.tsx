"use client";

import { logger } from "@/lib/logger";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TemplateRenderer } from "@/components/resume/TemplateRenderer";
import { LegacyResumeRenderer } from "@/components/resume/LegacyResumeRenderer";
import { ResumeAccessBlock } from "@/components/resume/ResumeAccessBlock";
import {
  ResumeToast,
  ResumeToastOverlay,
} from "@/components/resume/ResumeToastOverlay";
import { PrivacyMenu } from "@/components/resume/PrivacyMenu";
import { RequestAccessDialog } from "@/components/RequestAccessDialog";
import { useAuth } from "@/hooks/useAuth";
import { useResumeData } from "@/hooks/useResumeData";
import { useResumeQuota } from "@/hooks/useResumeQuota";
import { TemplateBar } from "@/components/resume/TemplateBar";
import { ResumeViewSkeleton } from "@/components/resume/ResumeViewSkeleton";
import { DashboardResume, LegacyResumeData } from "@/types";

import {
  DeletionCountdownBanner,
  EditingInProgressBanner,
  ResumeErrorView,
  ResumeNotFoundView,
  formatDuration,
  type DeletionCountdownNotice,
} from "@/components/resume/ResumePageComponents";

export default function ResumeView() {
  const { id } = useParams();
  const { user } = useAuth();
  const { resume, template, accessBlock, error, loading, mutateResume } =
    useResumeData(id);

  const { tier } = useResumeQuota();

  const [isUpdating, setIsUpdating] = useState(false);
  const [toast, setToast] = useState<ResumeToast | null>(null);
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [deletionNotice, setDeletionNotice] =
    useState<DeletionCountdownNotice | null>(null);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(
    null,
  );
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  const viewerAccess = (resume?.viewerAccess as Record<string, any>) ?? {};
  const viewerIsOwner = Boolean(viewerAccess?.isOwner);
  const isPublicPreview = viewerAccess?.scope === "public-preview";
  const isBeingEdited = Boolean(resume?.isBeingEdited);

  const countdownBanner =
    viewerIsOwner && deletionNotice ? (
      <DeletionCountdownBanner notice={deletionNotice} />
    ) : null;
  const editingBanner =
    !viewerIsOwner && isBeingEdited ? <EditingInProgressBanner /> : null;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Deletion notice logic - depends on resume data
  useEffect(() => {
    if (!resume || !viewerIsOwner) {
      setDeletionNotice(null);
      return;
    }

    const deletionIso = resume?.deletionScheduledAt;
    if (!deletionIso) {
      setDeletionNotice(null);
      return;
    }

    const deletionDate = new Date(deletionIso);
    if (Number.isNaN(deletionDate.getTime())) {
      setDeletionNotice(null);
      return;
    }

    const countdownIso = resume?.countdownStartsAt ?? null;
    const countdownDate = countdownIso ? new Date(countdownIso) : null;
    const warningHours =
      typeof resume?.expirationWarningHours === "number"
        ? resume.expirationWarningHours
        : null;

    const updateNotice = () => {
      const now = new Date();
      if (countdownDate && now < countdownDate) {
        setDeletionNotice(null);
        return;
      }

      const msRemaining = deletionDate.getTime() - now.getTime();
      const severity =
        msRemaining <= 24 * 60 * 60 * 1000 ? "danger" : "warning";

      setDeletionNotice({
        label: msRemaining <= 0 ? "moments" : formatDuration(msRemaining),
        deletionLabel: deletionDate.toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }),
        severity,
        warningHours,
      });
    };

    updateNotice();
    const interval = window.setInterval(updateNotice, 60000);
    return () => window.clearInterval(interval);
  }, [resume, viewerIsOwner]);

  const handleApplyTemplate = async () => {
    const resumeId = Array.isArray(id) ? id[0] : id;
    if (!resumeId || !user || !previewTemplateId) return;
    setIsApplyingTemplate(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/resumes/${resumeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ templateId: previewTemplateId }),
      });
      if (!res.ok) throw new Error("Failed to apply template");
      // Optimistically update cache so the dependent template SWR re-fetches
      mutateResume(
        (current: unknown) => {
          if (!current) return { resume: null, accessBlock: null, error: null };
          const data = current as Record<string, unknown>;
          const resumeData = data.resume as DashboardResume;
          if (!resumeData)
            return { resume: null, accessBlock: null, error: null };
          return {
            resume: {
              ...(resumeData as unknown as Record<string, unknown>),
              templateId: previewTemplateId,
            },
            accessBlock: data.accessBlock || null,
            error: data.error || null,
          } as unknown as {
            resume: DashboardResume | null;
            accessBlock: null;
            error: null;
          };
        },
        { revalidate: false },
      );
      setToast({
        tone: "success",
        message: "Design saved! Your resume now uses the new layout.",
      });
      // Keep previewTemplateId set so the renderer doesn't flash back to the old template
      // while the new template object is re-fetched in the background
    } catch (err) {
      logger.error({ err }, "Error applying template");
      setToast({
        tone: "error",
        message: "Failed to save design. Please try again.",
      });
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewTemplateId(null);
    // If a template was applied, force a revalidation to load the new template object
    mutateResume(undefined, { revalidate: true });
  };

  const toggleVisibility = async () => {
    // Determine current ID safely
    const resumeId = Array.isArray(id) ? id[0] : id;
    if (!resume || !user || isUpdating || !resumeId) return;

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
      const response = await fetch(`/api/resumes/${resumeId}`, {
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

      const visibilityMessage = newVisibility
        ? "Resume is now public. Recruiters can discover it, but contact details stay masked until you approve access."
        : "Resume is now private. Only you can view this resume.";

      // Update local SWR data immediately
      mutateResume(
        (current: unknown) => {
          if (!current) return { resume: null, accessBlock: null, error: null };
          const data = current as Record<string, unknown>;
          const resumeData = data.resume as DashboardResume;
          if (!resumeData)
            return { resume: null, accessBlock: null, error: null };

          return {
            resume: {
              ...(resumeData as unknown as Record<string, unknown>),
              isPublic: newVisibility,
              visibility: (newVisibility ? "public" : "private") as
                | "public"
                | "private"
                | "recruiter",
              status: newVisibility ? "published" : "draft",
              viewerAccess: {
                ...(resumeData.viewerAccess || {}),
                scope: "owner",
                isOwner: true,
              },
            },
            accessBlock: data.accessBlock || null,
            error: data.error || null,
          } as unknown as {
            resume: DashboardResume | null;
            accessBlock: null;
            error: null;
          };
        },
        { revalidate: false },
      );

      setToast({ tone: "success", message: visibilityMessage });
    } catch (error) {
      logger.error({ err: error }, "Error updating visibility:");
      setToast({
        tone: "error",
        message: "Failed to update visibility settings. Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const draftBanner =
    viewerIsOwner && resume?.status === "draft" ? (
      <div
        role="status"
        aria-live="polite"
        className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-amber-50 border-b border-amber-200 pl-4 pr-40 py-3 text-sm text-amber-900"
      >
        <span>
          Your resume is saved as a draft and is only visible to you. Publish it
          so recruiters can find you.
        </span>
        <button
          type="button"
          onClick={toggleVisibility}
          disabled={isUpdating}
          aria-label="Publish resume"
          className="shrink-0 rounded-md bg-amber-600 px-3 py-1 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          {isUpdating ? "Publishing…" : "Publish Now"}
        </button>
      </div>
    ) : null;

  // Show skeleton while loading
  if (loading) {
    return <ResumeViewSkeleton />;
  }

  if (accessBlock) {
    return <ResumeAccessBlock config={accessBlock} />;
  }

  if (error) {
    return <ResumeErrorView error={error} user={user} />;
  }

  if (!resume) {
    return <ResumeNotFoundView />;
  }

  // Use the new TemplateRenderer if a template is loaded
  if (template) {
    // For live preview: override template id without touching section config
    const effectiveTemplate = previewTemplateId
      ? { ...template, id: previewTemplateId }
      : template;

    return (
      <div
        className={`min-h-screen ${
          effectiveTemplate.id === "masonry-v1"
            ? ""
            : "bg-[#FFFFF8] text-black selection:bg-black selection:text-white"
        } p-8 font-sans relative overflow-hidden`}
      >
        {/* Paper texture overlay */}
        {effectiveTemplate.id !== "masonry-v1" && (
          <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
        )}
        <ResumeToastOverlay toast={toast} onDismiss={() => setToast(null)} />
        {draftBanner}
        {countdownBanner}
        {editingBanner}
        {/* Privacy Toggle — owner only */}
        {viewerIsOwner && (
          <PrivacyMenu
            isPublic={resume.isPublic ?? false}
            viewerIsOwner={viewerIsOwner}
            isPublicPreview={isPublicPreview}
            showPrivacyMenu={showPrivacyMenu}
            isUpdating={isUpdating}
            onToggleMenu={() => setShowPrivacyMenu(!showPrivacyMenu)}
            onToggleVisibility={toggleVisibility}
          />
        )}

        <TemplateRenderer
          template={effectiveTemplate}
          data={resume}
          isAuthenticated={!!user}
          onRequestAccess={() => setRequestDialogOpen(true)}
        />

        {/* Preview access banner — non-owner visitors only */}
        {isPublicPreview && !viewerIsOwner && (
          <div className="fixed bottom-0 left-0 right-0 z-50 p-4 print:hidden" aria-live="polite">
            <div className="mx-auto max-w-2xl">
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#1A2F25]/95 backdrop-blur-md border border-white/10 px-5 py-4 shadow-2xl">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">You&apos;re viewing a preview</p>
                  <p className="text-xs text-white/60 mt-0.5 truncate">
                    Contact details and full work history are hidden. Request access to unlock the full profile.
                  </p>
                </div>
                {user ? (
                  <button
                    type="button"
                    onClick={() => setRequestDialogOpen(true)}
                    className="shrink-0 rounded-full bg-white text-[#1A2F25] px-5 py-2 text-sm font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Request Access
                  </button>
                ) : (
                  <a
                    href="/auth"
                    className="shrink-0 rounded-full bg-white text-[#1A2F25] px-5 py-2 text-sm font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Sign In
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Design picker — owner only */}
        {viewerIsOwner && (
          <TemplateBar
            userTier={(tier ?? "basic") as "basic" | "premium" | "enterprise"}
            savedTemplateId={resume.templateId ?? "signal-v1"}
            previewTemplateId={previewTemplateId}
            onPreview={setPreviewTemplateId}
            onApply={handleApplyTemplate}
            onClose={handleCancelPreview}
            isApplying={isApplyingTemplate}
          />
        )}

        <RequestAccessDialog
          isOpen={requestDialogOpen}
          onClose={() => setRequestDialogOpen(false)}
          profileName={resume.personalInfo?.name || resume.title || "Candidate"}
          profileId={Array.isArray(id) ? id[0] : (id as string)}
          onSuccess={() => {
            setToast({
              tone: "success",
              message: "Request sent successfully!",
            });
          }}
        />
      </div>
    );
  }

  return (
    <>
      <ResumeToastOverlay toast={toast} onDismiss={() => setToast(null)} />
      {draftBanner}
      {countdownBanner}
      {editingBanner}
      <LegacyResumeRenderer resume={resume as unknown as LegacyResumeData} />
    </>
  );
}
