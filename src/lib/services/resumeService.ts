/**
 * Resume Service
 *
 * REFACTORED: This file now re-exports from smaller, focused modules.
 * The original 744-line file has been split into:
 *
 * - resume/resumeFetching.ts: Resume retrieval and caching
 * - resume/resumeLifecycle.ts: Publish/unpublish operations
 * - resume/resumeCrud.ts: Create, update, delete operations
 * - resume/resumeAccess.ts: Access control and permissions
 * - resume/resumeEmbedding.ts: Vector embedding generation
 *
 * @module lib/services/resumeService
 */

// Re-export all functions from the resume modules
export {
  fetchResumeBySlug,
  trackResumeView,
  publishDraft,
  unpublishResume,
  getPublishedResume,
  getResumeEditingStatus,
  createResume,
  saveGeneratedResume,
  getResumeCount,
  updateResume,
  deleteResume,
  checkPrivateResumeAccess,
  getResume,
  updateResumeEmbedding,
  type CreateResumeInput,
  type GeneratedResumeInput,
} from "./resume";
