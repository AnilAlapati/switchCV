"use client";

import { logger } from "@/lib/logger";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { templateService } from "@/lib/services/templateService";
import { TemplateRenderer } from "@/components/resume/TemplateRenderer";
import { LegacyResumeRenderer } from "@/components/resume/LegacyResumeRenderer";
import { useDraftData } from "@/hooks/useDraftData";
import type { ResumeTemplate, LegacyResumeData } from "@/types";

export default function DraftPreview() {
  const params = useParams();
  // Ensure draftId is a string
  const draftId = Array.isArray(params.draftId) ? params.draftId[0] : params.draftId;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Use SWR Hook
  const { draft, loading: draftLoading, error: draftError } = useDraftData(draftId || null);

  const [template, setTemplate] = useState<ResumeTemplate | null>(null);
  const [templateLoading, setTemplateLoading] = useState(true);

  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Initial Auth Check
  useEffect(() => {
    if (!authLoading && !user) {
      // Redirect if not logged in
      router.push(`/auth?redirect=/drafts/${draftId}`);
    }
  }, [user, authLoading, router, draftId]);

  // Fetch Template when draft loads
  useEffect(() => {
    if (draft) {
      const fetchTemplate = async () => {
        try {
          const tid = draft.profile?.templateId || "standard-v1";
          const t = await templateService.getTemplateById(tid);
          setTemplate(t);
        } catch (e) {
          logger.error(e, "Failed to load template");
        } finally {
          setTemplateLoading(false);
        }
      };
      fetchTemplate();
    } else if (!draftLoading && !draft) {
      // Draft not found or error, stop loading template
      setTemplateLoading(false);
    }
  }, [draft, draftLoading]);

  const handlePublish = async () => {
    if (!user || !draftId || publishing) return;

    setPublishing(true);
    setPublishError(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/drafts/${draftId}/publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to publish");
      }

      const result = await response.json();
      router.push(`/resumes/${result.resumeId}`);
    } catch (err: unknown) {
      const error = err as Error;
      logger.error({ err: error }, "Error publishing draft:");
      setPublishError(error.message || "Failed to publish. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  const handleEdit = () => {
    router.push(`/create-resume?draft=${draftId}`);
  };

  const isLoading = authLoading || draftLoading || (draft && templateLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-t-2 border-amber-500 rounded-full animate-spin"></div>
          <p>Loading preview...</p>
        </div>
      </div>
    );
  }

  if (draftError || !draft) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white flex-col gap-4">
        <p className="text-red-400 text-xl">{draftError || "Draft not found"}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  const resumeData = {
    ...draft.profile,
    resumeId: draft.resumeId,
    draftId: draft.draftId,
    isDraft: true,
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Draft Banner */}
      <div className="sticky top-0 z-50 bg-amber-600 text-white px-4 py-3 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold">Draft Preview</span>
            <span className="text-amber-200 text-sm hidden sm:inline"> | This resume is not yet public.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors flex items-center gap-2"
            >
              Edit
            </button>

            <button
              onClick={handlePublish}
              disabled={publishing}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2 font-bold"
            >
              {publishing ? "Publishing..." : "Publish Now"}
            </button>
          </div>
        </div>
        {publishError && (
          <div className="max-w-6xl mx-auto mt-2 text-center bg-red-800/50 p-2 rounded text-sm">
            {publishError}
          </div>
        )}
      </div>

      {/* Resume Preview */}
      <div className="p-8">
        {template ? (
          <TemplateRenderer
            template={template}
            data={resumeData}
            isAuthenticated={true}
            onRequestAccess={() => { }}
          />
        ) : (
          <LegacyResumeRenderer resume={resumeData as unknown as LegacyResumeData} />
        )}
      </div>
    </div>
  );
}
