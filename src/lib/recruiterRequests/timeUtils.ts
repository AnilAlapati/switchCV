export interface TimeState {
  expired: boolean;
  label: string;
}

export function deriveTimeState(
  options: {
    expiresAt?: string | null;
    timeRemainingMs?: number | null;
  },
  nowMs: number
): TimeState {
  const fallbackMs = options.expiresAt
    ? new Date(options.expiresAt).getTime() - nowMs
    : null;
  const baseMs = options.timeRemainingMs ?? fallbackMs ?? null;

  if (baseMs === null || Number.isNaN(baseMs)) {
    return { expired: false, label: "Awaiting expiration" };
  }

  if (baseMs <= 0) {
    return { expired: true, label: "Expired" };
  }

  return {
    expired: false,
    label: formatDuration(baseMs),
  };
}

export function formatDuration(milliseconds: number) {
  const totalMinutes = Math.floor(milliseconds / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${Math.max(minutes, 1)}m`;
}

export function formatDateTime(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
