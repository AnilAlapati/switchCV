import { TimelineItem } from "./ResumeVisualPrimitives";

const normalizeDate = (value?: string) => {
  if (!value) return "";
  if (!Number.isNaN(Date.parse(value))) {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
  }
  return value;
};

const formatRange = (start?: string, end?: string) => {
  if (!start && !end) return undefined;
  if (!start) return end;
  const formattedStart = normalizeDate(start);
  const formattedEnd = end ? normalizeDate(end) : "Present";
  return `${formattedStart} • ${formattedEnd}`;
};

export const normalizeSkills = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item: any) =>
        typeof item === "string" ? item : item?.name || item?.label
      )
      .filter(Boolean);
  }
  return [];
};

export const normalizeTimelineItems = (value: unknown): TimelineItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: any) => ({
      headline: item?.title || item?.role || item?.degree || item?.name,
      subline: item?.company || item?.institution || item?.organization,
      meta:
        item?.duration ||
        formatRange(item?.startDate, item?.endDate) ||
        item?.year,
      description: item?.description || item?.summary,
      bullets: item?.achievements || item?.highlights || item?.responsibilities,
      technologies: item?.technologies,
      url: item?.url,
    }))
    .filter((timeline) => timeline.headline);
};

export const normalizeProjects = (value: unknown): TimelineItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: any) => ({
      headline: item?.name,
      subline: item?.role,
      meta: item?.duration || item?.year,
      description: item?.description,
      technologies: item?.technologies,
      url: item?.url,
    }))
    .filter((project) => project.headline);
};
