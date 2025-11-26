"use client";

/**
 * Draft Preview Page
 *
 * Allows resume owners to preview their draft before publishing.
 * Only accessible by the owner of the draft.
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { templateService } from "@/lib/services/templateService";
import { TemplateRenderer } from "@/components/resume/TemplateRenderer";
import { LegacyResumeRenderer } from "@/components/resume/LegacyResumeRenderer";
import type { ResumeTemplate, DraftResume } from "@/types";

export default function DraftPreview() {
  const { draftId } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [draft, setDraft] = useState<DraftResume | null>(null);
  const [template, setTemplate] = useState<ResumeTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDraft = async () => {
      if (!draftId || authLoading) return;

      // Must be authenticated to view drafts
      if (!user) {
        router.push(`/auth?redirect=/drafts/${draftId}`);
        return;
      }

      try {
        setError(null);
        const token = await user.getIdToken();

        const response = await fetch(`/api/drafts/${draftId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            setError("Draft not found");
            return;
          }
          if (response.status === 403) {
            setError("You don't have permission to view this draft");
            return;
          }
          throw new Error("Failed to fetch draft");
        }

        const draftData = await response.json();
        setDraft(draftData);

        // Fetch template
        const templateId = draftData.profile?.templateId || "standard-v1";
        const fetchedTemplate =
          await templateService.getTemplateById(templateId);
        setTemplate(fetchedTemplate);
      } catch (err: any) {
        console.error("Error fetching draft:", err);
        setError(err.message || "Error loading draft");
      } finally {
        setLoading(false);
      }
    };

    fetchDraft();
  }, [draftId, authLoading, user, router]);

  const handlePublish = async () => {
    if (!user || !draftId || publishing) return;

    setPublishing(true);
    setPublishError(null);

    try {
      const token = await user.getIdToken();

      const response = await fetch(`/api/drafts/${draftId}/publish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to publish");
      }

      const result = await response.json();

      // Redirect to the published resume
      router.push(`/resumes/${result.resumeId}`);
    } catch (err: any) {
      console.error("Error publishing draft:", err);
      setPublishError(err.message || "Failed to publish. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  const handleEdit = () => {
    // Navigate to the resume editor with this draft
    router.push(`/create-resume?draft=${draftId}`);
  };

  // Loading states
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        Checking authentication...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        Loading draft...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white flex-col gap-4">
        <p className="text-red-400 text-xl">{error}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        Draft not found
      </div>
    );
  }

  // Build resume data for the renderer from draft profile
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
            <div className="bg-amber-800 p-2 rounded-lg">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold">Draft Preview</p>
              <p className="text-sm text-amber-100">
                This is a preview. Publish to make it searchable by recruiters.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              Edit
            </button>

            <button
              onClick={handlePublish}
              disabled={publishing}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
            >
              {publishing ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Publishing...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Publish
                </>
              )}
            </button>
          </div>
        </div>

        {publishError && (
          <div className="max-w-6xl mx-auto mt-2">
            <p className="text-sm text-red-200 bg-red-900/50 px-3 py-2 rounded">
              {publishError}
            </p>
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
            onRequestAccess={() => {}}
          />
        ) : (
          <LegacyResumeRenderer resume={resumeData} />
        )}
      </div>

      {/* Draft Info Footer */}
      <div className="fixed bottom-4 left-4 bg-gray-800 text-gray-300 text-xs px-3 py-2 rounded-lg shadow-lg">
        <p>Draft ID: {draft.draftId}</p>
        <p>
          Last updated:{" "}
          {new Date(draft.updatedAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
        {draft.resumeId && (
          <p className="text-green-400">
            Will republish as Resume #{draft.resumeId}
          </p>
        )}
      </div>
    </div>
  );
}
