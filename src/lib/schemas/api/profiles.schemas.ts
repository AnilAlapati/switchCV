import { z } from "zod";
import {
  DurationSchema,
  DurationSelectionSchema,
  PaginationSchema,
  RequestIdSchema,
  ResumeIdSchema,
  UserIdSchema,
} from "./shared.schemas";

export const ApproveProfileAccessSchema = z
  .object({
    requestId: RequestIdSchema,
    resumeId: ResumeIdSchema,
    duration: DurationSchema,
  })
  .strict();

export const RequestProfileAccessSchema = z
  .object({
    resumeId: ResumeIdSchema,
    message: z.string().max(2000).optional(),
    duration: DurationSelectionSchema,
    timezone: z.string().min(1).max(120).optional(),
  })
  .strict();

export const RespondProfileAccessSchema = z
  .object({
    requestId: RequestIdSchema,
    resumeId: ResumeIdSchema,
    action: z.enum(["approve", "deny"]),
    grantDuration: DurationSelectionSchema.optional(),
    timezone: z.string().min(1).max(120).optional(),
  })
  .strict();

export const ProfileSearchFiltersSchema = z
  .object({
    role: z.string().min(1).max(100).optional(),
    location: z.string().min(1).max(120).optional(),
    skills: z.array(z.string().min(1).max(100)).max(10).optional(),
    slug: z.string().min(1).max(120).optional(),
  })
  .strict();

export const SearchProfilesSchema = z
  .object({
    query: z.string().trim().max(500).optional(),
    filters: ProfileSearchFiltersSchema.optional(),
    limit: PaginationSchema.shape.limit.optional(),
    offset: PaginationSchema.shape.offset.optional(),
    cursor: PaginationSchema.shape.cursor,
  })
  .strict()
  .refine((payload) => {
    const hasQuery = Boolean(payload.query && payload.query.length > 0);
    const filters = payload.filters;
    const hasFilters = Boolean(
      filters &&
        (filters.role ||
          filters.location ||
          (filters.skills && filters.skills.length > 0) ||
          filters.slug)
    );
    return hasQuery || hasFilters;
  }, "Either search query or filters are required");

export const GetProfileAnalyticsQuerySchema = z.object({
  resumeId: z.string().min(1),
});

export const ProfileAnalyticsMetadataSchema = z
  .object({
    viewedBy: UserIdSchema.optional(),
    viewerName: z.string().min(1).max(120).optional(),
    source: z.enum(["search", "direct", "link", "recruiter", "other"]).optional(),
    referrer: z.string().max(500).optional(),
    sessionDuration: z.number().min(0).optional(),
    downloadFormat: z.enum(["pdf", "docx", "json"]).optional(),
  })
  .strict();

export const TrackProfileAnalyticsSchema = z
  .object({
    resumeId: z.string().min(1),
    userId: UserIdSchema.optional(),
    eventType: z.enum(["view", "request", "approval", "click", "share", "download"]),
    metadata: ProfileAnalyticsMetadataSchema.optional(),
  })
  .strict();
