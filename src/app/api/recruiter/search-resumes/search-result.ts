import type { User } from "@/types";
import type { AccessStatus } from "./access-status";

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

export function getDisplayName(userData: Partial<User>): string {
  if (userData.displayName) return userData.displayName;
  if (userData.email) return maskEmail(userData.email);
  return "Unknown";
}
