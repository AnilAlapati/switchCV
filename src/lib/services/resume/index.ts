/**
 * Resume Service
 *
 * This is the main entry point for resume-related operations.
 * The service has been split into smaller, focused modules:
 *
 * - resumeFetching.ts: Resume retrieval and caching
 * - resumeLifecycle.ts: Publish/unpublish operations
 * - resumeCrud.ts: Create, update, delete operations
 * - resumeAccess.ts: Access control and permissions
 * - resumeEmbedding.ts: Vector embedding generation
 */

// Re-export all functions from sub-modules
export { fetchResumeBySlug, trackResumeView } from "./resumeFetching";

export {
  publishDraft,
  unpublishResume,
  getPublishedResume,
  getResumeEditingStatus,
} from "./resumeLifecycle";

export {
  createResume,
  saveGeneratedResume,
  getResumeCount,
  updateResume,
  updateResumeVisibility,
  updateResumePublicViewMode,
  updateResumeTemplate,
  deleteResume,
  type CreateResumeInput,
  type GeneratedResumeInput,
  type GeneratedResumeMetadata,
  type GenerationQualityReport,
  type ResumeGenerationVersion,
} from "./resumeCrud";

export { checkPrivateResumeAccess, getResume } from "./resumeAccess";

export { updateResumeEmbedding } from "./resumeEmbedding";
