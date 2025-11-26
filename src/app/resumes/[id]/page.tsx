"use client";

/* eslint-disable max-lines */
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
import { PrivacyMenu } from "@/components/resume/PrivacyMenu";
import { RequestAccessDialog } from "@/components/RequestAccessDialog";
import { ResumeTemplate } from "@/types";
import { useAuth } from "@/hooks/useAuth";

type DeletionCountdownNotice = {
  label: string;
  deletionLabel: string;
  severity: "warning" | "danger";
  warningHours: number | null;
};

const formatDuration = (ms: number) => {
  if (ms <= 0) {
    return "moments";
  }

  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} day${days === 1 ? "" : "s"}`);
  }

  if (hours > 0) {
    parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  }

  if (parts.length === 0) {
    parts.push(`${minutes || 1} minute${minutes === 1 ? "" : "s"}`);
  }

  return parts.slice(0, 2).join(" ");
};

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

  useEffect(() => {
    if (!viewerIsOwner) {
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
        if (user) {
          console.log("User is authenticated, attaching token.");
        } else {
          console.log("User is NOT authenticated.");
        }
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
        {countdownBanner}
        {editingBanner}
        {/* Privacy Toggle */}
        <PrivacyMenu
          isPublic={resume.isPublic}
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
          profileId={id as string}
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
      <LegacyResumeRenderer resume={resume} />
    </>
  );
}

const bannerStyles = {
  warning: "border-amber-400 bg-amber-500/10 text-amber-100",
  danger: "border-red-400 bg-red-500/10 text-red-100",
};

function DeletionCountdownBanner({
  notice,
}: {
  notice: DeletionCountdownNotice;
}) {
  return (
    <div
      className={`mb-4 rounded-lg border px-4 py-3 text-sm leading-relaxed ${
        bannerStyles[notice.severity]
      }`}
      role="status"
    >
      <p className="font-semibold text-base">
        Resume scheduled for deletion in {notice.label}
      </p>
      <p>
        This Basic plan resume will be permanently removed on{" "}
        <span className="font-semibold">{notice.deletionLabel}</span> unless you
        upgrade or duplicate it to keep a copy.
      </p>
      {typeof notice.warningHours === "number" && (
        <p className="text-xs opacity-80 mt-1">
          Countdown warnings start {notice.warningHours} hours before deletion
          so you have time to upgrade.
        </p>
      )}
    </div>
  );
}

function EditingInProgressBanner() {
  return (
    <div
      className="mb-4 rounded-lg border border-blue-400 bg-blue-500/10 px-4 py-3 text-sm leading-relaxed text-blue-100"
      role="status"
    >
      <p className="font-semibold text-base">
        📝 This resume is currently being edited
      </p>
      <p>
        The owner is making updates to this resume. Some information may be
        outdated until editing is complete.
      </p>
    </div>
  );
}
