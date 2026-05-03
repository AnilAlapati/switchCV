"use client";

import useSWR from "swr";
import { useAuth } from "./useAuth";
import { ResumeAccessBlockConfig } from "@/components/resume/ResumeAccessBlock";
import { templateService } from "@/lib/services/templateService";
import type { ResumeTemplate, ResumeProfile } from "@/types";

/**
 * Extended resume type with viewer access metadata and runtime fields
 */
interface ViewerAccessMeta {
  isOwner?: boolean;
  isRecruiter?: boolean;
  hasGrantedAccess?: boolean;
}

/**
 * Resume data as returned from the API, includes base profile + runtime metadata
 */
type ResumeWithAccess = ResumeProfile & {
  viewerAccess?: ViewerAccessMeta;
  // Runtime fields added by API
  isPublic?: boolean;
  isBeingEdited?: boolean;
  status?: "draft" | "published";
  deletionScheduledAt?: string;
  countdownStartsAt?: string;
  expirationWarningHours?: number;
  numericId?: number;
  userId?: string;
};

type FetchResult = {
  resume: ResumeWithAccess | null;
  accessBlock: ResumeAccessBlockConfig | null;
  error: string | null;
};

const resumeFetcher = async (
  url: string,
  token: string | null,
): Promise<FetchResult> => {
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    // Handle Access Block Scenarios (401/403)
    if (response.status === 401) {
      return {
        resume: null,
        error: null,
        accessBlock: {
          title: "This resume is private",
          description:
            "The owner has restricted access. Sign in or create an account to view the full resume or request access.",
          primaryAction: {
            label: "Sign in to SwitchCV",
            // Note: We'll need to construct the redirect URL in the component or passing ID here
            // But for the hook, we can return the generic config
            href: `/auth?redirect=/resumes/${url.split("/").pop()}`, // Safe enough to extract ID from URL
            // Actually, let's keep it simple. The redirect should include the current path.
          },
        },
      };
    }

    if (response.status === 403) {
      // Check for specific error message if needed
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        // ignore json parse error
      }

      if (errorData?.error === "Reserved System ID") {
        return {
          resume: null,
          accessBlock: null,
          error: errorData.message,
        };
      }

      return {
        resume: null,
        error: null,
        accessBlock: {
          title: "You do not have permission to view this resume",
          description:
            "Ask the owner to share access or request the details you need from your dashboard.",
          primaryAction: {
            label: "Go back to Dashboard",
            href: "/dashboard",
          },
        },
      };
    }

    if (response.status === 404) {
      return { resume: null, accessBlock: null, error: "Resume not found" };
    }

    return { resume: null, accessBlock: null, error: "Failed to fetch resume" };
  }

  const data = await response.json();
  return { resume: data, accessBlock: null, error: null };
};

export function useResumeData(id: string | string[] | undefined) {
  const { user, loading: authLoading } = useAuth();

  // Wait for auth to initialize so we have the token if user is signed in.
  // We can fetch even if user is null (public resume), but we must wait for authLoading to complete
  // to know FOR SURE if user is null or just loading.
  const shouldFetch = id && !authLoading;

  const {
    data: fetchResult,
    mutate: mutateResume,
    isLoading: resumeLoading,
  } = useSWR<FetchResult>(
    shouldFetch ? [`/api/resumes/${id}`, user?.uid] : null,
    async ([url]) => {
      const token = user ? await user.getIdToken() : null;
      return resumeFetcher(url, token);
    },
    {
      dedupingInterval: 300000, // 5 minutes
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false, // Don't retry 4xx errors
    },
  );

  const resume = fetchResult?.resume ?? null;
  const accessBlock = fetchResult?.accessBlock ?? null;
  const error = fetchResult?.error ?? null;

  // Fetch Template (Dependent on Resume)
  const templateId = (resume?.templateId as string) || "masonry-v1";

  const { data: template, isLoading: templateLoading } =
    useSWR<ResumeTemplate | null>(
      resume ? `template-${templateId}` : null,
      async () => templateService.getTemplateById(templateId),
      {
        dedupingInterval: 60 * 60 * 1000, // 1 hour cache for templates (rarely change)
        revalidateOnFocus: false,
      },
    );

  // If we have an access block or error, we are "done" loading even if template isn't fetched.
  // If we have resume, we wait for template.
  // fetchResult === undefined means SWR hasn't resolved yet (first render before fetch completes) -
  // treat that as loading to prevent a one-frame flash of the "not found" state.
  const loading =
    resumeLoading ||
    (shouldFetch && fetchResult === undefined) ||
    (!!resume && templateLoading);

  return {
    resume,
    template: template ?? null,
    accessBlock,
    error,
    loading,
    mutateResume,
  };
}
