import type { User } from "@/types";
import type { AccessStatus } from "./access-status";
import { maskName } from "@/lib/utils/resumeVisibility";

export interface SearchResultCard {
  resumeId: string;
  title: string;
  userName: string;
  userId: string;
  skills?: string[];
  location?: string;
  createdAt: string;
  accessStatus?: AccessStatus;
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const maskedUser = user.substring(0, 2) + "***";
  return `${maskedUser}@${domain}`;
}

export function getDisplayName(userData: Partial<User>, accessStatus?: AccessStatus): string {
  let name = "Unknown";
  if (userData.displayName) {
    name = userData.displayName;
  } else if (userData.email) {
    name = maskEmail(userData.email);
  }

  if (accessStatus && accessStatus !== "approved") {
    return maskName(name);
  }
  return name;
}

