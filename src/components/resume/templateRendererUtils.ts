import { TimelineItem } from "./ResumeVisualPrimitives";

const normalizeDate = (value: string) => {
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
      .map((item: unknown) => {
        if (typeof item === "string") return item;
        const i = item as { name?: string; label?: string };
        return i?.name || i?.label;
      })
      .filter((v): v is string => Boolean(v));
  }
  return [];
};

export const normalizeTimelineItems = (value: unknown): TimelineItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: Record<string, unknown>) => ({
      headline: (item?.title ||
        item?.role ||
        item?.degree ||
        item?.name) as string,
      subline: (item?.company ||
        item?.institution ||
        item?.organization ||
        item?.school) as string,
      meta: (item?.duration ||
        formatRange(item?.startDate as string, item?.endDate as string) ||
        item?.year) as string,
      description: (item?.description || item?.summary) as string,
      bullets: (item?.achievements ||
        item?.highlights ||
        item?.responsibilities) as string[],
      technologies: item?.technologies as string[],
      url: item?.url as string,
    }))
    .filter((timeline) => timeline.headline);
};

export const normalizeProjects = (value: unknown): TimelineItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: Record<string, unknown>) => ({
      headline: item?.name as string,
      subline: item?.role as string,
      meta: (item?.duration || item?.year) as string,
      description: item?.description as string,
      technologies: item?.technologies as string[],
      url: item?.url as string,
    }))
    .filter((project) => project.headline);
};
