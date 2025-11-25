import { ReactNode } from "react";
import type { User } from "firebase/auth";
import { AuthProvider } from "@/hooks/useAuth";

export const createMockUser = (overrides: Partial<User> = {}) =>
  ({
    uid: "test-uid",
    email: "test@example.com",
    emailVerified: true,
    displayName: "Test User",
    providerData: [{ providerId: "password" }],
    ...overrides,
  } as unknown as User);

export const TestWrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);
