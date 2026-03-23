import * as functions from "firebase-functions/v1";
import {
  buildVerificationLink,
  resolvePublicBaseUrl,
} from "../src/email/shared";
import { buildAdminApprovalEmailText } from "../src/email/templates";

jest.mock("firebase-functions/v1", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("email shared helpers", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.FUNCTIONS_EMULATOR;
    delete process.env.WEBSITE_URL;
    delete process.env.NEXT_PUBLIC_BASE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.GCLOUD_PROJECT;
    delete process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.GCP_PROJECT;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    delete process.env.AUTH_VERIFICATION_URL;
    delete process.env.EMAIL_VERIFICATION_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("uses the project host when a dev deployment is misconfigured to production", () => {
    process.env.GCLOUD_PROJECT = "switchcv-dev";
    process.env.WEBSITE_URL = "https://switchcv.com";

    expect(resolvePublicBaseUrl()).toBe("https://switchcv-dev.web.app");
    expect(functions.logger.warn).toHaveBeenCalled();
  });

  it("keeps localhost in the emulator", () => {
    process.env.FUNCTIONS_EMULATOR = "true";
    process.env.WEBSITE_URL = "http://localhost:3000";
    process.env.GCLOUD_PROJECT = "switchcv-dev";

    expect(resolvePublicBaseUrl()).toBe("http://localhost:3000");
  });

  it("builds verification links from the resolved project host", () => {
    process.env.GCLOUD_PROJECT = "switchcv-dev";
    process.env.WEBSITE_URL = "https://switchcv.com";

    expect(buildVerificationLink()).toBe(
      "https://switchcv-dev.web.app/auth?mode=verify-email",
    );
  });

  it("uses the explicit base URL when the project ID is unknown", () => {
    process.env.GCLOUD_PROJECT = "switchcv-preview";
    process.env.WEBSITE_URL = "https://preview.switchcv.com";

    expect(resolvePublicBaseUrl()).toBe("https://preview.switchcv.com");
    expect(functions.logger.warn).toHaveBeenCalled();
  });

  it("labels missing Google usernames as post-approval onboarding", () => {
    const email = buildAdminApprovalEmailText(
      {
        uid: "user-123",
        email: "user@example.com",
        displayName: "Test User",
        providerData: [{ providerId: "google.com" }],
      } as any,
      { authProvider: "google.com" },
      "https://example.com/approve",
      "https://example.com/decline",
      "https://example.com",
    );

    expect(email).toContain("Username: Will be chosen after approval");
    expect(email).toContain("Auth Type: Google sign-in");
  });
});
