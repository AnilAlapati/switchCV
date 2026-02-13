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
import { ResumeViewSkeleton } from "@/components/resume/ResumeViewSkeleton";
import { DashboardResume, LegacyResumeData } from "@/types";

import {
  DeletionCountdownBanner,
  EditingInProgressBanner,
  ResumeErrorView,
  ResumeNotFoundView,
  formatDuration,
  type DeletionCountdownNotice
} from "@/components/resume/ResumePageComponents";

export default function ResumeView() {
  const { id } = useParams();
  const { user } = useAuth();
  const { resume, template, accessBlock, error, loading, mutateResume } =
    useResumeData(id);

  const [isUpdating, setIsUpdating] = useState(false);
  const [toast, setToast] = useState<ResumeToast | null>(null);
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [deletionNotice, setDeletionNotice] =
    useState<DeletionCountdownNotice | null>(null);

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
          if (!resumeData) return { resume: null, accessBlock: null, error: null };

          return {
            resume: {
              ...(resumeData as unknown as Record<string, unknown>),
              isPublic: newVisibility,
              visibility: (newVisibility ? "public" : "private") as "public" | "private" | "recruiter",
              viewerAccess: {
                ...(resumeData.viewerAccess || {}),
                scope: "owner",
                isOwner: true,
              },
            },
            accessBlock: data.accessBlock || null,
            error: data.error || null,
          } as unknown as { resume: DashboardResume | null; accessBlock: null; error: null };
        },
        { revalidate: false }
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
    return (
      <div
        className={`min-h-screen ${template.id === "masonry-v1" ? "" : "bg-[#FFFFF8] text-black selection:bg-black selection:text-white"
          } p-8 font-sans relative overflow-hidden`}
      >
        {/* Paper texture overlay */}
        {template.id !== "masonry-v1" && (
          <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
        )}
        <ResumeToastOverlay toast={toast} onDismiss={() => setToast(null)} />
        {countdownBanner}
        {editingBanner}
        {/* Privacy Toggle */}
        <PrivacyMenu
          isPublic={resume.isPublic ?? false}
          viewerIsOwner={viewerIsOwner}
          isPublicPreview={isPublicPreview}
          showPrivacyMenu={showPrivacyMenu}
          isUpdating={isUpdating}
          onToggleMenu={() => setShowPrivacyMenu(!showPrivacyMenu)}
          onToggleVisibility={toggleVisibility}
        />

        <TemplateRenderer
          template={template}
          data={resume}
          isAuthenticated={!!user}
          onRequestAccess={() => setRequestDialogOpen(true)}
        />

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
      {countdownBanner}
      {editingBanner}
      <LegacyResumeRenderer resume={resume as unknown as LegacyResumeData} />
    </>
  );
}

