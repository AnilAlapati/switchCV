import type { RecruiterContactRequest } from "@/types/profileSearch";

type RecruiterRequestLike = Partial<RecruiterContactRequest> & {
  candidateEmail?: unknown;
  toUserEmail?: unknown;
  userEmail?: unknown;
};

/**
 * Recruiters should not receive candidate contact fields from the request
 * document itself. Access to PII must go through the approved token flow.
 */
export function sanitizeRecruiterRequestForRecruiterView<
  T extends RecruiterRequestLike,
>(request: T): Omit<T, "candidateEmail" | "toUserEmail" | "userEmail"> {
  const safeRequest = { ...request };
  delete safeRequest.candidateEmail;
  delete safeRequest.toUserEmail;
  delete safeRequest.userEmail;

  return safeRequest;
}

export function getRecruiterRequestTargetLabel(
  request: Pick<Partial<RecruiterContactRequest>, "resumeTitle">,
): string {
  const resumeTitle =
    typeof request.resumeTitle === "string" ? request.resumeTitle.trim() : "";

  return resumeTitle ? `resume "${resumeTitle}"` : "the requested candidate";
}
